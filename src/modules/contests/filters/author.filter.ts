// Shared/Common
import { BaseQueryFilter } from 'src/common/pagination/filters/base-query.filter';

// Relative imports
import { FilterContext } from '../interfaces/filter-context.interface';
import { WhereExpressionBuilder } from 'typeorm';

export class AuthorFilter extends BaseQueryFilter<FilterContext> {
  constructor(private readonly alias: string) {
    super();
  }

  shouldApply(context?: FilterContext): boolean {
    return !!context?.authorId;
  }

  protected doFilter(
    qb: WhereExpressionBuilder,
    context?: FilterContext,
  ): void {
    qb.andWhere(`${this.alias}.author_id = :authorId`, {
      authorId: context?.authorId,
    });
  }
}
