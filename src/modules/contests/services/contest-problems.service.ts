// NestJS
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Third-party
import { Repository } from 'typeorm';

// Relative imports
import { ContestProblem } from '../entities/contest-problem.entity';
import {
  ContestProblemDto,
  GetContestProblemsResponseDto,
} from '../dto/get-contest-problems-response.dto';
import { GetContestProblemDetailResponseDto } from '../dto/get-contest-problem-detail-response.dto';

@Injectable()
export class ContestProblemsService {
  constructor(
    @InjectRepository(ContestProblem)
    private readonly contestProblemRepository: Repository<ContestProblem>,
  ) {}

  async getContestProblems(
    contestId: number,
  ): Promise<GetContestProblemsResponseDto> {
    const contestProblems = await this.contestProblemRepository.find({
      where: { contestId },
      relations: ['problem'],
      order: { score: 'ASC' },
    });

    const problems: ContestProblemDto[] = contestProblems.map((cp) => ({
      id: cp.problem.id,
      title: cp.problem.title,
      maxScore: cp.score,
      difficulty: cp.problem.difficulty,
      timeLimitMs: cp.problem.timeLimitMs,
      memoryLimitKb: cp.problem.memoryLimitKb,
    }));

    return {
      problems,
      totalProblems: problems.length,
    };
  }

  async getContestProblemDetail(
    contestId: number,
    problemId: number,
  ): Promise<GetContestProblemDetailResponseDto> {
    const contestProblem = await this.contestProblemRepository.findOne({
      where: { contestId, problemId },
      relations: ['problem', 'problem.testcaseSamples'],
    });

    if (!contestProblem) {
      throw new NotFoundException(
        'Problem not found in this contest or contest does not exist',
      );
    }

    const problem = contestProblem.problem;

    return {
      id: problem.id,
      title: problem.title,
      maxScore: contestProblem.score,
      problemDescription: problem.description,
      inputDescription: problem.inputDescription,
      outputDescription: problem.outputDescription,
      difficulty: problem.difficulty,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitKb: problem.memoryLimitKb,
      testcaseSamples: problem.testcaseSamples.map((sample) => ({
        input: sample.input,
        output: sample.output,
      })),
      maxAttempts: problem.maxAttempts,
      showSubmissionCount: problem.showSubmissionCount,
    };
  }
}
