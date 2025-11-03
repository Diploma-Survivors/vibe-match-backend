import { WhereExpressionBuilder } from 'typeorm';

/**
 * Interface for query filters (used in pagination and other query contexts)
 * @template T Type of the filter context
 */
export interface QueryFilter<T> {
  /**
   * Sets the next filter in the chain
   * @param filter item to set as next
   * @returns The next filter
   */
  setNext(filter: QueryFilter<T>): QueryFilter<T>;

  /**
   * Applies the filter to the query builder
   * @param qb query builder to apply the filter on
   * @param context optional context for applying the filter
   */
  apply(qb: WhereExpressionBuilder, context?: T): void;
}
