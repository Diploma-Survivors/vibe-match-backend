// NestJS
import { BadRequestException, Logger } from '@nestjs/common';

// Third-party
import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

// Shared/Common
import { PAGINATION_CONSTANTS } from 'src/common/constants/pagination.constants';
import { MatchMode } from 'src/common/pagination/enums/match-mode.enum';
import { SortOrder } from 'src/common/pagination/enums/sort-order.enum';
import { CursorPaginated } from 'src/common/pagination/interfaces/cursor-paginated.interface';
import { CursorPaginationService } from 'src/common/pagination/services/cursor-pagination.service';
import { decodeCursor, encodeCursor } from 'src/common/utils/cursor-query.util';

/**
 * Base pagination query interface
 */
export interface BasePaginationQuery {
  first?: number;
  last?: number;
  after?: string;
  before?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
  keyword?: string;
  matchMode?: MatchMode;
}

/**
 * Abstract base class implementing for cursor pagination
 *
 * @template TEntity - The entity type being paginated
 * @template TQuery - The pagination query type extending BasePaginationQuery
 * @template TCursorFields - The shape of the cursor fields used for encoding/decoding
 *
 * @example
 * class ProblemsService extends BaseCursorPaginationService<Problem> {
 *   protected getEntityAlias(): string { return 'problem'; }
 *   protected buildBaseQuery(): SelectQueryBuilder<Problem> { ... }
 *   protected applyFilters(qb, query): void { ... }
 * }
 */
export abstract class BaseCursorPaginationService<
  TEntity extends ObjectLiteral,
  TQuery extends BasePaginationQuery = BasePaginationQuery,
  TCursorFields extends Record<string, any> = Record<string, any>,
> {
  protected readonly MAX_PAGE_SIZE = PAGINATION_CONSTANTS.MAX_PAGE_SIZE;

  constructor(
    protected readonly cursorPaginationService: CursorPaginationService,
    protected readonly logger: Logger,
  ) {}

  /**
   * Defines the skeleton of the pagination algorithm
   * This is the main method that orchestrates the entire pagination process
   *
   * Steps:
   * 1. Validate pagination parameters
   * 2. Build sort configuration
   * 3. Build base query
   * 4. Apply filters
   * 5. Apply keyword filter
   * 6. Apply cursor pagination
   * 7. Select fields
   * 8. Build paginated result
   */
  async findWithCursorPagination(
    query: TQuery,
  ): Promise<CursorPaginated<TEntity>> {
    const { limit, isBackward } = this.validatePagination(query);

    const { sortBy, sortOrder, operator } = this.buildSortConfiguration(
      query,
      isBackward,
    );

    const queryBuilder = this.buildBaseQuery(query);

    await this.applyFilters(queryBuilder, query);

    if (query?.keyword) {
      this.applyKeywordFilter(queryBuilder, query.keyword);
    }

    await this.applyCursorPagination(
      queryBuilder,
      query,
      sortBy,
      sortOrder,
      operator,
      limit + 1,
    );

    await this.selectFields(queryBuilder, sortBy);

    return this.buildPaginatedResult(
      queryBuilder,
      query,
      sortBy,
      limit,
      isBackward,
    );
  }

  /**
   * Hook method: Subclasses must implement to return entity alias
   * @example return 'problem';
   */
  protected abstract getEntityAlias(): string;

  /**
   * Hook method: Subclasses must implement to build the base query
   * @example return this.repository.createQueryBuilder('problem');
   */
  protected abstract buildBaseQuery(query: TQuery): SelectQueryBuilder<TEntity>;

  /**
   * Hook method: Subclasses must implement to apply entity-specific filters
   * @example
   * protected async applyFilters(qb, query) {
   *   if (query.difficulty) {
   *     qb.andWhere('problem.difficulty = :difficulty', { difficulty: query.difficulty });
   *   }
   * }
   */
  protected abstract applyFilters(
    queryBuilder: SelectQueryBuilder<TEntity>,
    query: TQuery,
  ): Promise<void> | void;

  /**
   *  Hook method: Subclasses must implement to select specific fields
   * @example
   * protected async selectFields(qb, sortBy) {
   *   qb.select(['problem.id', 'problem.title', `problem."${sortBy}"`]);
   * }
   */
  protected abstract selectFields(
    queryBuilder: SelectQueryBuilder<TEntity>,
    sortBy: string,
  ): Promise<void> | void;

  /**
   * Hook method: Subclasses can override to define searchable fields
   * @example return ['title', 'description'];
   */
  protected abstract getSearchableFields(): string[];

  /**
   * Hook method: Subclasses can override to customize keyword search
   * Default implementation searches common fields
   */
  protected applyKeywordFilter(
    queryBuilder: SelectQueryBuilder<TEntity>,
    keyword: string,
  ): void {
    const alias = this.getEntityAlias();
    const searchableFields = this.getSearchableFields();

    queryBuilder.andWhere(
      new Brackets((qb) => {
        for (const field of searchableFields) {
          const [condition, param] = [
            `${alias}.${field} LIKE :keyword`,
            `%${keyword}%`,
          ];
          qb.orWhere(condition, { keyword: param });
        }
      }),
    );
  }

  /**
   * Hook method: Subclasses can override to get cursor field value
   * Default: Uses query result
   */
  protected getCursorFieldValue(entity: TEntity, sortBy: string): unknown {
    return entity[sortBy];
  }

  /**
   * Shared logic: Validates pagination parameters
   */
  private validatePagination(query: TQuery) {
    return this.cursorPaginationService.validatePagination(query);
  }

  /**
   * Shared logic: Builds sort configuration
   */
  private buildSortConfiguration(query: TQuery, isBackward: boolean) {
    return this.cursorPaginationService.buildSortConfiguration(
      query,
      isBackward,
      query?.sortBy || this.getDefaultSortField(),
    );
  }

  /**
   * Hook method: Subclasses can override default sort field (must be a identifier of TEntity)
   */
  protected getDefaultSortField(): string {
    return 'id';
  }

  /**
   * Shared logic: Applies cursor pagination to query
   */
  private async applyCursorPagination(
    queryBuilder: SelectQueryBuilder<TEntity>,
    query: TQuery,
    sortBy: string,
    sortOrder: 'ASC' | 'DESC',
    operator: '>' | '<',
    limit: number,
  ): Promise<void> {
    const alias = this.getEntityAlias();
    const defaultSortBy = this.getDefaultSortField();

    // Apply cursor if exists
    if (query?.after || query?.before) {
      const { cursorValue, cursorId } = await this.getAndValidateCursorPayload(
        query,
        query?.after || query.before!,
      );

      queryBuilder.andWhere(
        `(${alias}.${sortBy}, ${alias}.${defaultSortBy}) ${operator} (:cursorValue, :cursorId)`,
        {
          cursorValue,
          cursorId,
        },
      );
    }

    // Apply sorting and limit
    queryBuilder
      .orderBy(`${alias}.${sortBy}`, sortOrder)
      .addOrderBy(`${alias}.${defaultSortBy}`, sortOrder)
      .limit(limit);
  }

  /**
   * Shared logic: Gets and validates cursor value
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private async getAndValidateCursorPayload(
    query: TQuery,
    cursor: string,
  ): Promise<Record<string, unknown>> {
    try {
      const decoded = decodeCursor<TCursorFields>(cursor);
      const defaultSortBy = this.getDefaultSortField();
      const sortBy = query?.sortBy || this.getDefaultSortField();

      return {
        cursorValue: decoded?.[sortBy] as unknown,
        cursorId: decoded?.[defaultSortBy] as unknown,
      };
    } catch (error) {
      this.logger.error('Failed to decode cursor', error);
      throw new BadRequestException('Invalid cursor');
    }
  }

  /**
   * Shared logic: Builds the final paginated result
   */
  private async buildPaginatedResult(
    queryBuilder: SelectQueryBuilder<TEntity>,
    query: TQuery,
    sortBy: string,
    limit: number,
    isBackward: boolean,
  ): Promise<CursorPaginated<TEntity>> {
    // Execute query
    let nodes = await queryBuilder.getRawMany<TEntity>();

    // Calculate pagination info
    const hasMore = nodes.length > limit;
    if (hasMore) {
      nodes.pop();
    }

    // Reverse for backward pagination
    if (isBackward) {
      nodes = nodes.reverse();
    }

    // Build cursors
    const edges = nodes.map((node) => ({
      node,
      cursor: this.createCursor(node, sortBy),
    }));

    const startCursor = edges?.[0]?.cursor ?? null;
    const endCursor = edges?.at(-1)?.cursor ?? null;

    const hasNextPage = isBackward ? !!query.before : hasMore;
    const hasPreviousPage = isBackward ? hasMore : !!query.after;

    const totalCount = await this.getTotalCount(query);

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
   * Hook method: Subclasses can override to provide efficient count
   */
  protected async getTotalCount(query: TQuery): Promise<number> {
    const queryBuilder = this.buildBaseQuery(query);
    await this.applyFilters(queryBuilder, query);

    if (query?.keyword) {
      this.applyKeywordFilter(queryBuilder, query.keyword);
    }
    await this.applyFilters(queryBuilder, query);

    const alias = this.getEntityAlias();
    const sortByDefault = this.getDefaultSortField();

    const { count } = (await queryBuilder
      .select(`COUNT(DISTINCT ${alias}.${sortByDefault})`, 'count')
      .getRawOne()) as { count: string };
    return Number.parseInt(count, 10);
  }

  /**
   * Shared logic: Creates cursor for entity
   */
  private createCursor(entity: TEntity, sortBy: string): string {
    const cursorFields: Record<string, unknown> = {
      [sortBy]: this.getCursorFieldValue(entity, sortBy),
    };

    // Always include ID for stable sorting
    const defaultSortBy = this.getDefaultSortField();
    if (sortBy !== defaultSortBy) {
      cursorFields[defaultSortBy] = entity[defaultSortBy];
    }

    return encodeCursor(cursorFields);
  }
}
