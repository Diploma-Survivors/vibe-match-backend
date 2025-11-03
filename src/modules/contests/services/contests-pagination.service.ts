// NestJS
import { Logger } from '@nestjs/common';

// Third-party
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';

// Shared/Common
import { MatchMode } from 'src/common/pagination/enums/match-mode.enum';
import { QueryFilter } from 'src/common/pagination/filters/query-filter.interface';
import { BaseCursorPaginationService } from 'src/common/pagination/services/base-cursor-pagination.service';
import { CursorPaginationService } from 'src/common/pagination/services/cursor-pagination.service';

// Relative imports
import { FilterContext } from 'src/modules/problems/interfaces/filter-context.interface';
import { RoleEnum } from 'src/modules/user/enums/role.enum';
import { ContestsCursorQueryDto } from '../dto/contests-cursor-query.dto';
import { Contest } from '../entities/contest.entity';
import { ContestStatus } from '../enums/contest-status.enum';

/**
 * Concrete implementation of cursor pagination for Contests
 *
 * @example
 * const result = await service.findWithCursorPagination(query);
 */
export abstract class ContestsPaginationService extends BaseCursorPaginationService<
  Contest,
  ContestsCursorQueryDto
> {
  constructor(
    private readonly contestRepository: Repository<Contest>,
    cursorPaginationService: CursorPaginationService,
    logger: Logger,
  ) {
    super(cursorPaginationService, logger);
  }

  abstract supports(roles: RoleEnum[]): boolean;

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

  protected abstract buildFilterChain(
    matchMode: MatchMode,
  ): QueryFilter<FilterContext> | null;

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
}
