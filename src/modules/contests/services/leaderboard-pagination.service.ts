// NestJS
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Third-party
import { Brackets, ObjectLiteral, Repository } from 'typeorm';

// Shared/Common
import { decodeCursor, encodeCursor } from 'src/common/utils/cursor-query.util';
import { PaginationCursorResponseDto } from 'src/common/pagination/dtos/pagination-cursor-response.dto';
import { MatchMode } from 'src/common/pagination/enums/match-mode.enum';

// Relative imports
import { ContestParticipation } from '../entities/contest-participations.entity';
import { LeaderboardRankingDto } from '../dto/leaderboard-response.dto';
import { LeaderboardCursorQueryDto } from '../dto/leaderboard-cursor-query.dto';
import { Contest } from '../entities/contest.entity';
import { ProblemStatus } from '../enums/problem-status.enum';

// use entity types (Submission, ContestProblem, ContestParticipation) for clarity
/**
 * Service for leaderboard pagination with database-level ranking
 */
@Injectable()
export class LeaderboardPaginationService {
  private readonly MAX_PAGE_SIZE = 100;

  constructor(
    @InjectRepository(ContestParticipation)
    private readonly contestParticipationRepository: Repository<ContestParticipation>,
  ) {}

  async calculateRankings(
    contestId: number,
    query: LeaderboardCursorQueryDto,
    contest: Contest,
  ): Promise<PaginationCursorResponseDto<LeaderboardRankingDto>> {
    const { limit, isBackward } = this.validatePagination(query);

    // Step 1: Query for IDs only (to handle pagination correctly with joins)
    const idQb = this.contestParticipationRepository
      .createQueryBuilder('cp')
      .select('cp.id', 'cp_id') // Explicit alias to ensure consistent column naming
      .leftJoin('cp.user', 'u')
      .where('cp.contestId = :contestId', { contestId })
      .andWhere("(u.roles = 'STUDENT')");

    const { filters, matchMode } = query;
    const conditions: { query: string; params: ObjectLiteral }[] = [];

    if (filters?.name) {
      conditions.push({
        query:
          '(u.firstName ILIKE :name OR u.lastName ILIKE :name OR u.email ILIKE :name)',
        params: { name: `%${filters.name}%` },
      });
    }

    if (conditions.length > 0) {
      idQb.andWhere(
        new Brackets((qb) => {
          conditions.forEach((condition, index) => {
            if (index === 0) {
              qb.where(condition.query, condition.params);
            } else {
              if (matchMode === MatchMode.ANY) {
                qb.orWhere(condition.query, condition.params);
              } else {
                qb.andWhere(condition.query, condition.params);
              }
            }
          });
        }),
      );
    }

    // Sort by finalScore using query sortOrder parameter
    // For DESC: highest scores first, nulls last
    // For ASC: lowest scores first, nulls last (treat null as highest value)
    // Sort by finalScore using query sortOrder parameter
    // For DESC: highest scores first, nulls last
    // For ASC: lowest scores first, nulls last (treat null as highest value)
    const sortDirection =
      query.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    idQb.orderBy('COALESCE(cp.finalScore, 0)', sortDirection);

    // Add computed columns for sorting
    idQb.addSelect(
      'CASE WHEN cp.finishedAt IS NULL THEN 1 ELSE 0 END',
      'status_order',
    );
    idQb.addSelect(
      'EXTRACT(EPOCH FROM (COALESCE(cp.finishedAt, NOW()) - cp.startTime))',
      'time_taken',
    );

    idQb.addOrderBy('status_order', 'ASC');
    idQb.addOrderBy('time_taken', 'ASC');

    // Tie-breaker
    idQb.addOrderBy('cp.id', 'ASC');

    // Use limit to fetch one extra result to check if there are more
    idQb.limit(limit + 1);

    // Handle cursor pagination for Step 1
    if (query.after) {
      const afterRank = decodeCursor<{ rank: number }>(query.after).rank;
      idQb.offset(afterRank);
    } else if (query.before) {
      const beforeRank = decodeCursor<{ rank: number }>(query.before).rank;
      const offset = Math.max(0, beforeRank - limit - 1);
      idQb.offset(offset);
    }

    const idResults = await idQb.getRawMany<{ cp_id: number }>();
    const ids = idResults.map((r) => r.cp_id);
    const hasMore = ids.length > limit;

    if (hasMore) {
      ids.pop(); // Remove the extra result
    }

    // Step 2: Fetch full entities for the IDs
    let results: ContestParticipation[] = [];
    if (ids.length > 0) {
      const qb = this.contestParticipationRepository
        .createQueryBuilder('cp')
        .leftJoinAndSelect('cp.user', 'u')
        .leftJoinAndSelect('cp.problemResults', 'pr')
        .leftJoinAndSelect('pr.problem', 'p')
        .whereInIds(ids);

      // We need to maintain the order from Step 1
      // Postgres doesn't guarantee order with WHERE IN, so we need to re-sort in memory or use CASE
      // Simpler to re-sort in memory since we have the IDs in order
      const unsortedResults = await qb.getMany();
      results = ids
        .map((id) => unsortedResults.find((r) => r.id === id))
        .filter((r) => !!r);
    }

    // Calculate starting rank based on cursor
    let startRank = 1;
    if (query.after) {
      const afterRank = decodeCursor<{ rank: number }>(query.after).rank;
      startRank = afterRank + 1;
    } else if (query.before) {
      const beforeRank = decodeCursor<{ rank: number }>(query.before).rank;
      startRank = Math.max(1, beforeRank - limit);
    }

    // Get total count separately (must also exclude admin users)
    const countQb = this.contestParticipationRepository
      .createQueryBuilder('cp')
      .leftJoin('cp.user', 'u')
      .where('cp.contestId = :contestId', { contestId })
      .andWhere("(u.roles = 'STUDENT')");

    if (conditions.length > 0) {
      countQb.andWhere(
        new Brackets((qb) => {
          conditions.forEach((condition, index) => {
            if (index === 0) {
              qb.where(condition.query, condition.params);
            } else {
              if (matchMode === MatchMode.ANY) {
                qb.orWhere(condition.query, condition.params);
              } else {
                qb.andWhere(condition.query, condition.params);
              }
            }
          });
        }),
      );
    }

    const count = await countQb.getCount();

    // Map to DTO
    const rankings: LeaderboardRankingDto[] = results.map((p, index) => {
      const rank = startRank + index;

      // Calculate total time based on contest type and participation state
      let totalTimeMs: number;
      const now = new Date();

      if (p.finishedAt) {
        // User finished the contest
        totalTimeMs = p.finishedAt.getTime() - p.startTime.getTime();
      } else if (contest.durationMinutes) {
        // Limited time contest - user hasn't finished
        const userDeadline = new Date(
          p.startTime.getTime() + contest.durationMinutes * 60 * 1000,
        );
        const contestEnded = now > contest.endTime;

        if (contestEnded) {
          // Contest has ended, use the earlier of user deadline or contest end time
          const effectiveDeadline =
            userDeadline < contest.endTime ? userDeadline : contest.endTime;
          totalTimeMs = effectiveDeadline.getTime() - p.startTime.getTime();
        } else {
          // Contest still ongoing
          totalTimeMs = now.getTime() - p.startTime.getTime();
        }
      } else {
        // Unlimited time contest - use elapsed time
        totalTimeMs = now.getTime() - p.startTime.getTime();
      }

      return {
        id: p.id,
        user: {
          id: p.user.id,
          firstName: p.user.firstName ?? '',
          lastName: p.user.lastName ?? '',
          email: p.user.email ?? '',
        },
        startTime: p.startTime,
        endTime: p.endTime,
        finishedAt: p.finishedAt,
        finalScore: p.finalScore ?? 0,
        rank,
        totalTime: this.formatDuration(totalTimeMs),
        // Map over ALL contest problems, not just ones with results
        problemResults: contest.contestProblems.map((cp) => {
          // Find if user has a result for this problem
          const existingResult = p.problemResults.find(
            (pr) => pr.problem.id === cp.problemId,
          );

          if (existingResult) {
            // User has attempted this problem
            const problemTimeMs =
              existingResult.updatedAt.getTime() - p.startTime.getTime();
            return {
              problemId: cp.problemId,
              score: existingResult.score,
              time: this.formatDuration(problemTimeMs),
              status: existingResult.status,
            };
          } else {
            // User hasn't attempted this problem
            return {
              problemId: cp.problemId,
              score: 0,
              time: null,
              status: ProblemStatus.UNATTEMPTED,
            };
          }
        }),
      };
    });

    if (isBackward) {
      rankings.reverse();
    }

    const hasNextPage = isBackward ? !!query.before : hasMore;
    const hasPreviousPage = isBackward ? hasMore : !!query.after;

    const edges = rankings.map((ranking) => ({
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
      totalCount: count,
    };
  }

  private validatePagination(query: LeaderboardCursorQueryDto) {
    const isBackward = !!query?.before && !query?.after;
    const limit = isBackward ? query?.last : query?.first;

    if (!limit || limit < 1 || limit > this.MAX_PAGE_SIZE) {
      throw new Error(`Limit must be between 1 and ${this.MAX_PAGE_SIZE}`);
    }

    return { limit, isBackward };
  }

  private formatDuration(ms: number): string {
    if (ms <= 0) return '00:00';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }
}
