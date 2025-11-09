// NestJS
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Third-party
import { Repository } from 'typeorm';

// Shared/Common
import { CACHE_TTL } from 'src/common/constants/cache.constants';
import { Cacheable } from 'src/common/decorators/cacheable.decorator';

// Relative imports
import { Submission } from '../../submission/entities/submission.entity';
import { SubmissionStatus } from '../../submission/enums/submission-status.enum';

export interface ProblemStatistics {
  totalSubmissions: number;
  acceptedSubmissions: number;
  wrongAnswerSubmissions: number;
  timeLimitExceededSubmissions: number;
  memoryLimitExceededSubmissions: number;
  runtimeErrorSubmissions: number;
  compilationErrorSubmissions: number;
  acceptanceRate: number;
}

/**
 * Service responsible for calculating and caching problem statistics
 *
 * @example
 * const stats = await statisticsService.getStatistics(problemId);
 */
@Injectable()
export class ProblemStatisticsService {
  private readonly logger = new Logger(ProblemStatisticsService.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
  ) {}

  @Cacheable({
    key: (problemId: number) => `problem:${problemId}:statistics`,
    ttl: CACHE_TTL.FIVE_MINUTES,
  })
  async getStatistics(problemId: number): Promise<ProblemStatistics> {
    const submissions = await this.submissionRepository.find({
      where: { problem: { id: problemId } },
      select: ['status'],
    });

    return this.calculateStatistics(submissions);
  }

  private calculateStatistics(submissions: Submission[]): ProblemStatistics {
    const stats: ProblemStatistics = {
      totalSubmissions: submissions.length,
      acceptedSubmissions: 0,
      wrongAnswerSubmissions: 0,
      timeLimitExceededSubmissions: 0,
      memoryLimitExceededSubmissions: 0,
      runtimeErrorSubmissions: 0,
      compilationErrorSubmissions: 0,
      acceptanceRate: 0,
    };

    // Count each status type
    for (const submission of submissions) {
      switch (submission.status) {
        case SubmissionStatus.ACCEPTED:
          stats.acceptedSubmissions++;
          break;
        case SubmissionStatus.WRONG_ANSWER:
          stats.wrongAnswerSubmissions++;
          break;
        case SubmissionStatus.TIME_LIMIT_EXCEEDED:
          stats.timeLimitExceededSubmissions++;
          break;
        case SubmissionStatus.RUNTIME_ERROR:
          stats.runtimeErrorSubmissions++;
          break;
        case SubmissionStatus.COMPILATION_ERROR:
          stats.compilationErrorSubmissions++;
          break;
      }
    }

    // Calculate acceptance rate
    stats.acceptanceRate =
      stats.totalSubmissions > 0
        ? Math.round((stats.acceptedSubmissions / stats.totalSubmissions) * 100)
        : 0;

    return stats;
  }

  @Cacheable({
    key: (problemId: number) => `problem:${problemId}:quick-stats`,
    ttl: CACHE_TTL.FIVE_MINUTES,
  })
  async getQuickStatistics(
    problemId: number,
  ): Promise<{ total: number; accepted: number; rate: number }> {
    const result = (await this.submissionRepository
      .createQueryBuilder('submission')
      .select('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN submission.status = :status THEN 1 ELSE 0 END)',
        'accepted',
      )
      .where('submission.problemId = :problemId', { problemId })
      .setParameter('status', SubmissionStatus.ACCEPTED)
      .getRawOne()) as { total: string; accepted: string };

    const total = Number.parseInt(result.total) || 0;
    const accepted = Number.parseInt(result.accepted) || 0;
    const rate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    return { total, accepted, rate };
  }

  async getBatchStatistics(
    problemIds: number[],
  ): Promise<Map<number, ProblemStatistics>> {
    if (problemIds.length === 0) {
      return new Map();
    }

    const submissions = await this.submissionRepository
      .createQueryBuilder('submission')
      .select(['submission.problemId', 'submission.status'])
      .where('submission.problemId IN (:...problemIds)', { problemIds })
      .getMany();

    // Group submissions by problem ID
    const submissionsByProblem = new Map<number, Submission[]>();
    for (const submission of submissions) {
      const problemId = submission.problem?.id;
      if (problemId) {
        if (!submissionsByProblem.has(problemId)) {
          submissionsByProblem.set(problemId, []);
        }
        submissionsByProblem.get(problemId)!.push(submission);
      }
    }

    // Calculate statistics for each problem
    const statsMap = new Map<number, ProblemStatistics>();
    for (const problemId of problemIds) {
      const problemSubmissions = submissionsByProblem.get(problemId) || [];
      statsMap.set(problemId, this.calculateStatistics(problemSubmissions));
    }

    return statsMap;
  }
}
