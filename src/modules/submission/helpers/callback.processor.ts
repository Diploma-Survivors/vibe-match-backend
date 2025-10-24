import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { BackoffOptions, Queue } from 'bullmq';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { REDIS } from '../../../shared/redis/redis.module';
import { ContestParticipation } from '../../contests/entities/contest-participations.entity';
import { Judge0Response } from '../../judge0/judge0.interface';
import { TestResultDto } from '../../problems/testcases/dto/run-testcase-result.response.dto';
import { SubmissionConstants } from '../constants/submission.constant';
import { SubmissionResultDto } from '../dto/submission.result.dto';
import { Submission } from '../entities/submission.entity';
import { SubmissionJob, SubmissionQueue } from '../enums/submission-event.enum';
import { SubmissionService } from '../submission.service';
import { RedisKeys } from './redis-keys.helper';

/**
 * @description Lua script to add a result by index with deduplication and first-writer-wins logic.
 * @param KEYS
 *   - KEYS[1]=resultsI (hash index->json)  stores results by their index
 *   - KEYS[2]=meta     (hash)              stores metadata like "received" count and "total" count
 *   - KEYS[3]=seen     (set)               stores tokens of already seen results for deduplication
 * @param ARGV
 *   - ARGV[1]=token    unique token of the result
 *   - ARGV[2]=index    index of the result
 *   - ARGV[3]=json     JSON stringified result data
 * @returns An array containing:
 *   - added (0|1): Whether a new result was added (1) or it was a duplicate (0).
 *   - received: The total number of unique results received so far.
 *   - total: The total number of expected results.
 */
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
  private pub: Redis;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly redisKeys: RedisKeys,
    @InjectQueue(SubmissionQueue.FINALIZE)
    private readonly finalizeQueue: Queue,
    private readonly submissionService: SubmissionService,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(ContestParticipation)
    private readonly contestParticipationRepository: Repository<ContestParticipation>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.luaShaAddResult = (await this.redis.script(
      'LOAD',
      LUA_ADD_RESULT_BY_INDEX,
    )) as string;
    this.pub = this.redis.duplicate();
  }

  public async handleCallback(
    submissionId: string,
    index: number,
    payload: Judge0Response,
    isSubmit: boolean,
  ): Promise<void> {
    const { added, received, total } = await this.handleCallbackInternal(
      submissionId,
      index,
      payload,
    );

    this.logger.log('Callback handled', {
      submissionId,
      index,
      added,
      received,
      total,
    });

    if (added && received >= total) {
      await this.tryLockAndScheduleFinalize(submissionId, isSubmit);
    }
  }

  public async finalizer(
    submissionId: string,
    isSubmit: boolean,
  ): Promise<void> {
    this.logger.log('Finalizer started', { submissionId, isSubmit });
    const metaKey = this.redisKeys.meta(submissionId);
    const resultsIKey = this.redisKeys.resultsByIndex(submissionId);
    const seenKey = this.redisKeys.seen(submissionId);

    const meta = await this.redis.hgetall(metaKey);
    const results = await this.redis.hgetall(resultsIKey);

    await this.cleanupRedisKeys(submissionId, [metaKey, resultsIKey, seenKey]);

    const testResults = this.aggregateTestResults(results);
    let finalResult: SubmissionResultDto;

    if (isSubmit) {
      finalResult =
        await this.submissionService.buildSubmissionResultForSubmitMode(
          testResults,
          +meta.problemId,
        );
      await this.updateSubmissionEntity(
        Number.parseInt(submissionId),
        finalResult,
      );
    } else {
      finalResult =
        await this.submissionService.buildSubmissionResultForRunMode(
          testResults,
          +meta.problemId,
        );
    }

    await this.publishFinalize(submissionId, finalResult);
  }

  private async tryLockAndScheduleFinalize(
    submissionId: string,
    isSubmit: boolean,
  ) {
    const lockKey = this.redisKeys.doneLock(submissionId);
    const lock = await this.redis.set(lockKey, '1', 'EX', 600, 'NX');
    if (lock === 'OK') {
      this.logger.log(
        `[${submissionId}] Lock acquired. Calling scheduleFinalizeJob.`,
      );
      await this.scheduleFinalizeJob(submissionId, isSubmit);
    } else {
      this.logger.warn(
        `[${submissionId}] Lock is already held, skipping finalize scheduling.`,
      );
    }
  }

  private async scheduleFinalizeJob(submissionId: string, isSubmit: boolean) {
    this.logger.log(
      `[${submissionId}] Inside scheduleFinalizeJob. Preparing to add to queue.`,
    );
    const jobName = isSubmit
      ? SubmissionJob.FINALIZE_SUBMIT
      : SubmissionJob.FINALIZE_RUN;
    try {
      await this.finalizeQueue.add(
        jobName,
        { submissionId },
        {
          jobId: `finalize-${submissionId}`, // Add a string prefix
          attempts: this.configService.get<number>('submission.job.attempts'),
          backoff: this.configService.get<object>(
            'submission.job.backoff',
          ) as BackoffOptions,
          removeOnComplete: this.configService.get<boolean>(
            'submission.job.removeOnComplete',
          ),
          removeOnFail: this.configService.get<number>(
            'submission.job.removeOnFail',
          ),
        },
      );
    } catch (error) {
      this.logger.error(
        `[${submissionId}] FAILED to add job to finalizeQueue`,
        error,
      );
    }
  }

  private aggregateTestResults(
    results: Record<string, string>,
  ): TestResultDto[] {
    return Object.values(results).map((r) => {
      const testResult: Judge0Response = JSON.parse(r) as Judge0Response;
      return this.submissionService.buildTestResult(testResult);
    });
  }

  private async updateSubmissionEntity(
    submissionId: number,
    finalResult: SubmissionResultDto,
  ) {
    const savedSubmission = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });
    if (!savedSubmission) return;

    savedSubmission.status = finalResult.status;
    savedSubmission.score = finalResult.score;
    savedSubmission.totalTests = finalResult.totalTests;
    savedSubmission.passedTests = finalResult.passedTests;
    savedSubmission.runtime = finalResult.runtime;
    savedSubmission.memory = finalResult.memory;
    savedSubmission.resultDescription = finalResult.resultDescription;

    await this.submissionRepository.save(savedSubmission);
  }

  private async cleanupRedisKeys(submissionId: string, keys: string[]) {
    await Promise.all([
      ...keys.map((k) => this.redis.del(k)),
      this.redis.del(this.redisKeys.doneLock(submissionId)),
    ]);
  }

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
      const res = (await this.redis.evalsha(
        this.luaShaAddResult,
        3,
        resultsIKey,
        metaKey,
        seenKey,
        ...argv,
      )) as string;
      return [Number(res[0] ?? 0), Number(res[1] ?? 0), Number(res[2] ?? 0)];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('NOSCRIPT')) {
        const res = (await this.redis.eval(
          LUA_ADD_RESULT_BY_INDEX,
          3,
          resultsIKey,
          metaKey,
          seenKey,
          ...argv,
        )) as string;
        this.luaShaAddResult = (await this.redis.script(
          'LOAD',
          LUA_ADD_RESULT_BY_INDEX,
        )) as string;
        return [Number(res[0] ?? 0), Number(res[1] ?? 0), Number(res[2] ?? 0)];
      }
      throw e;
    }
  }

  private async handleCallbackInternal(
    submissionId: string,
    index: number,
    payload: Judge0Response,
  ): Promise<{ added: boolean; received: number; total: number }> {
    const metaKey = this.redisKeys.meta(submissionId);
    const resultsIKey = this.redisKeys.resultsByIndex(submissionId);
    const seenKey = this.redisKeys.seen(submissionId);

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

  async publishFinalize<T = any>(submissionId: string, payload: T) {
    await this.pub.publish(
      SubmissionConstants.EVENT_REDIS_CHANNEL,
      JSON.stringify({ submissionId, payload }),
    );
    this.logger.log(`Published finalize for ${submissionId}`);
  }
}
