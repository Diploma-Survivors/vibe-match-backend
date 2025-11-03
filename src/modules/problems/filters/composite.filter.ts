// Third-party
import { Brackets, ObjectLiteral, WhereExpressionBuilder } from 'typeorm';

// Shared/Common
import { LogicalOperator } from 'src/common/pagination/enums/logical-operator.enum';
import { BaseQueryFilter } from 'src/common/pagination/filters/base-query.filter';

// Relative imports
import { FilterContext } from '../interfaces/filter-context.interface';

export class CompositeFilter extends BaseQueryFilter<FilterContext> {
  private readonly filters: BaseQueryFilter<FilterContext>[] = [];

  constructor(
    private readonly groupOperator: LogicalOperator = LogicalOperator.AND,
  ) {
    super();
  }

  addFilters(...filters: BaseQueryFilter<FilterContext>[]): this {
    this.filters.push(...filters);
    return this;
  }

  shouldApply(context?: FilterContext): boolean {
    return this.filters.some((filter) => filter.shouldApply(context));
  }

  protected doFilter(
    qb: WhereExpressionBuilder,
    context?: FilterContext,
  ): void {
    const activeFilters = this.filters.filter((filter) =>
      filter.shouldApply(context),
    );

    if (activeFilters.length === 1) {
      activeFilters[0].apply(qb, context);
      return;
    }

    qb.andWhere(
      new Brackets((innerQb) => {
        for (const [index, filter] of activeFilters.entries()) {
          if (index === 0) {
            // Because Concrete Filters only have andWhere, we create a stub to map andWhere to where
            const stub = {
              andWhere: (condition: string, params: ObjectLiteral) => {
                innerQb.where(condition, params);
                return innerQb;
              },
            } as WhereExpressionBuilder;
            filter.apply(stub, context);
          } else if (this.groupOperator == LogicalOperator.OR) {
            // Because Concrete Filters only have andWhere, we create a stub to map andWhere to orWhere
            const stub = {
              andWhere: (condition: string, params: ObjectLiteral) => {
                innerQb.orWhere(condition, params);
                return innerQb;
              },
            } as WhereExpressionBuilder;
            filter.apply(stub, context);
          } else {
            filter.apply(innerQb, context);
          }
        }
      }),
    );
  }
}
