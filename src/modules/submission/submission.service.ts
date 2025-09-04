import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { TestResultDto } from '../problems/testcases/dto/run-testcase-result.response.dto';
import { CreateTestCaseDto } from '../testcase/dto/create-testcase.dto';
import { judge0StatusMap, SubmissionStatus } from './enums/submission.enum';
import { SubmissionResultDto } from './dto/submission.response.dto';
import { Repository } from 'typeorm';
import { Problem } from '../problem/entities/problem.entity';
import { Submission } from './entities/submission.entity';
import { Judge0Service } from '../judge0/judge0.service';
import {
  Judge0Response,
  Judge0SubmissionPayload,
} from '../judge0/judge0.interface';

@Injectable()
export class SubmissionService {
  private readonly logger = new Logger(SubmissionService.name);

  constructor(
    @InjectRepository(SubmissionRepository)
    private readonly submissionRepository: SubmissionRepository,
    private readonly judge0Service: Judge0Service,
  ) {}

  async runCode(
    dto: CreateSubmissionDto,
    file?: Express.Multer.File,
  ): Promise<SubmissionResultDto> {
    const problem = await this.problemRepository.findOne({
      where: { id: dto.problemId },
    });
    if (!problem) {
      throw new HttpException('Problem not found', HttpStatus.NOT_FOUND);
    }

    let passedCount = 0;

    const results: TestResultDto[] = await Promise.all(
      dto.testCases.map(async (testCase) => {
        const judge0Response = await this.executeTestCase(
          dto,
          testCase,
          problem,
          file,
        );

        const actualOutput =
          this.judge0Service.decodeBase64(judge0Response.stdout) || '';
        const expectedOutput = testCase.expectedOutput || '';

        if (actualOutput === expectedOutput) {
          passedCount++;
        }

        return this.buildTestResult(testCase, judge0Response);
      }),
    );

    return this.buildSubmissionResult(
      problem.testCases.length,
      passedCount,
      results,
      problem.problemProperties.score,
    );
  }

  private async executeTestCase(
    dto: CreateSubmissionDto,
    testCase: CreateTestCaseDto,
    problem: Problem,
    file?: Express.Multer.File,
  ) {
    const payload = this.buildJudge0Payload(dto, testCase, problem, file);
    return this.judge0Service.createSubmission(payload);
  }

  private buildJudge0Payload(
    dto: CreateSubmissionDto,
    testCase: CreateTestCaseDto,
    problem: Problem,
    file?: Express.Multer.File,
  ): Judge0SubmissionPayload {
    const payload: Judge0SubmissionPayload = {
      language_id: dto.languageId,
      stdin: this.judge0Service.encodeBase64(testCase.input),
      redirect_stderr_to_stdout: true,
      cpu_time_limit: problem.problemProperties.timeLimit,
      memory_limit: problem.problemProperties.memoryLimit,
    };

    // Handle multi-file submissions
    if (dto.languageId === 89) {
      if (!file) {
        throw new HttpException(
          'Multi-file program requires additional files (Base64 ZIP)',
          HttpStatus.BAD_REQUEST,
        );
      }
      payload.additional_files = file.buffer.toString('base64');
      payload.source_code = '';
    } else {
      if (!dto.sourceCode) {
        throw new HttpException(
          'Single-file program requires source code',
          HttpStatus.BAD_REQUEST,
        );
      }
      payload.source_code = this.judge0Service.encodeBase64(dto.sourceCode);
    }

    return payload;
  }

  private buildTestResult(
    testCase: CreateTestCaseDto,
    judge0Response: Judge0Response,
  ): TestResultDto {
    const actualOutput =
      this.judge0Service.decodeBase64(judge0Response.stdout) || '';
    const expectedOutput = testCase.expectedOutput || '';

    return {
      input: testCase.input,
      expectedOutput,
      actualOutput,
      runtime: judge0Response.time
        ? `${(parseFloat(judge0Response.time) * 1000).toFixed(0)}ms`
        : '0ms',
      memory: judge0Response.memory
        ? `${(judge0Response.memory / 1024).toFixed(2)}MB`
        : '0MB',
      status: judge0Response.status,
      errorMessage:
        this.judge0Service.decodeBase64(judge0Response.compile_output) ||
        this.judge0Service.decodeBase64(judge0Response.stderr) ||
        undefined,
    };
  }

  private buildSubmissionResult(
    totalTests: number,
    passedTests: number,
    results: TestResultDto[],
    maxScore: number,
  ): SubmissionResultDto {
    const overallStatus = this.determineSubmissionStatus(results);
    const overallScore = (maxScore * passedTests) / totalTests;

    return {
      status: overallStatus,
      totalTests,
      passedTests,
      results,
      score: Math.round(overallScore * 100) / 100, // Round to 2 decimal places
    };
  }

  private determineSubmissionStatus(
    results: TestResultDto[],
  ): SubmissionStatus {
    for (const result of results) {
      if (result.status.id !== 3) {
        return (
          judge0StatusMap[result.status.id] ?? SubmissionStatus.UNKNOWN_ERROR
        );
      }
    }
    return SubmissionStatus.ACCEPTED;
  }
}
