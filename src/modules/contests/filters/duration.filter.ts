// Third-party
import { WhereExpressionBuilder } from 'typeorm';

// Shared/Common
import { BaseQueryFilter } from 'src/common/pagination/filters/base-query.filter';

// Relative imports
import { FilterContext } from '../interfaces/filter-context.interface';

export class DurationFilter extends BaseQueryFilter<FilterContext> {
  constructor(private readonly alias: string) {
    super();
  }

  shouldApply(context?: FilterContext): boolean {
    return !!context?.minDurationMinutes || !!context?.maxDurationMinutes;
  }

  protected doFilter(
    qb: WhereExpressionBuilder,
    context?: FilterContext,
  ): void {
    let queryBuilder = qb;
    if (context?.minDurationMinutes) {
      queryBuilder = queryBuilder.andWhere(
        `${this.alias}.duration_minutes >= :minDurationMinutes`,
        {
          minDurationMinutes: context.minDurationMinutes,
        },
      );
    }

    if (context?.maxDurationMinutes) {
      queryBuilder.andWhere(
        `${this.alias}.duration_minutes <= :maxDurationMinutes`,
        {
          maxDurationMinutes: context.maxDurationMinutes,
        },
      );
    }
  }
}
