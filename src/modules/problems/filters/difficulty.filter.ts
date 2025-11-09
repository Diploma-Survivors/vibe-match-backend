// Third-party
import { WhereExpressionBuilder } from 'typeorm';

// Shared/Common
import { BaseQueryFilter } from 'src/common/pagination/filters/base-query.filter';

// Relative imports
import { FilterContext } from '../interfaces/filter-context.interface';

export class DifficultyFilter extends BaseQueryFilter<FilterContext> {
  constructor(private readonly alias: string) {
    super();
  }

  shouldApply(context?: FilterContext): boolean {
    return !!context?.difficulty;
  }

  protected doFilter(
    qb: WhereExpressionBuilder,
    context?: FilterContext,
  ): void {
    const [condition, params] = [
      `${this.alias}.difficulty = :difficulty`,
      {
        difficulty: context?.difficulty,
      },
    ];
    qb.andWhere(condition, params);
  }
}
