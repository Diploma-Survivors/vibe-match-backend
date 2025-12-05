import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContestParticipation } from '../../contests/entities/contest-participations.entity';
import { ContestProblem } from '../../contests/entities/contest-problem.entity';
import { LtiLaunchSession } from '../../lti/entities/lti-launch-session.entity';
import { Problem } from '../../problems/entities/problem.entity';
import { Submission } from '../entities/submission.entity';
import { SubmissionStrategyEnum } from '../enums/submission-strategy.enum';
import { GradingStrategyFactory } from './grading-strategy.factory';
import { ProblemStatus } from '../../contests/enums/problem-status.enum';
import { SubmissionStatus } from '../enums/submission-status.enum';
import {
  StrategyContext,
  StrategyResult,
} from './interfaces/grading-strategy.interface';

@Injectable()
export class GradingStrategyService {
  private readonly logger = new Logger(GradingStrategyService.name);

  constructor(
    private readonly strategyFactory: GradingStrategyFactory,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(Problem)
    private readonly problemRepository: Repository<Problem>,
    @InjectRepository(LtiLaunchSession)
    private readonly ltiSessionRepository: Repository<LtiLaunchSession>,
    @InjectRepository(ContestParticipation)
    private readonly contestParticipationRepository: Repository<ContestParticipation>,
    @InjectRepository(ContestProblem)
    private readonly contestProblemRepository: Repository<ContestProblem>,
  ) {}

  async validateSubmission(
    userId: number,
    problemId: number,
    ltiSessionId?: string,
  ): Promise<void> {
    const problem = await this.problemRepository.findOne({
      where: { id: problemId },
    });

    if (!problem) {
      throw new NotFoundException(`Problem ${problemId} not found`);
    }

    const strategyType =
      problem.submissionStrategy || SubmissionStrategyEnum.BEST_SCORE;
    const strategy = this.strategyFactory.create(strategyType);

    // Get resourceLinkId for activity-based counting
    let resourceLinkId: string | undefined;
    if (ltiSessionId) {
      const session = await this.ltiSessionRepository.findOne({
        where: { id: ltiSessionId },
        select: ['resourceLinkId'],
      });
      resourceLinkId = session?.resourceLinkId;
    }

    const previousSubmissions = await this.findPreviousSubmissions(
      userId,
      problemId,
      ltiSessionId,
    );

    const context: StrategyContext = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      submission: null as any,
      previousSubmissions,
      problem,
      ltiSession: null,
    };

    this.logger.warn(`🔍 VALIDATION (Per-Activity):
        User: ${userId}
        Problem: ${problemId}  
        LTI Session: ${ltiSessionId || 'NONE'}
        Resource Link: ${resourceLinkId || 'NONE'}
        Previous Count: ${previousSubmissions.length}
        Max Attempts: ${problem.maxAttempts}
      `);

    await strategy.validateSubmission(context);
  }

  async executeStrategy(submissionId: number): Promise<StrategyResult | null> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: [
        'user',
        'problem',
        'ltiLaunchSession',
        'contestParticipation',
        'contestParticipation.contest',
      ],
    });

    if (!submission) {
      this.logger.warn(`Submission ${submissionId} not found`);
      return null;
    }

    // Priority: Contest strategy > Problem strategy > Default
    let strategyType = SubmissionStrategyEnum.BEST_SCORE;
    let strategySource = 'default';

    if (submission.contestParticipation?.contest?.submissionStrategy) {
      strategyType = submission.contestParticipation.contest.submissionStrategy;
      strategySource = `Contest ${submission.contestParticipation.contest.id}`;
    } else if (submission.problem.submissionStrategy) {
      strategyType = submission.problem.submissionStrategy;
      strategySource = `Problem ${submission.problem.id}`;
    }

    const strategy = this.strategyFactory.create(strategyType);

    const previousSubmissions = await this.findPreviousSubmissions(
      submission.user.id,
      submission.problem.id,
      submission.ltiLaunchSession?.id,
      submission.id,
    );

    const context: StrategyContext = {
      submission,
      previousSubmissions,
      problem: submission.problem,
      ltiSession: submission.ltiLaunchSession || null,
    };

    this.logger.log(
      `Executing ${strategyType} strategy (from ${strategySource}) for submission ${submissionId}`,
    );

    return strategy.execute(context);
  }

  async executeContestStrategy(contestParticipationId: number): Promise<{
    userScore: number;
    maxScore: number;
    problemBreakdown: Array<{
      problemId: number;
      score: number;
      maxScore: number;
      status: ProblemStatus;
    }>;
  }> {
    // Get contest participation with full relations
    const participation = await this.contestParticipationRepository.findOne({
      where: { id: contestParticipationId },
      relations: ['contest', 'user', 'submissions', 'submissions.problem'],
    });

    if (!participation) {
      throw new NotFoundException(
        `Contest participation ${contestParticipationId} not found`,
      );
    }

    // Get all contest problems
    const contestProblems = await this.contestProblemRepository.find({
      where: { contestId: participation.contest.id },
      relations: ['problem'],
    });

    const contestStrategy =
      participation.contest.submissionStrategy ||
      SubmissionStrategyEnum.BEST_SCORE;

    this.logger.log(
      `Calculating contest score for participation ${contestParticipationId} using ${contestStrategy} strategy`,
    );

    let totalScore = 0;
    let totalMaxScore = 0;
    const problemBreakdown: Array<{
      problemId: number;
      score: number;
      maxScore: number;
      status: ProblemStatus;
    }> = [];

    // Track all submission IDs to mark
    const submissionsToMark: number[] = [];
    const submissionsToUnmark: number[] = [];

    // For each problem in the contest, calculate the user's score using the strategy
    for (const contestProblem of contestProblems) {
      const problemId = contestProblem.problemId;
      const problemMaxScore = contestProblem.score; // Use contest_problems.score, not problem.maxScore

      // Get all submissions for this problem within this contest participation
      const problemSubmissions = participation.submissions.filter(
        (s) => s.problem.id === problemId,
      );

      let problemScore = 0;
      let problemStatus = ProblemStatus.UNATTEMPTED;

      if (problemSubmissions.length > 0) {
        // Apply contest strategy using the factory pattern
        const strategy = this.strategyFactory.create(contestStrategy);

        // Create context for strategy execution
        // Note: We use the most recent submission as the "current" submission
        const latestSubmission = problemSubmissions.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0];

        const previousSubmissions = problemSubmissions.filter(
          (s) => s.id !== latestSubmission.id,
        );

        const context: StrategyContext = {
          submission: latestSubmission,
          previousSubmissions,
          problem: contestProblem.problem,
          ltiSession: null,
        };

        // Calculate score using the strategy
        problemScore = await strategy.calculateScore(context);

        // Cap the score at the contest's max score for this problem
        problemScore = Math.min(problemScore, problemMaxScore);

        // Determine status
        const submissionStatuses = problemSubmissions.map((s) => s.status);
        const hasAccepted = submissionStatuses.includes(
          SubmissionStatus.ACCEPTED,
        );
        problemStatus = hasAccepted
          ? ProblemStatus.SOLVED
          : ProblemStatus.ATTEMPTED;

        // Determine which submissions are used for final score based on strategy
        const scoredSubmissionIds = this.determineScoredSubmissions(
          problemSubmissions,
          contestStrategy,
        );

        submissionsToMark.push(...scoredSubmissionIds);

        // Mark other submissions as NOT used
        const unscoredIds = problemSubmissions
          .filter((s) => !scoredSubmissionIds.includes(s.id))
          .map((s) => s.id);
        submissionsToUnmark.push(...unscoredIds);
      }

      totalScore += problemScore;
      totalMaxScore += problemMaxScore;

      problemBreakdown.push({
        problemId,
        score: problemScore,
        maxScore: problemMaxScore,
        status: problemStatus,
      });
    }

    // Update isUsedForFinalScore field for all submissions in this participation
    if (submissionsToMark.length > 0) {
      await this.submissionRepository.update(submissionsToMark, {
        isUsedForFinalScore: true,
      });
      this.logger.log(
        `Marked ${submissionsToMark.length} submissions as used for final score`,
      );
    }

    if (submissionsToUnmark.length > 0) {
      await this.submissionRepository.update(submissionsToUnmark, {
        isUsedForFinalScore: false,
      });
      this.logger.log(
        `Unmarked ${submissionsToUnmark.length} submissions as not used for final score`,
      );
    }

    this.logger.log(
      `Contest score calculated for participation ${contestParticipationId}: ${totalScore}/${totalMaxScore}`,
    );

    return {
      userScore: totalScore,
      maxScore: totalMaxScore,
      problemBreakdown,
    };
  }

  private determineScoredSubmissions(
    problemSubmissions: Submission[],
    strategy: SubmissionStrategyEnum,
  ): number[] {
    if (problemSubmissions.length === 0) {
      return [];
    }

    switch (strategy) {
      case SubmissionStrategyEnum.SINGLE_SUBMISSION:
        // Only one submission should exist
        return [problemSubmissions[0].id];

      case SubmissionStrategyEnum.BEST_SCORE: {
        // Find submission with highest score
        const bestSubmission = problemSubmissions.reduce((best, current) =>
          (current.score || 0) > (best.score || 0) ? current : best,
        );
        return [bestSubmission.id];
      }

      case SubmissionStrategyEnum.LATEST_SCORE: {
        // Find most recent submission
        const latestSubmission = problemSubmissions.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0];
        return [latestSubmission.id];
      }

      case SubmissionStrategyEnum.AVERAGE_SCORE:
        // All submissions are used
        return problemSubmissions.map((s) => s.id);

      default: {
        // Default to best score
        const defaultBest = problemSubmissions.reduce((best, current) =>
          (current.score || 0) > (best.score || 0) ? current : best,
        );
        return [defaultBest.id];
      }
    }
  }

  private async findPreviousSubmissions(
    userId: number,
    problemId: number,
    ltiSessionId?: string,
    excludeSubmissionId?: number,
  ): Promise<Submission[]> {
    const query = this.submissionRepository
      .createQueryBuilder('submission')
      .leftJoin('submission.ltiLaunchSession', 'session')
      .where('submission.user_id = :userId', { userId })
      .andWhere('submission.problem_id = :problemId', { problemId })
      .orderBy('submission.created_at', 'ASC');

    if (ltiSessionId) {
      const currentSession = await this.ltiSessionRepository.findOne({
        where: { id: ltiSessionId },
        select: ['resourceLinkId'],
      });

      if (currentSession?.resourceLinkId) {
        query.andWhere('session.resource_link_id = :resourceLinkId', {
          resourceLinkId: currentSession.resourceLinkId,
        });
      }
    }

    if (excludeSubmissionId) {
      query.andWhere('submission.id != :excludeSubmissionId', {
        excludeSubmissionId,
      });
    }

    return query.getMany();
  }
}
