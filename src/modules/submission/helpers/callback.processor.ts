// submissions/submission-callback.service.ts
import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { RedisKeys } from './redis-keys.helper';
import { Judge0Response } from '../../judge0/judge0.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SubmissionService } from '../submission.service';
import { TestResultDto } from '../../problems/testcases/dto/run-testcase-result.response.dto';
import { SubmissionsSseService } from '../events/submission-sse.service';
import Redis from 'ioredis';
import { REDIS } from '../../../shared/redis/redis.module';

const LUA_ADD_RESULT_BY_INDEX = `
-- KEYS[1]=resultsI (hash index->json)
-- KEYS[2]=meta     (hash)
-- KEYS[3]=seen     (set)
-- ARGV[1]=token
-- ARGV[2]=index
-- ARGV[3]=json
-- Return: {added(0|1), received, total}

local resultsI = KEYS[1]
local meta     = KEYS[2]
local seen     = KEYS[3]
local token    = ARGV[1]
local index    = ARGV[2]
local json     = ARGV[3]

-- dedup by token
local isNew = redis.call('SADD', seen, token)
if isNew == 0 then
  local received = redis.call('HGET', meta, 'received') or '0'
  local total    = redis.call('HGET', meta, 'total') or '0'
  return {0, received, total}
end

-- write by index (first-writer-wins)
if redis.call('HEXISTS', resultsI, index) == 0 then
  redis.call('HSET', resultsI, index, json)
end

local received = redis.call('HINCRBY', meta, 'received', 1)
local total    = redis.call('HGET', meta, 'total') or '0'
return {1, tostring(received), total}
`;

@Injectable()
export class CallbackProcessor implements OnModuleInit {
  private readonly logger = new Logger(CallbackProcessor.name);
  private luaShaAddResult: string;

  constructor(
    @Inject(REDIS)
    private readonly redis: Redis,
    private readonly redisKeys: RedisKeys,
    @InjectQueue('submission-finalize') private readonly finalizeQueue: Queue,
    private readonly submissionService: SubmissionService,
    private readonly submissionSseService: SubmissionsSseService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Load Lua script once at startup
    this.luaShaAddResult = await (<Promise<string>>(
      this.redis.script('LOAD', LUA_ADD_RESULT_BY_INDEX)
    ));
  }

  public async handleCallback(
    submissionId: string,
    index: number,
    payload: Judge0Response,
  ): Promise<void> {
    const { added, received, total } = await this.handleCallbackInternal(
      submissionId,
      index,
      payload,
    );

    if (added && received >= total) {
      const lockKey = this.redisKeys.doneLock(submissionId);
      const lock = await this.redis.set(lockKey, '1', 'EX', 600, 'NX'); // 10m lock
      if (lock === 'OK') {
        await this.finalizeQueue.add(
          'finalize',
          { submissionId },
          {
            jobId: submissionId, // de-dupe per submission
            attempts: 5, // retry on transient failures
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
            removeOnFail: 50,
          },
        );
      }
    }
  }

  // Aggregate results for sending to client via sse
  public async finalizer(submissionId: string) {
    const metaKey = this.redisKeys.meta(submissionId);
    const resultsIKey = this.redisKeys.resultsByIndex(submissionId);
    const seenKey = this.redisKeys.seen(submissionId);

    const meta = await this.redis.hgetall(metaKey);
    const results = await this.redis.hgetall(resultsIKey);

    // Clean up Redis keys
    await Promise.all([
      this.redis.del(metaKey),
      this.redis.del(resultsIKey),
      this.redis.del(seenKey),
      this.redis.del(this.redisKeys.doneLock(submissionId)),
    ]);

    // aggregate results
    const testResults: TestResultDto[] = Object.values(results).map(
      (r: string) => {
        const testResult: Judge0Response = JSON.parse(r) as Judge0Response;
        return this.submissionService.buildTestResult(testResult);
      },
    );

    const finalResult = await this.submissionService.buildSubmissionResult(
      testResults,
      meta.problemId,
    );

    // emit event using sse to notify frontend
    await this.submissionSseService.publishFinalize(submissionId, finalResult);
  }

  /**
   * Safely eval Lua (handle NOSCRIPT after Redis restart)
   */
  private async evalAddResult(
    resultsIKey: string,
    metaKey: string,
    seenKey: string,
    token: string,
    index: number,
    json: string,
  ): Promise<[number, number, number]> {
    const argv = [token, String(index), json];

    try {
      const res = await (<Promise<string>>(
        this.redis.evalsha(
          this.luaShaAddResult,
          3,
          resultsIKey,
          metaKey,
          seenKey,
          ...argv,
        )
      ));

      return [Number(res[0] ?? 0), Number(res[1] ?? 0), Number(res[2] ?? 0)];
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Fall back to EVAL on NOSCRIPT
      if (msg.includes('NOSCRIPT')) {
        const res = await (<Promise<string>>(
          this.redis.eval(
            LUA_ADD_RESULT_BY_INDEX,
            3,
            resultsIKey,
            metaKey,
            seenKey,
            ...argv,
          )
        ));
        // Reload to restore sha
        this.luaShaAddResult = await (<Promise<string>>(
          this.redis.script('LOAD', LUA_ADD_RESULT_BY_INDEX)
        ));
        return [Number(res[0] ?? 0), Number(res[1] ?? 0), Number(res[2] ?? 0)];
      }
      throw e;
    }
  }

  /**
   * Handle one Judge0 callback
   * Always let controller return 204 so Judge0 won't retry.
   */
  private async handleCallbackInternal(
    submissionId: string,
    index: number,
    payload: Judge0Response,
  ): Promise<{ added: boolean; received: number; total: number }> {
    const metaKey = this.redisKeys.meta(submissionId);
    const resultsIKey = this.redisKeys.resultsByIndex(submissionId);
    const seenKey = this.redisKeys.seen(submissionId);

    // Keep the stored result compact. Add/remove fields as needed.
    const toStore = {
      index,
      token: payload.token,
      status: payload.status,
      stdout: payload.stdout,
      stderr: payload.stderr,
      time: payload.time,
      memory: payload.memory,
      compile_output: payload.compile_output,
      message: payload.message,
    };

    try {
      const [added, received, total] = await this.evalAddResult(
        resultsIKey,
        metaKey,
        seenKey,
        payload.token,
        index,
        JSON.stringify(toStore),
      );

      return { added: added === 1, received, total };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Callback Redis error [${submissionId} idx=${index}]: ${msg}`,
      );
      return { added: false, received: 0, total: 0 };
    }
  }
}
