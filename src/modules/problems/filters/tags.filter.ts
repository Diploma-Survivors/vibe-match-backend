// Third-party
import { WhereExpressionBuilder } from 'typeorm';

// Shared/Common
import { BaseQueryFilter } from 'src/common/pagination/filters/base-query.filter';

// Relative imports
import { FilterContext } from '../interfaces/filter-context.interface';

export class TagsFilter extends BaseQueryFilter<FilterContext> {
  constructor(private readonly alias: string) {
    super();
  }

  shouldApply(context?: FilterContext): boolean {
    return !!context?.tags;
  }

  protected doFilter(
    qb: WhereExpressionBuilder,
    context?: FilterContext,
  ): void {
    const [condition, params] = [
      `
        EXISTS (
          SELECT 1
          FROM problem_tags pt
          WHERE pt.problem_id = ${this.alias}.problem_id
          AND pt.tag_id IN (:...tagIds)
        )`,
      {
        tagIds: context?.tags,
      },
    ];
    qb.andWhere(condition, params);
  }
}
