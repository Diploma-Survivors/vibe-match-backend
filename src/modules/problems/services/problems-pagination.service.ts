// NestJS
import { Logger } from '@nestjs/common';

// Third-party
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';

// Shared/Common
import { MatchMode } from 'src/common/pagination/enums/match-mode.enum';
import { QueryFilter } from 'src/common/pagination/filters/query-filter.interface';
import { BaseCursorPaginationService } from 'src/common/pagination/services/base-cursor-pagination.service';
import { CursorPaginationService } from 'src/common/pagination/services/cursor-pagination.service';

// Relative imports
import { ProblemsCursorQueryDto } from '../dto/problems-cursor-query.dto';
import { ProblemTag } from '../entities/problem-tag.entity';
import { ProblemTopic } from '../entities/problem-topic.entity';
import { Problem } from '../entities/problem.entity';
import { FilterContext } from '../interfaces/filter-context.interface';
import { Tag } from '../tags/entities/tag.entity';
import { Topic } from '../topics/entities/topic.entity';

/**
 * Concrete implementation of cursor pagination for Problems
 *
 * @example
 * const result = await service.findWithCursorPagination(query);
 */
export abstract class ProblemsPaginationService extends BaseCursorPaginationService<
  Problem,
  ProblemsCursorQueryDto
> {
  constructor(
    private readonly problemRepository: Repository<Problem>,
    private readonly problemTagRepository: Repository<ProblemTag>,
    private readonly problemTopicRepository: Repository<ProblemTopic>,
    cursorPaginationService: CursorPaginationService,
    logger: Logger,
  ) {
    super(cursorPaginationService, logger);
  }

  protected getEntityAlias(): string {
    return 'problem';
  }

  protected getSearchableFields(): string[] {
    return ['title', 'description'];
  }

  protected buildBaseQuery(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    query: ProblemsCursorQueryDto,
  ): SelectQueryBuilder<Problem> {
    const alias = this.getEntityAlias();

    const problemTagSubquery = this.problemTagRepository
      .createQueryBuilder('pt')
      .select(`pt.problem_id`, 'problem_id')
      .addSelect(
        `json_agg(json_build_object('id', t.id, 'name', t.name))`,
        'tags',
      )
      .innerJoin(Tag, 't', 'pt.tag_id = t.tag_id')
      .groupBy('pt.problem_id');

    const problemTopicSubquery = this.problemTopicRepository
      .createQueryBuilder('pto')
      .select(`pto.problem_id`, 'problem_id')
      .addSelect(
        `json_agg(json_build_object('id', tp.id, 'name', tp.name))`,
        'topics',
      )
      .innerJoin(Topic, 'tp', 'pto.topic_id = tp.topic_id')
      .groupBy('pto.problem_id');

    const qb = this.problemRepository
      .createQueryBuilder(alias)
      .addCommonTableExpression(problemTagSubquery, 'problem_tags_agg')
      .addCommonTableExpression(problemTopicSubquery, 'problem_topics_agg')
      .leftJoin(
        'problem_tags_agg',
        'tags',
        `tags.problem_id = ${alias}.problem_id`,
      )
      .leftJoin(
        'problem_topics_agg',
        'topics',
        `topics.problem_id = ${alias}.problem_id`,
      );

    return qb;
  }

  protected abstract buildFilterChain(
    matchMode: MatchMode,
  ): QueryFilter<FilterContext> | null;

  protected applyKeywordFilter(
    queryBuilder: SelectQueryBuilder<Problem>,
    keyword: string,
  ): void {
    const alias = this.getEntityAlias();

    queryBuilder.andWhere(
      `"${alias}"."tsv" @@ websearch_to_tsquery('simple', unaccent(:keyword))`,
      { keyword },
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async applyFilters(
    queryBuilder: SelectQueryBuilder<Problem>,
    query: ProblemsCursorQueryDto,
  ): Promise<void> {
    const filterChain = this.buildFilterChain(query.matchMode);
    if (!filterChain || !query?.filters) {
      return;
    }
    queryBuilder.andWhere(
      new Brackets((qb) => {
        filterChain.apply(qb, {
          ...query.filters,
        });
      }),
    );
  }

  protected selectFields(
    queryBuilder: SelectQueryBuilder<Problem>,
    sortBy: string,
  ): Promise<void> | void {
    const alias = this.getEntityAlias();
    const defaultSortField = this.getDefaultSortField();

    queryBuilder.select([
      `${alias}.${defaultSortField} AS "${defaultSortField}"`,
      `${alias}.title AS "title"`,
      `${alias}.difficulty AS "difficulty"`,
      `${alias}.${sortBy} AS "${sortBy}"`,
      `COALESCE(tags.tags, '[]') AS "tags"`,
      `COALESCE(topics.topics, '[]') AS "topics"`,
    ]);
  }

  protected async getTotalCount(
    query: ProblemsCursorQueryDto,
  ): Promise<number> {
    const queryBuilder = this.buildBaseQuery(query);

    await this.applyFilters(queryBuilder, query);
    if (query.keyword) {
      this.applyKeywordFilter(queryBuilder, query.keyword);
    }

    return queryBuilder.getCount();
  }
}
