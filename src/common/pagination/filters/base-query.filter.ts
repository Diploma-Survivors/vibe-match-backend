// Third-party
import { WhereExpressionBuilder } from 'typeorm';

// Relative imports
import { QueryFilter } from './query-filter.interface';

/**
 * Abstract class for query filters
 * @template T - The type of the filter context
 */
export abstract class BaseQueryFilter<T> implements QueryFilter<T> {
  private nextFilter: QueryFilter<T>;

  setNext(filter: QueryFilter<T>): QueryFilter<T> {
    this.nextFilter = filter;
    return filter;
  }

  apply(queryBuilder: WhereExpressionBuilder, context?: T): void {
    if (this.shouldApply(context)) {
      this.doFilter(queryBuilder, context);
    }

    if (this.nextFilter) {
      this.nextFilter.apply(queryBuilder, context);
    }
  }

  /**
   * Determine whether to apply this filter based on the context
   * @param context - The filter context
   * @returns Whether the filter should be applied
   */
  abstract shouldApply(context?: T): boolean;

  /**
   * Perform the actual filtering logic
   * @param qb - The query builder
   * @param context - The filter context
   */
  protected abstract doFilter(qb: WhereExpressionBuilder, context?: T): void;
}
