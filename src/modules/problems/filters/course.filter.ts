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
    const [condition, params] = [
      `
        EXISTS (
          SELECT 1
          FROM course_problems cp
          WHERE cp.problem_id = ${this.alias}.problem_id
          AND cp.course_id = :courseId
        )`,
      {
        courseId: context?.courseId,
      },
    ];
    qb.andWhere(condition, params);
  }
}
