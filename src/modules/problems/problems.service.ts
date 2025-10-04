import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MatchMode } from 'src/common/pagination/enums/match-mode.enum';
import { SortOrder } from 'src/common/pagination/enums/sort-order.enum';
import { CursorPaginated } from 'src/common/pagination/interfaces/cursor-paginated.interface';
import { decodeCursor, encodeCursor } from 'src/common/utils/cursor-query.util';
import {
  Brackets,
  DataSource,
  FindOptionsSelect,
  In,
  Repository,
} from 'typeorm';
import { QueryRunner, SelectQueryBuilder } from 'typeorm/browser';
import { v4 as uuidV4 } from 'uuid';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { StoragesService } from '../storages/storages.service';
import { TESTCASE_FILE_EXTENSION } from './constants/testcase.constant';
import { CreateProblemDto } from './dto/create-problem.dto';
import { GetProblemResponseDto } from './dto/get-problem-response.dto';
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
    private readonly configService: ConfigService,
    private readonly storagesService: StoragesService,
  ) {}

  async create(
    createProblemDto: CreateProblemDto,
    user: JwtPayload,
    testcaseFile: Express.Multer.File,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const problem = await this.createProblemWithTransaction(
        queryRunner,
        createProblemDto,
        user,
        testcaseFile,
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

  private async uploadAndSaveFileTestcase(
    queryRunner: QueryRunner,
    file: Express.Multer.File,
    currentUser: JwtPayload,
  ) {
    const seed = uuidV4();
    const key = `${seed}_${currentUser.userId}_${currentUser.courseId}${TESTCASE_FILE_EXTENSION}`;
    const bucket = this.configService.get<string>(
      'aws.s3.bucketName',
    ) as string;

    await this.storagesService.upload({
      bucket,
      key,
      file: file.buffer,
    });

    const url = this.storagesService.getObjectUrl(bucket, key);

    const testcase = queryRunner.manager.create(Testcase, {
      fileUrl: url,
    });
    return queryRunner.manager.save(Testcase, testcase);
  }

  private async createProblemWithTransaction(
    queryRunner: QueryRunner,
    createProblemDto: CreateProblemDto,
    user: JwtPayload,
    testcaseFile: Express.Multer.File,
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

    const testcase = await this.uploadAndSaveFileTestcase(
      queryRunner,
      testcaseFile,
      user,
    );

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

    if (query.matchMode === MatchMode.ALL) {
      this.applyMatchAllFilters(queryBuilder, query);
    } else if (query.matchMode === MatchMode.ANY) {
      this.applyMatchAnyFilters(queryBuilder, query);
    }

    await this.applyCursorPagination(queryBuilder, query, isBackward);

    queryBuilder.take(limit + 1);

    queryBuilder
      .select([
        'problem.id AS id',
        'problem.title AS title',
        'problem.difficulty AS difficulty',
        `COALESCE(json_agg(DISTINCT jsonb_build_object('id', tag.id, 'name', tag.name))
         FILTER (WHERE tag.id IS NOT NULL), '[]') AS tags`,
        `COALESCE(json_agg(DISTINCT jsonb_build_object('id', topic.id, 'name', topic.name)) 
         FILTER (WHERE topic.id IS NOT NULL), '[]') AS topics`,
      ])
      .groupBy('problem.id');

    const items = await queryBuilder.getRawMany<GetProblemResponseDto>();
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
      .leftJoin('problemTags.tag', 'tag')
      .leftJoin('problem.problemTopics', 'problemTopics')
      .leftJoin('problemTopics.topic', 'topic');
  }

  private applyMatchAllFilters(
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

    if (query?.filters?.type) {
      queryBuilder.andWhere('problem.type = :type', {
        type: query.filters.type,
      });
    }

    if (query?.filters?.topics && query.filters.topics.length > 0) {
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

  private applyMatchAnyFilters(
    queryBuilder: SelectQueryBuilder<Problem>,
    query: ProblemsCursorQueryDto,
  ) {
    if (query?.keyword) {
      queryBuilder.where(
        `"problem"."tsv" @@ websearch_to_tsquery('simple', unaccent(:keyword))`,
        { keyword: query.keyword },
      );
    }

    if (
      !query?.filters?.difficulty &&
      !query?.filters?.type &&
      (!query?.filters?.topics || query.filters.topics.length === 0) &&
      (!query?.filters?.tags || query.filters.tags.length === 0)
    ) {
      return;
    }

    const subQuery = new Brackets((qb) => {
      if (query?.filters?.difficulty) {
        qb.where('problem.difficulty = :difficulty', {
          difficulty: query.filters.difficulty,
        });
      }

      if (query?.filters?.type) {
        qb.orWhere('problem.type = :type', {
          type: query.filters.type,
        });
      }

      if (query?.filters?.topics && query.filters.topics.length > 0) {
        qb.orWhere('problemTopics.topic IN (:...topicIds)', {
          topicIds: query.filters.topics,
        });
      }

      if (query?.filters?.tags && query.filters.tags.length > 0) {
        qb.orWhere('problemTags.tag IN (:...tagIds)', {
          tagIds: query.filters.tags,
        });
      }
    });

    queryBuilder.andWhere(subQuery);
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
    items: GetProblemResponseDto[],
    limit: number,
    isBackward: boolean,
    query: ProblemsCursorQueryDto,
  ): Promise<CursorPaginated<GetProblemResponseDto>> {
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
    } as CursorPaginated<GetProblemResponseDto>;
  }

  private async getTotalCountWithFilters(
    query: ProblemsCursorQueryDto,
  ): Promise<number> {
    const queryBuilder = this.buildBaseQuery();

    if (query.matchMode === MatchMode.ALL) {
      this.applyMatchAllFilters(queryBuilder, query);
    } else if (query.matchMode === MatchMode.ANY) {
      this.applyMatchAnyFilters(queryBuilder, query);
    }

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
