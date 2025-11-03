// Third-party
import { WhereExpressionBuilder } from 'typeorm';

// Shared/Common
import { BaseQueryFilter } from 'src/common/pagination/filters/base-query.filter';

// Relative imports
import { ContestStatus } from '../enums/contest-status.enum';
import { FilterContext } from '../interfaces/filter-context.interface';

export class StatusFilter extends BaseQueryFilter<FilterContext> {
  constructor(private readonly alias: string) {
    super();
  }

  shouldApply(context?: FilterContext): boolean {
    return !!context?.status;
  }

  protected doFilter(
    qb: WhereExpressionBuilder,
    context?: FilterContext,
  ): void {
    switch (context?.status) {
      case ContestStatus.UPCOMING:
        qb.andWhere(`${this.alias}.startTime > NOW()`);
        break;

      case ContestStatus.ONGOING:
        qb.andWhere(`${this.alias}.startTime <= NOW()`).andWhere(
          `${this.alias}.endTime > NOW()`,
        );
        break;

      case ContestStatus.ENDED:
        qb.andWhere(`${this.alias}.endTime <= NOW()`);
        break;
    }
  }
}
