// NestJS
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Third-party
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';

// Shared/Common
import { MatchMode } from 'src/common/pagination/enums/match-mode.enum';
import { QueryFilter } from 'src/common/pagination/filters/query-filter.interface';
import { BaseCursorPaginationService } from 'src/common/pagination/services/base-cursor-pagination.service';
import { CursorPaginationService } from 'src/common/pagination/services/cursor-pagination.service';
import { CursorPaginated } from 'src/common/pagination/interfaces/cursor-paginated.interface';
import { decodeCursor, encodeCursor } from 'src/common/utils/cursor-query.util';

// Relative imports
import { FilterContext } from 'src/modules/problems/interfaces/filter-context.interface';
import { RoleEnum } from 'src/modules/user/enums/role.enum';
import { ContestsCursorQueryDto } from '../dto/contests-cursor-query.dto';
import { Contest } from '../entities/contest.entity';
import { ContestStatus } from '../enums/contest-status.enum';
import { ContestParticipation } from '../entities/contest-participations.entity';
import { Submission } from '../../submission/entities/submission.entity';
import { LeaderboardRankingDto } from '../dto/leaderboard-response.dto';
import { LeaderboardCursorQueryDto } from '../dto/leaderboard-cursor-query.dto';
import { ParticipantResultDto } from '../dto/submissions-overview-response.dto';
import { SubmissionsOverviewCursorQueryDto } from '../dto/submissions-overview-cursor-query.dto';
import { ContestParticipationDto } from '../dto/contest-participation.dto';

/**
 * Raw result from leaderboard ranking query
 */
interface LeaderboardRawResult {
  cp_contestParticipationId: number;
  cp_startTime: Date;
  cp_endTime: Date | null;
  cp_finalScore: number | null;
  u_userId: number;
  u_firstName: string;
  u_lastName: string;
  u_email: string;
  totalSubmissions: number;
  solvedProblems: number;
  totalScore: number;
}

/**
 * Raw result from submissions overview query
 */
interface SubmissionsOverviewRawResult {
  cp_contestParticipationId: number;
  cp_startTime: Date;
  cp_endTime: Date | null;
  cp_finalScore: number | null;
  u_userId: number;
  u_firstName: string;
  u_lastName: string;
  u_email: string;
  totalSubmissions: number;
  solvedProblems: number;
  maxScore: number | null;
}

/**
 * Raw result from contestants query
 */
interface ContestantsRawResult {
  cp_contestParticipationId: number;
  cp_startTime: Date;
  cp_endTime: Date | null;
  cp_finalScore: number | null;
  u_userId: number;
  u_firstName: string;
  u_lastName: string;
  u_email: string;
}

/**
 * Raw result from total count query
 */
interface TotalCountRawResult {
  count: string;
}

/**
 * Cursor data for contest participation
 */
interface ContestParticipationCursor {
  contestParticipationId: number;
}

/**
 * Cursor data for leaderboard ranking
 */
interface LeaderboardCursor {
  rank: number;
}

/**
 * Concrete implementation of cursor pagination for Contests and related data
 * Handles contests, leaderboard rankings, and submissions overview
 *
 * @example
 * const result = await service.findWithCursorPagination(query);
 */
@Injectable()
export class ContestsPaginationService extends BaseCursorPaginationService<
  Contest,
  ContestsCursorQueryDto
> {
  protected readonly MAX_PAGE_SIZE = 100;

  constructor(
    @InjectRepository(Contest)
    private readonly contestRepository: Repository<Contest>,
    @InjectRepository(ContestParticipation)
    private readonly contestParticipationRepository: Repository<ContestParticipation>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    cursorPaginationService: CursorPaginationService,
  ) {
    super(cursorPaginationService, new Logger(ContestsPaginationService.name));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  supports(_roles: RoleEnum[]): boolean {
    // Support all roles for contest pagination
    return true;
  }

  protected getEntityAlias(): string {
    return 'contest';
  }

  protected getSearchableFields(): string[] {
    return ['name', 'description'];
  }

  protected buildBaseQuery(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    query: ContestsCursorQueryDto,
  ): SelectQueryBuilder<Contest> {
    return this.contestRepository.createQueryBuilder('contest');
  }

  protected buildFilterChain(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _matchMode: MatchMode,
  ): QueryFilter<FilterContext> | null {
    // Implement filter chain if needed for contest filtering
    return null;
  }

  protected applyFilters(
    queryBuilder: SelectQueryBuilder<Contest>,
    query: ContestsCursorQueryDto,
  ): void {
    const filterChain = this.buildFilterChain(query.matchMode);
    if (!filterChain || !query?.filters) {
      return;
    }

    queryBuilder.andWhere(
      new Brackets((qb) => {
        filterChain.apply(qb, {
          ...query.filters,
        });
      }),
    );
  }

  protected applyKeywordFilter(
    queryBuilder: SelectQueryBuilder<Contest>,
    keyword?: string,
  ) {
    const alias = this.getEntityAlias();
    queryBuilder.andWhere(
      `"${alias}".tsv @@ websearch_to_tsquery('simple', unaccent(:keyword))`,
      { keyword },
    );
  }

  protected selectFields(
    queryBuilder: SelectQueryBuilder<Contest>,
    sortBy: string,
  ): Promise<void> | void {
    const alias = this.getEntityAlias();
    const defaultSortField = this.getDefaultSortField();

    queryBuilder
      .select([
        `${alias}.id AS "${defaultSortField}"`,
        `${alias}.name AS "name"`,
        `${alias}.startTime AS "startTime"`,
        `${alias}.endTime AS "endTime"`,
        `${alias}.durationMinutes AS "durationMinutes"`,
        `${alias}.${sortBy} AS "${sortBy}"`,
      ])
      .addSelect(
        `
        CASE
          WHEN ${alias}.startTime > NOW() THEN '${ContestStatus.UPCOMING}'
          WHEN ${alias}.startTime <= NOW() AND ${alias}.endTime > NOW() THEN '${ContestStatus.ONGOING}'
          ELSE '${ContestStatus.ENDED}'
        END AS "status"
      `,
      );
  }

  protected async getTotalCount(
    query: ContestsCursorQueryDto,
  ): Promise<number> {
    const queryBuilder = this.buildBaseQuery(query);

    this.applyFilters(queryBuilder, query);
    if (query.keyword) {
      this.applyKeywordFilter(queryBuilder, query.keyword);
    }

    return queryBuilder.getCount();
  }

  /**
   * Calculate rankings and apply pagination (for leaderboard)
   */
  async calculateRankings(
    contestId: number,
    query: LeaderboardCursorQueryDto,
  ): Promise<CursorPaginated<LeaderboardRankingDto>> {
    // Get all participations with submissions for ranking calculation
    const participations = await this.contestParticipationRepository
      .createQueryBuilder('cp')
      .leftJoinAndSelect('cp.user', 'u')
      .leftJoin(
        'cp.submissions',
        's',
        's.contestParticipationId = cp.contestParticipationId',
      )
      .leftJoin('s.problem', 'p')
      .leftJoin(
        'p.contestProblems',
        'cpr',
        'cpr.problemId = p.problemId AND cpr.contestId = :contestId',
        { contestId },
      )
      .where('cp.contestId = :contestId', { contestId })
      .select([
        'cp.contestParticipationId',
        'cp.startTime',
        'cp.endTime',
        'cp.finalScore',
        'u.userId',
        'u.firstName',
        'u.lastName',
        'u.email',
        'COUNT(DISTINCT s.submissionId) as totalSubmissions',
        "COUNT(DISTINCT CASE WHEN s.status = 'ACCEPTED' THEN s.problemId END) as solvedProblems",
        "SUM(CASE WHEN s.status = 'ACCEPTED' THEN cpr.score ELSE 0 END) as totalScore",
      ])
      .groupBy('cp.contestParticipationId')
      .addGroupBy('u.userId')
      .addGroupBy('u.firstName')
      .addGroupBy('u.lastName')
      .addGroupBy('u.email')
      .orderBy('cp.finalScore', 'DESC')
      .addOrderBy('u.lastName', 'ASC')
      .addOrderBy('u.firstName', 'ASC')
      .getRawMany<LeaderboardRawResult>();

    // Calculate rankings
    const rankings: LeaderboardRankingDto[] = participations.map(
      (row, index) => ({
        rank: index + 1,
        user: {
          id: row.u_userId,
          firstName: row.u_firstName,
          lastName: row.u_lastName,
          email: row.u_email,
        },
        totalScore: row.cp_finalScore || 0,
        totalTime: '00:00', // TODO: Calculate actual time
        problemResults: [], // TODO: Calculate problem results
      }),
    );

    // Apply pagination
    return this.paginateLeaderboard(rankings, query);
  }

  /**
   * Paginate leaderboard rankings (in-memory pagination)
   */
  paginateLeaderboard(
    rankings: LeaderboardRankingDto[],
    query: LeaderboardCursorQueryDto,
  ): CursorPaginated<LeaderboardRankingDto> {
    const { limit, isBackward } = this.validateAndGetPagination(query);

    // Apply cursor pagination to the already sorted rankings array
    const paginatedRankings = this.applyLeaderboardCursorPagination(
      rankings,
      query,
      isBackward,
      limit,
    );

    return this.buildLeaderboardPaginatedResult(
      paginatedRankings,
      limit,
      isBackward,
      query,
      rankings.length,
    );
  }

  /**
   * Paginate submissions overview (database-level pagination)
   */
  async paginateSubmissionsOverview(
    contestId: number,
    query: SubmissionsOverviewCursorQueryDto,
  ): Promise<CursorPaginated<ParticipantResultDto>> {
    const queryBuilder = this.contestParticipationRepository
      .createQueryBuilder('cp')
      .leftJoinAndSelect('cp.user', 'u')
      .leftJoin(
        'cp.submissions',
        's',
        's.contestParticipationId = cp.contestParticipationId',
      )
      .leftJoin('s.problem', 'p')
      .leftJoin(
        'p.contestProblems',
        'cpr',
        'cpr.problemId = p.problemId AND cpr.contestId = :contestId',
        { contestId },
      )
      .where('cp.contestId = :contestId', { contestId })
      .select([
        'cp.contestParticipationId',
        'cp.startTime',
        'cp.endTime',
        'cp.finalScore',
        'u.userId',
        'u.firstName',
        'u.lastName',
        'u.email',
        'COUNT(DISTINCT s.submissionId) as totalSubmissions',
        "COUNT(DISTINCT CASE WHEN s.status = 'ACCEPTED' THEN s.problemId END) as solvedProblems",
        'cpr.score as maxScore',
      ])
      .groupBy('cp.contestParticipationId')
      .addGroupBy('u.userId')
      .addGroupBy('u.firstName')
      .addGroupBy('u.lastName')
      .addGroupBy('u.email')
      .addGroupBy('cpr.score')
      .orderBy('cp.finalScore', 'DESC')
      .addOrderBy('u.lastName', 'ASC')
      .addOrderBy('u.firstName', 'ASC');

    // Apply cursor pagination
    const result = this.cursorPaginationService.validatePagination(query);
    // Apply cursor conditions
    if (query.after || query.before) {
      const cursor = query.after || query.before!;
      const decoded = decodeCursor<ContestParticipationCursor>(cursor);
      const operator = query.after ? '>' : '<';
      queryBuilder.andWhere(`cp.contestParticipationId ${operator} :cursorId`, {
        cursorId: decoded.contestParticipationId,
      });
    }

    queryBuilder.limit(result.limit + 1);

    const rawResults =
      await queryBuilder.getRawMany<SubmissionsOverviewRawResult>();

    // Transform to ParticipantResultDto
    const data = rawResults.map((row) => ({
      participationId: row.cp_contestParticipationId,
      user: {
        id: row.u_userId,
        firstName: row.u_firstName,
        lastName: row.u_lastName,
        email: row.u_email,
      },
      totalScore: row.cp_finalScore ?? 0,
    }));

    // Handle pagination metadata
    const hasMore = data.length > result.limit;
    if (hasMore) {
      data.pop();
    }

    if (result.isBackward) {
      data.reverse();
    }

    const edges = data.map((item) => ({
      node: item,
      cursor: encodeCursor({ contestParticipationId: item.participationId }),
    }));

    const startCursor = edges?.[0]?.cursor ?? null;
    const endCursor = edges?.at(-1)?.cursor ?? null;

    const hasNextPage = result.isBackward ? !!query.before : hasMore;
    const hasPreviousPage = result.isBackward ? hasMore : !!query.after;

    // Get total count
    const totalCountQuery = this.contestParticipationRepository
      .createQueryBuilder('cp')
      .where('cp.contestId = :contestId', { contestId })
      .select('COUNT(*)', 'count');

    const totalResult = await totalCountQuery.getRawOne<TotalCountRawResult>();
    const totalCount = totalResult ? parseInt(totalResult.count) : 0;

    return {
      edges,
      pageInfos: {
        hasNextPage,
        hasPreviousPage,
        startCursor,
        endCursor,
      },
      totalCount,
    };
  }

  /**
   * Paginate contestants (database-level pagination)
   */
  async paginateContestants(
    contestId: number,
    query: SubmissionsOverviewCursorQueryDto,
  ): Promise<CursorPaginated<ContestParticipationDto>> {
    const queryBuilder = this.contestParticipationRepository
      .createQueryBuilder('cp')
      .leftJoinAndSelect('cp.user', 'u')
      .where('cp.contestId = :contestId', { contestId })
      .select([
        'cp.contestParticipationId',
        'cp.startTime',
        'cp.endTime',
        'cp.finalScore',
        'u.userId',
        'u.firstName',
        'u.lastName',
        'u.email',
      ])
      .orderBy('u.lastName', 'ASC')
      .addOrderBy('u.firstName', 'ASC');

    const result = this.cursorPaginationService.validatePagination(query);
    // Apply cursor conditions
    if (query.after || query.before) {
      const cursor = query.after || query.before!;
      const decoded = decodeCursor<ContestParticipationCursor>(cursor);
      const operator = query.after ? '>' : '<';
      queryBuilder.andWhere(`cp.contestParticipationId ${operator} :cursorId`, {
        cursorId: decoded.contestParticipationId,
      });
    }

    queryBuilder.limit(result.limit + 1);

    const rawResults = await queryBuilder.getRawMany<ContestantsRawResult>();

    // Transform to ContestParticipationDto
    const data = rawResults.map((row) => ({
      id: row.cp_contestParticipationId,
      startTime: row.cp_startTime,
      endTime: row.cp_endTime,
      finalScore: row.cp_finalScore ?? 0,
      user: {
        id: row.u_userId,
        firstName: row.u_firstName,
        lastName: row.u_lastName,
        email: row.u_email,
      },
    }));

    // Handle pagination metadata
    const hasMore = data.length > result.limit;
    if (hasMore) {
      data.pop();
    }

    if (result.isBackward) {
      data.reverse();
    }

    const edges = data.map((item) => ({
      node: item,
      cursor: encodeCursor({ contestParticipationId: item.id }),
    }));

    const startCursor = edges?.[0]?.cursor ?? null;
    const endCursor = edges?.at(-1)?.cursor ?? null;

    const hasNextPage = result.isBackward ? !!query.before : hasMore;
    const hasPreviousPage = result.isBackward ? hasMore : !!query.after;

    // Get total count
    const totalCountQuery = this.contestParticipationRepository
      .createQueryBuilder('cp')
      .where('cp.contestId = :contestId', { contestId })
      .select('COUNT(*)', 'count');

    const totalResult = await totalCountQuery.getRawOne<TotalCountRawResult>();
    const totalCount = totalResult ? parseInt(totalResult.count) : 0;

    return {
      edges,
      pageInfos: {
        hasNextPage,
        hasPreviousPage,
        startCursor,
        endCursor,
      },
      totalCount,
    };
  }

  private validateAndGetPagination(
    query: LeaderboardCursorQueryDto | SubmissionsOverviewCursorQueryDto,
  ) {
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

  private applyLeaderboardCursorPagination<T extends { rank: number }>(
    items: T[],
    query: LeaderboardCursorQueryDto,
    isBackward: boolean,
    limit: number,
  ): T[] {
    let startIndex = 0;

    if (query.after) {
      const afterRank = decodeCursor<LeaderboardCursor>(query.after).rank;
      startIndex = items.findIndex((item) => item.rank > afterRank);
    } else if (query.before) {
      const beforeRank = decodeCursor<LeaderboardCursor>(query.before).rank;
      startIndex = items.findIndex((item) => item.rank >= beforeRank);
      if (startIndex === -1) startIndex = items.length;
    }

    if (isBackward) {
      const endIndex = startIndex;
      startIndex = Math.max(0, endIndex - limit);
      return items.slice(startIndex, endIndex).reverse();
    } else {
      return items.slice(startIndex, startIndex + limit);
    }
  }

  private buildLeaderboardPaginatedResult<T extends { rank: number }>(
    items: T[],
    limit: number,
    isBackward: boolean,
    query: LeaderboardCursorQueryDto,
    totalCount: number,
  ): CursorPaginated<T> {
    const hasNextPage = !isBackward && items.length === limit;
    const hasPreviousPage = isBackward && items.length === limit;

    const edges = items.map((item) => ({
      node: item,
      cursor: encodeCursor({ rank: item.rank }),
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
      totalCount,
    };
  }
}
