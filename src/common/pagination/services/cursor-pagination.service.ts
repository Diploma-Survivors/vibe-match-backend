// NestJS
import { BadRequestException, Injectable } from '@nestjs/common';

// Shared/Common
import { PAGINATION_CONSTANTS } from 'src/common/constants/pagination.constants';
import { SortOrder } from 'src/common/pagination/enums/sort-order.enum';

/**
 * Interface for pagination query parameters
 */
export interface PaginationCursorDto {
  first?: number;
  last?: number;
  after?: string;
  before?: string;
  sortOrder?: SortOrder;
}

/**
 * Configuration for sorting
 */
export interface SortConfiguration<SortByType = string> {
  sortBy: SortByType;
  sortOrder: 'ASC' | 'DESC';
  operator: '>' | '<';
}

/**
 * Pagination metadata
 */
export interface PaginationMetadata {
  limit: number;
  isBackward: boolean;
}

/**
 * Generic cursor pagination service
 * Provides reusable pagination logic for cursor-based pagination
 *
 * @example
 * const paginationService = new CursorPaginationService();
 * const metadata = paginationService.validatePagination(query);
 * const sortConfig = paginationService.buildSortConfiguration(query, metadata.isBackward, 'createdAt');
 */
@Injectable()
export class CursorPaginationService {
  private readonly maxPageSize = PAGINATION_CONSTANTS.MAX_PAGE_SIZE;
  private readonly minPageSize = PAGINATION_CONSTANTS.MIN_PAGE_SIZE;

  /**
   * Validates pagination parameters and determines direction
   *
   * @param query - Pagination query with first/last/before/after
   * @returns Pagination metadata with limit and direction
   *
   * @example
   * const metadata = paginationService.validatePagination({
   *   first: 20,
   *   after: 'cursor123'
   * });
   * // Returns: { limit: 20, isBackward: false }
   */
  validatePagination(query: PaginationCursorDto): PaginationMetadata {
    const isBackward = !!query?.before && !query?.after;
    const limit = isBackward ? query?.last : query?.first;

    if (!limit || limit < this.minPageSize || limit > this.maxPageSize) {
      throw new BadRequestException(
        `Limit must be between ${this.minPageSize} and ${this.maxPageSize}`,
      );
    }

    return { limit, isBackward };
  }

  /**
   * Builds sort configuration for cursor pagination
   *
   * @param query - Pagination query
   * @param isBackward - Whether pagination is backward
   * @param sortBy - Field to sort by
   * @returns Sort configuration with sortBy, sortOrder, and operator
   *
   * @example
   * const sortConfig = paginationService.buildSortConfiguration(
   *   query,
   *   false,
   *   'createdAt'
   * );
   * // Returns: { sortBy: 'createdAt', sortOrder: 'ASC', operator: '>' }
   */
  buildSortConfiguration<SortByType = string>(
    query: PaginationCursorDto & { sortBy?: SortByType },
    isBackward: boolean,
    defaultSortBy?: SortByType,
  ): SortConfiguration<SortByType> {
    const sortBy = (query?.sortBy ?? defaultSortBy) as SortByType;
    const naturalOrder: 'ASC' | 'DESC' =
      query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
    const operator = this.determineCursorOperator(query, naturalOrder);

    // Reverse sort order for backward pagination
    const reversedOrder: 'ASC' | 'DESC' =
      naturalOrder === 'ASC' ? 'DESC' : 'ASC';
    const sortOrder: 'ASC' | 'DESC' = isBackward ? reversedOrder : naturalOrder;

    return { sortBy, sortOrder, operator };
  }

  /**
   * Determines the cursor comparison operator based on query and sort direction
   *
   * @param query - Pagination query
   * @param naturalOrder - Natural sort order (ASC/DESC)
   * @returns Comparison operator (> or <)
   *
   * @example
   * const operator = paginationService.determineCursorOperator(
   *   { after: 'cursor123' },
   *   'ASC'
   * );
   * // Returns: '>'
   */
  determineCursorOperator(
    query: PaginationCursorDto,
    naturalOrder: 'ASC' | 'DESC',
  ): '>' | '<' {
    if (query?.after) {
      return naturalOrder === 'ASC' ? '>' : '<';
    }

    if (query?.before) {
      return naturalOrder === 'ASC' ? '<' : '>';
    }

    return '>';
  }
}
