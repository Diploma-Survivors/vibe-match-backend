import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../entities/submission.entity';
import { Problem } from '../../problems/entities/problem.entity';
import { LtiLaunchSession } from '../../lti/entities/lti-launch-session.entity';
import { GradingStrategyFactory } from './grading-strategy.factory';
import {
  StrategyContext,
  StrategyResult,
} from './interfaces/grading-strategy.interface';
import { SubmissionStrategyEnum } from '../enums/submission-strategy.enum';

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

  async executeStrategy(submissionId: string): Promise<StrategyResult | null> {
    const submission = await this.submissionRepository.findOne({
      where: { id: Number.parseInt(submissionId) },
      relations: ['user', 'problem', 'ltiLaunchSession'],
    });

    if (!submission) {
      this.logger.warn(`Submission ${submissionId} not found`);
      return null;
    }

    const strategyType =
      submission.problem.submissionStrategy ||
      SubmissionStrategyEnum.BEST_SCORE;
    const strategy = this.strategyFactory.create(strategyType);

    const previousSubmissions = await this.findPreviousSubmissions(
      submission.user.id,
      submission.problem.id,
      submission.ltiLaunchSession?.id,
      submission.id.toString(),
    );

    const context: StrategyContext = {
      submission,
      previousSubmissions,
      problem: submission.problem,
      ltiSession: submission.ltiLaunchSession || null,
    };

    this.logger.log(
      `Executing ${strategyType} strategy (from Problem ${submission.problem.id}) for submission ${submissionId}`,
    );

    return strategy.execute(context);
  }

  private async findPreviousSubmissions(
    userId: number,
    problemId: number,
    ltiSessionId?: string,
    excludeSubmissionId?: string,
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
      query.andWhere('submission.submission_id != :excludeSubmissionId', {
        excludeSubmissionId,
      });
    }

    return query.getMany();
  }
}
