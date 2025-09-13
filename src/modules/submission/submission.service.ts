import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { TestResultDto } from '../problems/testcases/dto/run-testcase-result.response.dto';
import { judge0StatusMap, SubmissionStatus } from './enums/submission.enum';
import { SubmissionResultDto } from './dto/submission.response.dto';
import { Judge0Service } from '../judge0/judge0.service';
import {
  Judge0BatchResponse,
  Judge0Response,
  Judge0SubmissionPayload,
} from '../judge0/judge0.interface';
import { Submission } from './entities/submission.entity';
import { Repository } from 'typeorm';
import { Problem } from '../problems/entities/problem.entity';
import { v4 as uuidv4 } from 'uuid';
import { RedisKeys } from './helpers/redis-keys.helper';
import Redis from 'ioredis';

@Injectable()
export class SubmissionService {
  private readonly logger = new Logger(SubmissionService.name);
  private static readonly REDIS_TTL_SECONDS = 3600; // 1 hour
  private static readonly SUBMISSION_TIMEOUT_MS = 60_000; // 60s

  constructor(
    private readonly submissionRepository: Repository<Submission>,
    private readonly problemRepository: Repository<Problem>,
    private readonly judge0Service: Judge0Service,
    private readonly redisKeys: RedisKeys,
    private readonly redis: Redis,
  ) {}

  async run(
    dto: CreateSubmissionDto,
    file?: Express.Multer.File,
  ): Promise<{ submissionId: string }> {
    const problem = await this.problemRepository.findOne({
      where: { id: dto.problemId },
    });
    if (!problem) {
      throw new HttpException('Problem not found', HttpStatus.NOT_FOUND);
    }

    return this.submitBatch(dto, problem, file);
  }

  async submitBatch(
    dto: CreateSubmissionDto,
    problem: Problem,
    file?: Express.Multer.File,
  ): Promise<{ submissionId: string }> {
    if (!dto?.testCases?.length) {
      throw new Error('submitBatch: testCases must be a non-empty array.');
    }

    const submissionId = uuidv4();

    // === Precompute invariants ===
    const isMultiFile = dto.languageId === 89;
    const now = Date.now();
    const timeoutAt = now + SubmissionService.SUBMISSION_TIMEOUT_MS;

    const cpuSeconds = this.judge0Service.msToSeconds(problem.timeLimitMs);

    // Encode source/additional files
    const sourceBase64 =
      !isMultiFile && dto.sourceCode
        ? this.judge0Service.encodeBase64(dto.sourceCode)
        : undefined;

    const additionalFilesBase64 =
      isMultiFile && file?.buffer ? file.buffer.toString('base64') : undefined;

    const tcCount = dto.testCases.length;

    // Build Judge0 batch items
    const items: Judge0SubmissionPayload[] = new Array<Judge0SubmissionPayload>(
      tcCount,
    );
    for (let i = 0; i < tcCount; i++) {
      const input = dto.testCases[i].input;
      items[i] = {
        language_id: dto.languageId,
        source_code: sourceBase64,
        additional_files: additionalFilesBase64,
        stdin: input ? this.judge0Service.encodeBase64(input) : undefined,
        redirect_stderr_to_stdout: true,
        cpu_time_limit: cpuSeconds,
        memory_limit: problem.memoryLimitKb,
        callback_url: this.judge0Service.getCallbackUrl(
          submissionId,
          String(i),
        ),
      };
    }

    // === Submit to Judge0 ===
    const judge0BatchResponse: Judge0BatchResponse =
      await this.judge0Service.createSubmissionBatch(items);

    const returned = judge0BatchResponse?.submissions ?? [];
    if (returned.length !== tcCount) {
      throw new Error(
        `Judge0 returned ${returned.length} tokens, expected ${tcCount}. submissionId=${submissionId}`,
      );
    }

    // === Redis keys ===
    const metaKey = this.redisKeys.meta(submissionId);
    const resultsIKey = this.redisKeys.resultsByIndex(submissionId);
    const seenKey = this.redisKeys.seen(submissionId);

    // === Initialize Redis atomically via MULTI/EXEC ===
    const ttlSec = SubmissionService.REDIS_TTL_SECONDS;
    const tx = this.redis.multi();

    // Meta
    tx.hset(metaKey, {
      total: String(tcCount),
      received: '0',
      problemId: String(problem.id),
      startAt: String(now),
      timeoutAt: String(timeoutAt),
    });

    // TTL
    tx.expire(metaKey, ttlSec);
    tx.expire(resultsIKey, ttlSec);
    tx.expire(seenKey, ttlSec);

    try {
      await tx.exec();
    } catch (err) {
      this.logger.error(
        `Redis init failed for submission ${submissionId}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }

    return { submissionId };
  }

  public buildTestResult(judge0Response: Judge0Response): TestResultDto {
    const stdout = this.judge0Service.decodeBase64(judge0Response.stdout) || '';

    return {
      stdout: stdout,
      time: judge0Response.time,
      memory: judge0Response.memory,
      status: judge0Response.status,
      stderr:
        this.judge0Service.decodeBase64(judge0Response.stderr) || undefined,
      token: judge0Response.token,
    };
  }

  public async buildSubmissionResult(
    results: TestResultDto[],
    problemId: string,
  ): Promise<SubmissionResultDto> {
    const problem: Problem | null = await this.problemRepository.findOne({
      where: { id: problemId },
    });
    if (!problem) {
      throw new HttpException('Problem not found', HttpStatus.NOT_FOUND);
    }
    const { overallStatus, passedTests, totalTests, sumRuntime, sumMemory } =
      this.determineSubmissionStatus(results);
    const score = (problem.maxScore * passedTests) / totalTests;

    return {
      status: overallStatus,
      totalTests,
      passedTests,
      results,
      score: Math.round(score * 100) / 100, // Round to 2 decimal places
      runtime: sumRuntime,
      memory: sumMemory,
    };
  }

  public determineSubmissionStatus(results: TestResultDto[]) {
    let overallStatus = SubmissionStatus.ACCEPTED;
    const totalTests = results.length;
    let passedTests = 0;
    let sumRuntime = 0;
    let sumMemory = 0;
    for (const result of results) {
      sumRuntime += result.time || 0;
      sumMemory += result.memory || 0;
      if (result.status.id === 3) {
        passedTests++;
      } else if (
        result.status.id !== 3 &&
        overallStatus === SubmissionStatus.ACCEPTED
      ) {
        // only set the first not accepted status
        overallStatus =
          judge0StatusMap[result.status.id] ?? SubmissionStatus.UNKNOWN_ERROR;
      }
    }
    return { overallStatus, passedTests, totalTests, sumRuntime, sumMemory };
  }
}
