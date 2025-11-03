// NestJS
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

// Third-party
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

// Shared/Common
import { CACHE_TTL } from 'src/common/constants/cache.constants';
import { REDIS } from '../../shared/redis/redis.module';
import { Base64Util } from '../../shared/util/base64.util';
import { TimeUtil } from '../../shared/util/time.util';

// Relative imports
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { ContestParticipation } from '../contests/entities/contest-participations.entity';
import { Contest } from '../contests/entities/contest.entity';
import {
  Judge0BatchResponse,
  Judge0Response,
  Judge0SubmissionPayload,
} from '../judge0/judge0.interface';
import { Judge0Service } from '../judge0/judge0.service';
import { isMultiFileProgram } from '../language/constants/language.constants';
import { Language } from '../language/entities/language.entity';
import { LtiLaunchSession } from '../lti/entities/lti-launch-session.entity';
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
import { GradingStrategyService } from './strategies/grading-strategy.service';

@Injectable()
export class SubmissionService {
  private static readonly REDIS_TTL_SECONDS = CACHE_TTL.ONE_HOUR;
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
    private readonly gradingStrategyService: GradingStrategyService,
    @Inject(REDIS)
    private readonly redis: Redis,
  ) {}

  async executeTestRun(
    dto: CreateSubmissionDto,
    file?: Express.Multer.File,
  ): Promise<{ submissionId: string }> {
    const problem = await this.findProblemOrFail(dto.problemId);
    const submissionId = uuidv4();
    return this.submitBatch(submissionId, dto, problem, false, file);
  }

  async submitForGrading(
    dto: CreateSubmissionDto,
    user: JwtPayload,
    file?: Express.Multer.File,
  ): Promise<{ submissionId: string }> {
    const problem = await this.findProblemOrFail(dto.problemId);
    const savedUser = await this.findUserOrFail(user.userId);
    const language = await this.findLanguageOrFail(dto.languageId);

    // Validate submission against problem's strategy
    await this.gradingStrategyService.validateSubmission(
      user.userId,
      dto.problemId,
      user.ltiSessionId,
    );

    let fileUrl: string | null = null;
    const isMultiFile = isMultiFileProgram(dto.languageId);
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
        ltiLaunchSession: user.ltiSessionId
          ? ({ id: user.ltiSessionId } as LtiLaunchSession)
          : null,
      }),
    );

    return this.submitBatch(submission.id, dto, problem, true, file);
  }
  //
  // async submitToContest(
  //   contestId: string,
  //   createSubmissionDto: CreateSubmissionDto,
  //   user: JwtPayload,
  //   file?: Express.Multer.File,
  // ): Promise<{ submissionId: string }> {
  //   const savedUser = await this.findUserOrFail(user.userId);
  //   // Validate contest
  //   const contest = await this.contestRepository.findOne({
  //     where: { id: contestId },
  //     relations: ['contestProblems', 'contestProblems.problem'],
  //   });
  //   if (!contest) throw new NotFoundException('Contest not found');
  //
  //   const now = new Date();
  //   if (now < contest.startTime)
  //     throw new BadRequestException('Contest not started yet');
  //   if (now > contest.endTime)
  //     throw new BadRequestException('Contest already ended');
  //
  //   // Validate participation
  //   const contestParticipation = await this.contestParticipationRepo.findOne({
  //     where: { id: createSubmissionDto.contestParticipationId },
  //   });
  //   if (!contestParticipation) {
  //     throw new NotFoundException('User is not registered in the contest');
  //   }
  //
  //   // Validate problem in contest
  //   const problem = await this.findProblemOrFail(createSubmissionDto.problemId);
  //   const contestProblem = contest.contestProblems.find(
  //     (cp) => cp.problem.id === createSubmissionDto.problemId,
  //   );
  //   if (!contestProblem) {
  //     throw new BadRequestException('Problem not in contest');
  //   }
  //   const language = await this.findLanguageOrFail(
  //     createSubmissionDto.languageId,
  //   );
  //
  //   // All validations passed, proceed to create submission
  //   let fileUrl: string | null = null;
  //   const isMultiFile = createSubmissionDto.languageId === 89;
  //   if (isMultiFile) {
  //     fileUrl = await this.saveSubmitFile(user.userId, problem.id, file);
  //   }
  //
  //   const submission = await this.submissionRepository.save(
  //     this.submissionRepository.create({
  //       sourceCode: createSubmissionDto.sourceCode,
  //       user: savedUser,
  //       problem,
  //       contestParticipation,
  //       language,
  //       fileUrl,
  //     }),
  //   );
  //
  //   return this.submitBatch(
  //     submission.id,
  //     createSubmissionDto,
  //     problem,
  //     true,
  //     file,
  //   );
  // }

  // async getDetailSubmissionById(
  //   submissionId: string,
  //   user: JwtPayload,
  // ): Promise<SubmissionDetailDto> {
  //   const submission = await this.submissionRepository.findOne({
  //     where: { id: submissionId },
  //     relations: ['user', 'language'],
  //   });
  //   if (!submission) throw new NotFoundException('Submission not found');
  //   if (
  //     submission.user.id !== user.userId &&
  //     !(
  //       user.roles.includes(RoleEnum.ADMIN) ||
  //       user.roles.includes(RoleEnum.INSTRUCTOR)
  //     )
  //   ) {
  //     throw new HttpException(
  //       'You are not allowed to view this submission',
  //       HttpStatus.FORBIDDEN,
  //     );
  //   }
  //
  //   return {
  //     id: submissionId,
  //     status: submission.status,
  //     score: submission.score,
  //     runtime: submission.runtime,
  //     memory: submission.memory,
  //     sourceCode: submission.sourceCode,
  //     createdAt: submission.createdAt,
  //     totalTests: submission.totalTests,
  //     passedTests: submission.passedTests,
  //     language: submission.language,
  //     contestParticipationId: submission.contestParticipation?.id,
  //     resultDescription: submission.resultDescription,
  //     user: {
  //       id: submission.user.id,
  //       firstName: submission.user.firstName ? submission.user.firstName : '',
  //       lastName: submission.user.lastName ? submission.user.lastName : '',
  //     },
  //   };
  // }

  // async getListSubmissionOfUserInOneProblem(
  //   problemId: string,
  //   user: JwtPayload,
  //   query: SubmissionsCursorQueryDto,
  // ) {
  //   return this.findSubmissionWithPagination(query, {
  //     joins: [],
  //     filterFn: (qb) => this.applyFubmissionFilter(qb, currentUser.courseId!),
  //   });
  // }

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
    const isMultiFile = isMultiFileProgram(dto.languageId);
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
    const stderr = Base64Util.decodeBase64(judge0Response.stderr);
    const expectedOutput = Base64Util.decodeBase64(
      judge0Response.expected_output,
    );

    return {
      stdout,
      time: judge0Response.time,
      memory: judge0Response.memory,
      status: judge0StatusMap[judge0Response.status.id],
      stderr,
      token: judge0Response.token,
      expectedOutput,
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
        firstNonAcceptedResult ??= result;
      }
    }

    return {
      overallStatus,
      passedTests,
      totalTests,
      sumRuntime,
      sumMemory,
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
}
