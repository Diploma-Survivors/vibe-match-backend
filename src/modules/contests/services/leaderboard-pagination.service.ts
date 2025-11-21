// NestJS
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Third-party
import { Repository } from 'typeorm';

// Shared/Common
import { decodeCursor, encodeCursor } from 'src/common/utils/cursor-query.util';
import { PaginationCursorResponseDto } from 'src/common/pagination/dtos/pagination-cursor-response.dto';

// Relative imports
import { ContestParticipation } from '../entities/contest-participations.entity';
import { Submission } from '../../submission/entities/submission.entity';
import { SubmissionStatus } from '../../submission/enums/submission-status.enum';
import { ContestProblem } from '../entities/contest-problem.entity';
import { LeaderboardRankingDto } from '../dto/leaderboard-response.dto';
import { LeaderboardCursorQueryDto } from '../dto/leaderboard-cursor-query.dto';
import { ProblemResultDto } from '../dto/problem-result.dto';
import { ProblemLeadingStatus } from '../enums/problem-leading-status.enum';

// use entity types (Submission, ContestProblem, ContestParticipation) for clarity
/**
 * Service for leaderboard pagination with database-level ranking
 */
@Injectable()
export class LeaderboardPaginationService {
  private readonly MAX_PAGE_SIZE = 100;
  private readonly logger = new Logger(LeaderboardPaginationService.name);

  constructor(
    @InjectRepository(ContestParticipation)
    private readonly contestParticipationRepository: Repository<ContestParticipation>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(ContestProblem)
    private readonly contestProblemRepository: Repository<ContestProblem>,
  ) {}

  /**
   * Calculate rankings with database-level pagination
   * Note: For accurate ranking, we fetch all data and paginate in memory
   * This is a compromise between performance and correctness
   */
  async calculateRankings(
    contestId: number,
    query: LeaderboardCursorQueryDto,
  ): Promise<PaginationCursorResponseDto<LeaderboardRankingDto>> {
    const { limit, isBackward } = this.validatePagination(query);

    // For leaderboard, we need to rank all participants first, then paginate
    // This ensures accurate ranking but may not scale for very large contests
    const allRankings = await this.getAllRankings(contestId);

    // Apply pagination to the ranked results
    return this.paginateRankings(allRankings, query, limit, isBackward);
  }

  private async getAllRankings(
    contestId: number,
  ): Promise<LeaderboardRankingDto[]> {
    // First, get all contest problems to know what problems exist
    const contestProblems = await this.contestProblemRepository.find({
      where: { contestId },
    });

    const problemIds: number[] = contestProblems.map((cp) => cp.problemId);

    // Get all submissions for this contest (entity rows)
    const submissions = await this.submissionRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.contestParticipation', 'cp')
      .where('cp.contestId = :contestId', { contestId })
      .orderBy('s.createdAt', 'ASC')
      .getMany();

    // Group submissions by participant and problem
    const participantSubmissions = new Map<number, Map<number, Submission[]>>();
    submissions.forEach((sub) => {
      const participantId = sub.contestParticipation?.id ?? 0;
      const problemId = sub.problemId;
      if (!participantSubmissions.has(participantId)) {
        participantSubmissions.set(
          participantId,
          new Map<number, Submission[]>(),
        );
      }
      const byProblem = participantSubmissions.get(participantId)!;
      if (!byProblem.has(problemId)) byProblem.set(problemId, []);
      byProblem.get(problemId)!.push(sub);
    });

    // Get participant data
    const rawResults = await this.contestParticipationRepository
      .createQueryBuilder('cp')
      .leftJoinAndSelect('cp.user', 'u')
      .where('cp.contestId = :contestId', { contestId })
      .orderBy('cp.finalScore', 'DESC')
      .addOrderBy('u.lastName', 'ASC')
      .addOrderBy('u.firstName', 'ASC')
      .addOrderBy('cp.id', 'ASC')
      .getMany();

    // Calculate rankings with proper tie handling
    const rankings: LeaderboardRankingDto[] = [];
    let currentRank = 1;
    let previousScore = -1;

    for (let i = 0; i < rawResults.length; i++) {
      const row = rawResults[i];
      const participantId = row.id;
      const participantSubs =
        participantSubmissions.get(participantId) ||
        new Map<number, Submission[]>();

      // Calculate total time
      const totalTime = this.calculateTotalTime(
        row.startTime,
        row.endTime,
        participantSubs,
      );

      // Calculate problem results
      const problemResults = problemIds.map((problemId) => {
        const problemSubs = participantSubs.get(problemId) || [];
        return this.calculateProblemResult(problemId, problemSubs);
      });

      // Handle ranking with ties
      const currentScore = Number(row.finalScore ?? 0);
      if (currentScore !== previousScore) {
        currentRank = i + 1;
        previousScore = currentScore;
      }

      rankings.push({
        rank: currentRank,
        user: {
          id: row.user?.id ?? 0,
          firstName: row.user?.firstName ?? '',
          lastName: row.user?.lastName ?? '',
          email: row.user?.email ?? '',
        },
        totalScore: currentScore,
        totalTime,
        problemResults,
      });
    }

    return rankings;
  }

  private paginateRankings(
    rankings: LeaderboardRankingDto[],
    query: LeaderboardCursorQueryDto,
    limit: number,
    isBackward: boolean,
  ): PaginationCursorResponseDto<LeaderboardRankingDto> {
    let startIndex = 0;

    if (query.after) {
      const afterRank = decodeCursor<{ rank: number }>(query.after).rank;
      startIndex = rankings.findIndex((item) => item.rank > afterRank);
    } else if (query.before) {
      const beforeRank = decodeCursor<{ rank: number }>(query.before).rank;
      startIndex = rankings.findIndex((item) => item.rank >= beforeRank);
      if (startIndex === -1) startIndex = rankings.length;
    }

    if (isBackward) {
      const endIndex = startIndex;
      startIndex = Math.max(0, endIndex - limit);
    }

    const paginatedRankings = rankings.slice(startIndex, startIndex + limit);

    if (isBackward) {
      paginatedRankings.reverse();
    }

    const hasNextPage = !isBackward && startIndex + limit < rankings.length;
    const hasPreviousPage = isBackward && startIndex > 0;

    const edges = paginatedRankings.map((ranking) => ({
      node: ranking,
      cursor: encodeCursor({ rank: ranking.rank }),
    }));

    const startCursor = edges?.[0]?.cursor ?? null;
    const endCursor = edges?.at(-1)?.cursor ?? null;

    return {
      edges,
      pageInfos: {
        hasNextPage,
        hasPreviousPage,
        startCursor,
        endCursor,
      },
      totalCount: rankings.length,
    };
  }

  private validatePagination(query: LeaderboardCursorQueryDto) {
    const isBackward = !!query?.before && !query?.after;
    const limit = isBackward ? query?.last : query?.first;

    if (!limit || limit < 1 || limit > this.MAX_PAGE_SIZE) {
      throw new Error(`Limit must be between 1 and ${this.MAX_PAGE_SIZE}`);
    }

    if (query.after && query.before) {
      throw new Error('Cannot use both "after" and "before" cursors');
    }

    if ((query.after || query.before) && !(query.first || query.last)) {
      throw new Error('Cursor pagination requires "first" or "last" parameter');
    }

    return { limit, isBackward };
  }

  private calculateTotalTime(
    startTime: string | Date,
    endTime: string | Date | null,
    participantSubs: Map<number, Submission[]>,
  ): string {
    let endDate: Date;

    if (endTime) {
      // Contest has ended for this participant
      endDate = new Date(endTime);
    } else {
      // Find the last submission time
      let lastSubmissionTime: Date | null = null;
      for (const problemSubs of participantSubs.values()) {
        for (const sub of problemSubs) {
          const subTime = new Date(sub.createdAt);
          if (!lastSubmissionTime || subTime > lastSubmissionTime) {
            lastSubmissionTime = subTime;
          }
        }
      }
      endDate = lastSubmissionTime || new Date(startTime);
    }

    const startDate = new Date(startTime);
    const diffMs = endDate.getTime() - startDate.getTime();

    if (diffMs <= 0) return '00:00';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  private calculateProblemResult(
    problemId: number,
    problemSubs: Submission[],
  ): ProblemResultDto {
    if (problemSubs.length === 0) {
      return {
        problemId,
        score: 0,
        time: '00:00',
        status: ProblemLeadingStatus.NOT_ATTEMPTED,
      };
    }

    // Leading result is determined by the latest submission (not best)
    const latestSub = problemSubs[problemSubs.length - 1];
    const score = latestSub ? (latestSub.score ?? 0) : 0;

    // Time to latest submission
    let timeMs = 0;
    if (
      latestSub &&
      latestSub.createdAt &&
      latestSub.contestParticipation?.startTime
    ) {
      timeMs =
        new Date(latestSub.createdAt).getTime() -
        new Date(latestSub.contestParticipation.startTime).getTime();
    }

    const minutes = Math.floor(timeMs / (1000 * 60));
    const seconds = Math.floor((timeMs % (1000 * 60)) / 1000);
    const time = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Map submission status to ProblemLeadingStatus
    let status = ProblemLeadingStatus.NOT_ACCEPTED;
    if (latestSub) {
      const s = latestSub.status;
      if (s === SubmissionStatus.ACCEPTED)
        status = ProblemLeadingStatus.ACCEPTED;
      else if (s === SubmissionStatus.PENDING || s === SubmissionStatus.RUNNING)
        status = ProblemLeadingStatus.PENDING;
      else status = ProblemLeadingStatus.NOT_ACCEPTED;
    }

    return {
      problemId,
      score,
      time,
      status,
    };
  }
}
