import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SortOrder } from 'src/common/pagination/enums/sort-order.enum';
import { CursorPaginated } from 'src/common/pagination/interfaces/cursor-paginated.interface';
import { decodeCursor, encodeCursor } from 'src/common/utils/cursor-query.util';
import { DataSource, FindOptionsSelect, In, Repository } from 'typeorm';
import { QueryRunner, SelectQueryBuilder } from 'typeorm/browser';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { CreateProblemDto } from './dto/create-problem.dto';
import {
  ProblemCursorFieldsDto,
  ProblemsCursorQueryDto,
} from './dto/problems-cursor-query.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { Problem } from './entities/problem.entity';
import { Tag } from './tags/entities/tag.entity';
import { Testcase } from './testcases/entities/testcase.entity';
import { Topic } from './topics/entities/topic.entity';

@Injectable()
export class ProblemsService {
  private readonly logger = new Logger(ProblemsService.name);
  private readonly MAX_PAGE_SIZE = 100;

  constructor(
    @InjectRepository(Problem)
    private readonly problemsRepository: Repository<Problem>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createProblemDto: CreateProblemDto, user: JwtPayload) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const problem = await this.createProblemWithTransaction(
        queryRunner,
        createProblemDto,
        user,
      );
      await queryRunner.commitTransaction();
      return problem;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async createBulk(createProblemDtos: CreateProblemDto[], user: JwtPayload) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const problems = await Promise.all(
        createProblemDtos.map(async (createProblemDto) =>
          this.createProblemWithTransaction(
            queryRunner,
            createProblemDto,
            user,
          ),
        ),
      );
      await queryRunner.commitTransaction();
      return problems;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async createProblemWithTransaction(
    queryRunner: QueryRunner,
    createProblemDto: CreateProblemDto,
    user: JwtPayload,
  ): Promise<Problem> {
    const tags = await queryRunner.manager.find(Tag, {
      where: { id: In(createProblemDto.tags) },
      select: ['id'],
    });
    if (tags.length !== createProblemDto.tags.length) {
      throw new BadRequestException('Some tags are invalid');
    }

    const topics = await queryRunner.manager.find(Topic, {
      where: { id: In(createProblemDto.topics) },
      select: ['id'],
    });
    if (topics.length !== createProblemDto.topics.length) {
      throw new BadRequestException('Some topics are invalid');
    }

    const testcase = await queryRunner.manager.findOneOrFail(Testcase, {
      where: { id: createProblemDto.testcase },
      select: ['id'],
    });

    const problem = queryRunner.manager.create(Problem, {
      ...createProblemDto,
      author: { id: user.userId },
      testcase,
      courseProblems: [{ course: { id: user.courseId } }],
      problemTags: tags.map((tag) => ({ tag })),
      problemTopics: topics.map((topic) => ({ topic })),
    });

    await queryRunner.manager.save(Problem, problem);

    return problem;
  }

  async find(query: ProblemsCursorQueryDto) {
    const { limit, isBackward } = this.validateAndGetPagination(query);
    const queryBuilder = this.buildBaseQuery();
    this.applyFilters(queryBuilder, query);

    await this.applyCursorPagination(queryBuilder, query, isBackward);

    queryBuilder.take(limit + 1);

    const items = await queryBuilder.getMany();
    return this.buildPaginatedResult(items, limit, isBackward, query);
  }

  private validateAndGetPagination(query: ProblemsCursorQueryDto) {
    const isBackward = !!query?.before && !query?.after;
    const limit = isBackward ? query?.last : query?.first;

    if (!limit || limit > this.MAX_PAGE_SIZE) {
      throw new BadRequestException(
        `Limit must be between 1 and ${this.MAX_PAGE_SIZE}`,
      );
    }

    return { limit, isBackward };
  }

  private buildBaseQuery() {
    return this.problemsRepository
      .createQueryBuilder('problem')
      .leftJoin('problem.problemTags', 'problemTags')
      .leftJoin('problem.problemTopics', 'problemTopics');
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<Problem>,
    query: ProblemsCursorQueryDto,
  ) {
    if (query?.keyword) {
      queryBuilder.where(
        `"problem"."tsv" @@ websearch_to_tsquery('simple', unaccent(:keyword))`,
        { keyword: query.keyword },
      );
    }

    if (query?.filters?.difficulty) {
      queryBuilder.andWhere('problem.difficulty = :difficulty', {
        difficulty: query.filters.difficulty,
      });
    }

    if (query?.filters?.topics) {
      queryBuilder.andWhere('problemTopics.topic IN (:...topicIds)', {
        topicIds: query.filters.topics,
      });
    }

    if (query?.filters?.tags && query.filters.tags.length > 0) {
      queryBuilder.andWhere('problemTags.tag IN (:...tagIds)', {
        tagIds: query.filters.tags,
      });
    }
  }

  private async applyCursorPagination(
    queryBuilder: SelectQueryBuilder<Problem>,
    query: ProblemsCursorQueryDto,
    isBackward: boolean,
  ) {
    const sortBy = query?.sortBy;
    const naturalOrder = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

    let operator: '>' | '<' = '>';
    if (query?.after) {
      operator = naturalOrder === 'ASC' ? '>' : '<';
    } else if (query?.before) {
      operator = naturalOrder === 'ASC' ? '<' : '>';
    }

    let effectiveOrder: 'ASC' | 'DESC';
    if (isBackward) {
      effectiveOrder = naturalOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      effectiveOrder = naturalOrder;
    }

    if (query?.after || query?.before) {
      const cursor = await this.getAndValidateCursorPayload(
        query?.after ?? (query?.before as string),
      );

      queryBuilder.andWhere(
        `(problem.${sortBy}, problem.id) ${operator} (:cursorValue, :cursorId)`,
        {
          cursorValue: cursor[sortBy],
          cursorId: cursor.id,
        },
      );
    }

    queryBuilder
      .orderBy(`problem.${sortBy}`, effectiveOrder)
      .addOrderBy('problem.id', effectiveOrder);
  }

  private async getAndValidateCursorPayload(
    payload: string,
  ): Promise<ProblemCursorFieldsDto> {
    const cursorRaw = decodeCursor(payload) as Record<string, any>;
    const cursor = plainToInstance(ProblemCursorFieldsDto, cursorRaw);
    const errors = await validate(cursor);
    if (errors.length > 0) {
      throw new BadRequestException('Invalid cursor');
    }

    return cursor;
  }

  private async buildPaginatedResult(
    items: Problem[],
    limit: number,
    isBackward: boolean,
    query: ProblemsCursorQueryDto,
  ): Promise<CursorPaginated<Problem>> {
    const hasMore = items.length > limit;
    if (hasMore) {
      items.pop();
    }

    if (isBackward) {
      items.reverse();
    }

    const edges = items.map((item) => ({
      node: item,
      cursor: encodeCursor({
        id: item.id,
        [query.sortBy]: item[query.sortBy] as string,
      }),
    }));

    const startCursor = edges.length > 0 ? edges[0].cursor : null;
    const endCursor = edges.length > 0 ? edges?.at(-1)?.cursor : null;

    const hasNextPage = isBackward ? !!query.before : hasMore;
    const hasPreviousPage = isBackward ? hasMore : !!query.after;

    const totalCount = await this.getTotalCountWithFilters(query);

    return {
      edges,
      pageInfos: {
        hasNextPage,
        hasPreviousPage,
        startCursor,
        endCursor,
      },
      totalCount,
    } as CursorPaginated<Problem>;
  }

  private async getTotalCountWithFilters(
    query: ProblemsCursorQueryDto,
  ): Promise<number> {
    const queryBuilder = this.buildBaseQuery();
    this.applyFilters(queryBuilder, query);
    const raw = (await queryBuilder
      .select('COUNT(DISTINCT problem.id)', 'count')
      .getRawOne()) as { count: string };
    return Number.parseInt(raw.count, 10);
  }

  async findById(id: string, select?: FindOptionsSelect<Problem>) {
    return await this.problemsRepository.findOne({ where: { id }, select });
  }

  async update(id: string, updateProblemDto: UpdateProblemDto) {
    await this.problemsRepository.update(id, {
      ...updateProblemDto,
      problemTags: updateProblemDto.tags?.map((tagId) => ({
        tag: { id: tagId },
      })),
      problemTopics: updateProblemDto.topics?.map((topicId) => ({
        topic: { id: topicId },
      })),
      testcase: updateProblemDto.testcase
        ? { id: updateProblemDto.testcase }
        : undefined,
    });
  }

  async remove(id: string) {
    await this.problemsRepository.delete(id);
  }
}
