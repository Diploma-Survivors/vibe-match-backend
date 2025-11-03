// Third-party
import { WhereExpressionBuilder } from 'typeorm';

// Shared/Common
import { BaseQueryFilter } from 'src/common/pagination/filters/base-query.filter';

// Relative imports
import { FilterContext } from '../interfaces/filter-context.interface';

export class TopicsFilter extends BaseQueryFilter<FilterContext> {
  constructor(private readonly alias: string) {
    super();
  }

  shouldApply(context?: FilterContext): boolean {
    return !!context?.topics;
  }

  protected doFilter(
    qb: WhereExpressionBuilder,
    context?: FilterContext,
  ): void {
    const [condition, params] = [
      `
        EXISTS (
          SELECT 1
          FROM problem_topics pto
          WHERE pto.problem_id = ${this.alias}.problem_id
          AND pto.topic_id IN (:...topicIds)
        )
      `,
      {
        topicIds: context?.topics,
      },
    ];

    qb.andWhere(condition, params);
  }
}
