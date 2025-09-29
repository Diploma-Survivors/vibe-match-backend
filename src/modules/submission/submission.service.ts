import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
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
import { InjectRepository } from '@nestjs/typeorm';
import { REDIS } from '../../shared/redis/redis.module';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { User } from '../user/entities/user.entity';
import { Language } from './language/language.entity';
import { ConfigService } from '@nestjs/config';
import { StoragesService } from '../storages/storages.service';
import { SUBMISSION_FILE_EXTENSION } from '../../common/constants/submission.constant';

@Injectable()
export class SubmissionService {
  private static readonly REDIS_TTL_SECONDS = 3600; // 1 hour
  private readonly logger = new Logger(SubmissionService.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(Problem)
    private readonly problemRepository: Repository<Problem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Language) // FIX: inject Language repo
    private readonly languageRepository: Repository<Language>,
    private readonly configService: ConfigService,
    private readonly storagesService: StoragesService,
    private readonly judge0Service: Judge0Service,
    private readonly redisKeys: RedisKeys,
    @Inject(REDIS)
    private readonly redis: Redis,
  ) {}

  // --------------------------
  // Public APIs
  // --------------------------

  async run(
    dto: CreateSubmissionDto,
    file?: Express.Multer.File,
  ): Promise<{ submissionId: string }> {
    const problem = await this.findProblemOrFail(dto.problemId);
    const submissionId = uuidv4();
    return this.submitBatch(submissionId, dto, problem, false, file);
  }

  async submit(
    dto: CreateSubmissionDto,
    user: JwtPayload,
    file?: Express.Multer.File,
  ): Promise<{ submissionId: string }> {
    const problem = await this.findProblemOrFail(dto.problemId);
    const savedUser = await this.findUserOrFail(user.userId);
    const language = await this.findLanguageOrFail(dto.languageId);

    let fileUrl: string | null = null;
    const isMultiFile = dto.languageId === 89;
    if (isMultiFile) {
      fileUrl = await this.saveSubmitFile(user.userId, problem.id, file);
    }

    const submission = await this.submissionRepository.save(
      this.submissionRepository.create({
        sourceCode: dto.sourceCode,
        user: savedUser,
        problem,
        language,
        fileUrl,
      }),
    );

    return this.submitBatch(submission.id, dto, problem, true, file);
  }

  async submitBatch(
    submissionId: string,
    dto: CreateSubmissionDto,
    problem: Problem,
    isSubmit: boolean,
    file?: Express.Multer.File,
  ): Promise<{ submissionId: string }> {
    // validate (for run mode we must have DTO testcases; for submit mode testcases come from problem file)
    if (!isSubmit && (!dto?.testCases || dto.testCases.length === 0)) {
      throw new Error(
        'submitBatch: testCases must be a non-empty array when not using testcase file.',
      );
    }

    // Prepare common encodings (source/additional files) and constants
    const isMultiFile = dto.languageId === 89;
    const sourceBase64 =
      !isMultiFile && dto.sourceCode
        ? this.judge0Service.encodeBase64(dto.sourceCode)
        : undefined;
    const additionalFilesBase64 =
      isMultiFile && file?.buffer ? file.buffer.toString('base64') : undefined;

    // Build items
    const items: Judge0SubmissionPayload[] = isSubmit
      ? await this.buildItemsFromProblemFile(
          submissionId,
          dto,
          problem,
          sourceBase64,
          additionalFilesBase64,
        )
      : this.buildItemsFromDto(
          submissionId,
          dto,
          problem,
          sourceBase64,
          additionalFilesBase64,
        );

    if (items.length === 0) {
      throw new Error('No testcases found for submission.');
    }

    // Submit to Judge0
    const judge0BatchResponse: Judge0BatchResponse =
      await this.judge0Service.createSubmissionBatch(items);

    // Compare against items length (correct for both run and submit)
    if (judge0BatchResponse.length !== items.length) {
      throw new Error(
        `Judge0 returned ${judge0BatchResponse.length} tokens, expected ${items.length}. submissionId=${submissionId}`,
      );
    }

    // Initialize Redis keys
    await this.initRedis(submissionId, items.length, problem.id);

    return { submissionId };
  }

  private async findProblemOrFail(problemId: string): Promise<Problem> {
    const problem = await this.problemRepository.findOne({
      where: { id: problemId },
    });
    if (!problem)
      throw new HttpException('Problem not found', HttpStatus.NOT_FOUND);
    return problem;
  }

  private async findUserOrFail(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    return user;
  }

  private async findLanguageOrFail(languageId: number): Promise<Language> {
    const lang = await this.languageRepository.findOne({
      where: { id: languageId },
    });
    if (!lang)
      throw new HttpException('Language not found', HttpStatus.NOT_FOUND);
    return lang;
  }

  private async saveSubmitFile(
    userId: string,
    problemId: number | string,
    file?: Express.Multer.File,
  ): Promise<string> {
    if (!file?.buffer) {
      throw new HttpException(
        'File is required for multi-file submissions',
        HttpStatus.BAD_REQUEST,
      );
    }
    const seed = uuidv4();
    const key = `submissions/${userId}/${problemId}/${seed}${SUBMISSION_FILE_EXTENSION}`;
    const bucket = this.configService.get<string>(
      'aws.s3.bucketName',
    ) as string;
    await this.storagesService.upload({ bucket, key, file: file.buffer });
    return this.storagesService.getObjectUrl(bucket, key);
  }

  private buildJudge0Payload(
    dto: CreateSubmissionDto,
    problem: Problem,
    submissionId: string,
    index: number,
    stdinRaw: string | undefined,
    expectedOutput: string | undefined,
    isSubmit: boolean,
    sourceBase64?: string,
    additionalFilesBase64?: string,
  ): Judge0SubmissionPayload {
    return {
      language_id: dto.languageId,
      source_code: sourceBase64,
      additional_files: additionalFilesBase64,
      stdin: stdinRaw ? this.judge0Service.encodeBase64(stdinRaw) : undefined,
      expected_output: expectedOutput
        ? this.judge0Service.encodeBase64(expectedOutput)
        : undefined,
      redirect_stderr_to_stdout: true,
      cpu_time_limit: this.judge0Service.msToSeconds(problem.timeLimitMs),
      memory_limit: problem.memoryLimitKb,
      callback_url: this.judge0Service.getCallbackUrl(
        submissionId,
        String(index),
        isSubmit,
      ),
    };
  }

  private async buildItemsFromProblemFile(
    submissionId: string,
    dto: CreateSubmissionDto,
    problem: Problem,
    sourceBase64?: string,
    additionalFilesBase64?: string,
  ): Promise<Judge0SubmissionPayload[]> {
    const url = new URL(String(problem.testcase.fileUrl));
    const bucket = url.hostname.split('.')[0];
    const key = url.pathname.substring(1);

    const items: Judge0SubmissionPayload[] = [];
    let i = 0;
    let stage: 'header' | 'index' | 'input' | 'output' = 'header';
    let input = '';
    let output = '';

    for await (const line of this.storagesService.streamLines(bucket, key)) {
      if (stage === 'header') {
        // First line is totalTest → skip or validate
        stage = 'index';
        continue;
      }

      if (stage === 'index') {
        // line = testcase number (ignore, we use i++)
        stage = 'input';
        continue;
      }

      if (stage === 'input') {
        input = line;
        stage = 'output';
        continue;
      }

      if (stage === 'output') {
        output = line;

        items.push(
          this.buildJudge0Payload(
            dto,
            problem,
            submissionId,
            i,
            input,
            output,
            true,
            sourceBase64,
            additionalFilesBase64,
          ),
        );

        i++;
        stage = 'index'; // reset for next testcase
      }
    }

    return items;
  }

  private buildItemsFromDto(
    submissionId: string,
    dto: CreateSubmissionDto,
    problem: Problem,
    sourceBase64?: string,
    additionalFilesBase64?: string,
  ): Judge0SubmissionPayload[] {
    const items: Judge0SubmissionPayload[] = dto.testCases.map((testCase, i) =>
      this.buildJudge0Payload(
        dto,
        problem,
        submissionId,
        i,
        testCase.input,
        testCase.output,
        false,
        sourceBase64,
        additionalFilesBase64,
      ),
    );
    return items;
  }

  private async initRedis(
    submissionId: string,
    tcCount: number,
    problemId: number | string,
  ) {
    const metaKey = this.redisKeys.meta(submissionId);
    const resultsIKey = this.redisKeys.resultsByIndex(submissionId);
    const seenKey = this.redisKeys.seen(submissionId);

    const ttlSec = SubmissionService.REDIS_TTL_SECONDS;
    const tx = this.redis.multi();

    tx.hset(metaKey, {
      total: String(tcCount),
      received: '0',
      problemId: String(problemId),
    });

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
  }

  buildTestResult(judge0Response: Judge0Response): TestResultDto {
    const stdout = this.judge0Service.decodeBase64(judge0Response.stdout);

    return {
      stdout: stdout,
      time: judge0Response.time,
      memory: judge0Response.memory,
      status: judge0Response.status,
      stderr: this.judge0Service.decodeBase64(judge0Response.stderr),
      token: judge0Response.token,
      expectedOutput: this.judge0Service.decodeBase64(
        judge0Response.expected_output,
      ),
    };
  }

  async buildSubmissionResult(
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
      this.calStats(results);
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

  calStats(results: TestResultDto[]) {
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
