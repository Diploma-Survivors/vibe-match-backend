// Third-party
import { WhereExpressionBuilder } from 'typeorm';

// Shared/Common
import { BaseQueryFilter } from 'src/common/pagination/filters/base-query.filter';

// Relative imports
import { FilterContext } from '../interfaces/filter-context.interface';

export class CourseFilter extends BaseQueryFilter<FilterContext> {
  constructor(private readonly alias: string) {
    super();
  }

  shouldApply(context?: FilterContext): boolean {
    return !!context?.courseId;
  }

  protected doFilter(
    qb: WhereExpressionBuilder,
    context?: FilterContext,
  ): void {
    qb.andWhere(`${this.alias}.course_id = :courseId`, {
      courseId: context?.courseId,
    });
  }
}
