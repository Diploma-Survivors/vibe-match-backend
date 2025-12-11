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
  ): Promise<PaginationCursorResponseDto<LeaderboardRankingDto>> {
    const { limit, isBackward } = this.validatePagination(query);

    // Actually, for complex sort we need QueryBuilder
    const qb = this.contestParticipationRepository
      .createQueryBuilder('cp')
      .leftJoinAndSelect('cp.user', 'u')
      .leftJoinAndSelect('cp.problemResults', 'pr')
      .leftJoinAndSelect('pr.problem', 'p')
      .where('cp.contestId = :contestId', { contestId });

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
      qb.andWhere(
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

    // Sort by finalScore DESC
    qb.orderBy('cp.finalScore', 'DESC', 'NULLS LAST');

    // Add computed columns for sorting to avoid "alias not found" error
    // We use addSelect to define the alias, then order by it.
    // Note: These extra columns won't be mapped to the entity but are needed for sorting.
    qb.addSelect(
      'CASE WHEN cp.finishedAt IS NULL THEN 1 ELSE 0 END',
      'status_order',
    );
    qb.addSelect(
      'EXTRACT(EPOCH FROM (COALESCE(cp.finishedAt, NOW()) - cp.startTime))',
      'time_taken',
    );

    qb.addOrderBy('status_order', 'ASC');
    qb.addOrderBy('time_taken', 'ASC');

    // Tie-breaker
    qb.addOrderBy('cp.id', 'ASC');

    // Use limit to fetch one extra result to check if there are more
    qb.limit(limit + 1);

    const results = await qb.getMany();

    // Calculate starting rank based on cursor
    let startRank = 1;
    if (query.after) {
      const afterRank = decodeCursor<{ rank: number }>(query.after).rank;
      startRank = afterRank + 1;
    } else if (query.before) {
      const beforeRank = decodeCursor<{ rank: number }>(query.before).rank;
      startRank = Math.max(1, beforeRank - limit);
    }

    // Check if there are more results
    const hasMore = results.length > limit;
    if (hasMore) {
      results.pop(); // Remove the extra result
    }

    // Get total count separately
    const countQb = this.contestParticipationRepository
      .createQueryBuilder('cp')
      .leftJoin('cp.user', 'u')
      .where('cp.contestId = :contestId', { contestId });

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
      const totalTimeMs = p.finishedAt
        ? p.finishedAt.getTime() - p.startTime.getTime()
        : new Date().getTime() - p.startTime.getTime();

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
        problemResults: p.problemResults.map((pr) => ({
          problemId: pr.problem.id,
          score: pr.score,
          time: this.formatDuration(
            pr.updatedAt.getTime() - p.startTime.getTime(),
          ),
          status: pr.status,
        })),
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
