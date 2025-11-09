// Third-party imports
import { WhereExpressionBuilder } from 'typeorm';

// Shared/Common
import { BaseQueryFilter } from 'src/common/pagination/filters/base-query.filter';

// Relative imports
import { FilterContext } from '../interfaces/filter-context.interface';

export class CanAccessFilter extends BaseQueryFilter<FilterContext> {
  constructor(private readonly alias: string) {
    super();
  }

  shouldApply(context?: FilterContext): boolean {
    return !!context?.courseId && !!context?.visibility;
  }

  protected doFilter(
    qb: WhereExpressionBuilder,
    context?: FilterContext,
  ): void {
    const [condition, params] = [
      `
        (
          ${this.alias}.visibility = :visibility
          OR EXISTS (
            SELECT 1
            FROM course_problems cp
            WHERE cp.problem_id = ${this.alias}.problem_id
            AND cp.course_id = :courseId
          )
        )
      `,
      {
        visibility: context?.visibility,
        courseId: context?.courseId,
      },
    ];
    qb.andWhere(condition, params);
  }
}
