import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { REDIS } from '../../shared/redis/redis.module';
import { Base64Util } from '../../shared/util/base64.util';
import { TimeUtil } from '../../shared/util/time.util';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { ContestParticipation } from '../contests/entities/contest-participations.entity';
import { Contest } from '../contests/entities/contest.entity';
import {
  Judge0BatchResponse,
  Judge0Response,
  Judge0SubmissionPayload,
} from '../judge0/judge0.interface';
import { Judge0Service } from '../judge0/judge0.service';
import { Language } from '../language/entities/language.entity';
import { Language as LanguageEnum } from '../language/enums/language.enum';
import { Problem } from '../problems/entities/problem.entity';
import { TestResultDto } from '../problems/testcases/dto/run-testcase-result.response.dto';
import { StoragesService } from '../storages/storages.service';
import { User } from '../user/entities/user.entity';
import { SubmissionConstants } from './constants/submission.constant';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionResultDto } from './dto/submission.result.dto';
import { Submission } from './entities/submission.entity';
import {
  judge0StatusMap,
  SubmissionStatus,
} from './enums/submission-status.enum';
import { RedisKeys } from './helpers/redis-keys.helper';

@Injectable()
export class SubmissionService {
  private static readonly REDIS_TTL_SECONDS = 3600; // 1 hour
  private readonly logger = new Logger(SubmissionService.name);
  private readonly MAX_PAGE_SIZE = 100;

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(Problem)
    private readonly problemRepository: Repository<Problem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
    @InjectRepository(Contest)
    private readonly contestRepository: Repository<Contest>,
    @InjectRepository(ContestParticipation)
    private readonly contestParticipationRepo: Repository<ContestParticipation>,
    private readonly configService: ConfigService,
    private readonly storagesService: StoragesService,
    private readonly judge0Service: Judge0Service,
    private readonly redisKeys: RedisKeys,
    @Inject(REDIS)
    private readonly redis: Redis,
  ) {}

  async getStatisticsByProblemId(problemId: number) {
    const totalSubmissions = await this.submissionRepository.count({
      where: { problemId },
    });

    const totalAcceptedSubmissions = await this.submissionRepository.count({
      where: {
        problemId,
        status: SubmissionStatus.ACCEPTED,
      },
    });

    const acceptanceRate = totalSubmissions
      ? (totalAcceptedSubmissions / totalSubmissions) * 100
      : 0;

    const { attemptedUsers } = (await this.submissionRepository
      .createQueryBuilder('submission')
      .where('submission.problemId = :problemId', { problemId })
      .select('COUNT(DISTINCT submission.userId)', 'attemptedUsers')
      .getRawOne()) as { attemptedUsers: number };

    const { solvedUsers } = (await this.submissionRepository
      .createQueryBuilder('submission')
      .where('submission.problemId = :problemId', { problemId })
      .andWhere('submission.status = :status', {
        status: SubmissionStatus.ACCEPTED,
      })
      .select('COUNT(DISTINCT submission.userId)', 'solvedUsers')
      .getRawOne()) as { solvedUsers: number };

    const averageAttempts = attemptedUsers
      ? totalSubmissions / attemptedUsers
      : 0;

    return {
      totalSubmissions,
      totalAcceptedSubmissions,
      acceptanceRate,
      attemptedUsers,
      solvedUsers,
      averageAttempts,
    };
  }

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
    const isMultiFile =
      dto.languageId === Number(LanguageEnum.MULTI_FILE_PROGRAM);
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
        ? Base64Util.encodeBase64(dto.sourceCode)
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

  private async findProblemOrFail(problemId: number): Promise<Problem> {
    const problem = await this.problemRepository.findOne({
      where: { id: problemId },
    });
    if (!problem)
      throw new HttpException('Problem not found', HttpStatus.NOT_FOUND);
    return problem;
  }

  private async findUserOrFail(userId: number): Promise<User> {
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
    userId: number,
    problemId: number,
    file?: Express.Multer.File,
  ): Promise<string> {
    if (!file?.buffer) {
      throw new HttpException(
        'File is required for multi-file submissions',
        HttpStatus.BAD_REQUEST,
      );
    }
    const seed = uuidv4();
    const key = `submissions/${userId}/${problemId}/${seed}${SubmissionConstants.FILE_EXTENSION}`;
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
      stdin: stdinRaw ? Base64Util.encodeBase64(stdinRaw) : undefined,
      expected_output: expectedOutput
        ? Base64Util.encodeBase64(expectedOutput)
        : undefined,
      redirect_stderr_to_stdout: true,
      cpu_time_limit: TimeUtil.msToSeconds(problem.timeLimitMs),
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
    const url = 'src/modules/submission/testcase.txt';

    const items: Judge0SubmissionPayload[] = [];
    let i = 0;
    let stage: 'header' | 'index' | 'input' | 'output' = 'header';
    let input = '';
    let output = '';

    for await (const line of this.storagesService.streamLinesLocal(url)) {
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
    problemId: number,
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
    const stdout = Base64Util.decodeBase64(judge0Response.stdout);

    return {
      stdout: stdout,
      time: judge0Response.time,
      memory: judge0Response.memory,
      status: judge0StatusMap[judge0Response.status.id],
      stderr: Base64Util.decodeBase64(judge0Response.stderr),
      token: judge0Response.token,
      expectedOutput: Base64Util.decodeBase64(judge0Response.expected_output),
    };
  }

  async buildSubmissionResult(
    results: TestResultDto[],
    problemId: number,
  ): Promise<SubmissionResultDto> {
    const problem: Problem | null = await this.problemRepository.findOne({
      where: { id: problemId },
    });
    if (!problem) {
      throw new HttpException('Problem not found', HttpStatus.NOT_FOUND);
    }
    const {
      overallStatus,
      passedTests,
      totalTests,
      sumRuntime,
      sumMemory,
      firstNonAcceptedResult,
    } = this.calStats(results);
    const score = (problem.maxScore * passedTests) / totalTests;

    return {
      status: overallStatus,
      totalTests,
      passedTests,
      results,
      score: Math.round(score * 100) / 100, // Round to 2 decimal places
      runtime: sumRuntime,
      memory: sumMemory,
      resultDescription: this.generateResult(firstNonAcceptedResult),
    };
  }

  calStats(results: TestResultDto[]) {
    let overallStatus = SubmissionStatus.ACCEPTED;
    const totalTests: number = results.length;
    let passedTests: number = 0;
    let sumRuntime: number = 0;
    let sumMemory: number = 0;
    let firstNonAcceptedResult: TestResultDto | null = null;
    for (const result of results) {
      sumRuntime += Number(result.time) || 0;
      sumMemory += Number(result.memory) || 0;
      if (result.status === SubmissionStatus.ACCEPTED) {
        passedTests++;
      } else {
        // only set the first not accepted status
        overallStatus = result.status;
        if (!firstNonAcceptedResult) {
          firstNonAcceptedResult = result;
        }
      }
    }
    return {
      overallStatus,
      passedTests,
      totalTests,
      sumRuntime,
      sumMemory,
      firstNonAcceptedResult,
    };
  }

  generateResult(firstNonAcceptedResult: TestResultDto | null): string {
    if (!firstNonAcceptedResult) {
      return 'All test cases passed';
    }
    switch (firstNonAcceptedResult.status) {
      case SubmissionStatus.WRONG_ANSWER:
        return `
        Expected output: ${firstNonAcceptedResult.expectedOutput || 'N/A'}
        Actual output: ${firstNonAcceptedResult.stdout || 'N/A'}
        `;
      case SubmissionStatus.TIME_LIMIT_EXCEEDED:
        return `Time limit exceeded\n ${firstNonAcceptedResult.stderr || ''}`;
      case SubmissionStatus.SIGSEGV:
        return `Segmentation fault\n ${firstNonAcceptedResult.stderr || ''}`;
      case SubmissionStatus.SIGXFSZ:
        return `File size limit exceeded\n ${firstNonAcceptedResult.stderr || ''}`;
      case SubmissionStatus.SIGFPE:
        return `Floating point exception\n ${firstNonAcceptedResult.stderr || ''}`;
      case SubmissionStatus.SIGABRT:
        return `Abort signal from abort(3)\n ${firstNonAcceptedResult.stderr || ''}`;
      case SubmissionStatus.NZEC:
        return `Non-zero exit status\n ${firstNonAcceptedResult.stderr || ''}`;
      case SubmissionStatus.RUNTIME_ERROR:
        return `Runtime error: ${firstNonAcceptedResult.stderr || 'N/A'}`;
      case SubmissionStatus.COMPILATION_ERROR:
        return `Compilation error: ${firstNonAcceptedResult.stderr || 'N/A'}`;
      default:
        return 'Unknown error occurred';
    }
  }
  //
  // private async findSubmissionWithPagination(
  //   query: SubmissionsCursorQueryDto,
  //   config: {
  //     joins: string[];
  //     filterFn: (qb: SelectQueryBuilder<Problem>) => void;
  //   },
  // ) {
  //   const pagination = this.validateAndGetPagination(query);
  //   const sortConfig = this.buildSortConfiguration(
  //     query,
  //     pagination.isBackward,
  //   );
  //
  //   const ids = await this.findSubmissionIds(
  //     query,
  //     pagination.limit,
  //     sortConfig,
  //     config,
  //   );
  //
  //   const items = await this.findProblemByIds(ids, sortConfig);
  //   return this.buildPaginatedResult(
  //     items,
  //     pagination.limit,
  //     pagination.isBackward,
  //     query,
  //   );
  // }
  //
  // private validateAndGetPagination(query: PaginationCursorDto) {
  //   const isBackward = !!query?.before && !query?.after;
  //   const limit = isBackward ? query?.last : query?.first;
  //
  //   if (!limit || limit > this.MAX_PAGE_SIZE) {
  //     throw new BadRequestException(
  //       `Limit must be between 1 and ${this.MAX_PAGE_SIZE}`,
  //     );
  //   }
  //
  //   return { limit, isBackward };
  // }
  //
  // private buildSortConfiguration(
  //   query: SubmissionsCursorQueryDto,
  //   isBackward: boolean,
  // ) {
  //   const sortBy = query?.sortBy;
  //   const naturalOrder: 'ASC' | 'DESC' =
  //     query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
  //   const operator = this.determineCursorOperator(query, naturalOrder);
  //
  //   // Reverse sort order for backward pagination
  //   const reversedOrder: 'ASC' | 'DESC' =
  //     naturalOrder === 'ASC' ? 'DESC' : 'ASC';
  //   const sortOrder: 'ASC' | 'DESC' = isBackward ? reversedOrder : naturalOrder;
  //
  //   return { sortBy, sortOrder, operator };
  // }
  //
  // private determineCursorOperator(
  //   query: PaginationCursorDto,
  //   naturalOrder: 'ASC' | 'DESC',
  // ): '>' | '<' {
  //   if (query?.after) {
  //     return naturalOrder === 'ASC' ? '>' : '<';
  //   }
  //
  //   if (query?.before) {
  //     return naturalOrder === 'ASC' ? '<' : '>';
  //   }
  //
  //   return '>';
  // }
  //
  // private async findSubmissionIds(
  //   query: SubmissionsCursorQueryDto,
  //   limit: number,
  //   sortConfig: {
  //     sortBy:  ;
  //     sortOrder: 'ASC' | 'DESC';
  //     operator: '<' | '>';
  //   },
  //   config: {
  //     joins: string[];
  //     filterFn: (qb: SelectQueryBuilder<Problem>) => void;
  //   },
  // ) {
  //   const queryBuilder = this.buildBaseQuery(config.joins);
  //
  //   config.filterFn(queryBuilder);
  //   this.applyMatchFilters(queryBuilder, query);
  //
  //   await this.applyCursorPagination(queryBuilder, query, sortConfig);
  //
  //   queryBuilder
  //     .select('submission.id', 'id')
  //     .addSelect(`submission.${sortConfig.sortBy}`, sortConfig.sortBy)
  //     .distinct(true)
  //     .limit(limit + 1);
  //
  //   const items = await queryBuilder.getRawMany<{
  //     id: string;
  //     [key: string]: any;
  //   }>();
  //   this.logger.debug(`Found submission IDs: ${JSON.stringify(items)}`);
  //
  //   return items.map((item) => item.id);
  // }
  //
  // private buildBaseQuery(joins: string[]) {
  //   const queryBuilder = this.dataSource.createQueryBuilder(
  //     Submission,
  //     'submission',
  //   );
  //
  //   const joinMap: Record<string, string> = {
  //     submissionProblem: 'submission.problem',
  //     submissionContestParticipation: 'submission.user',
  //   };
  //
  //   for (const join of joins) {
  //     if (joinMap[join]) {
  //       queryBuilder.leftJoin(joinMap[join], join);
  //     }
  //   }
  //
  //   return queryBuilder;
  // }
}
