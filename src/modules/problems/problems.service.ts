import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
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
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { QueryRunner, SelectQueryBuilder } from 'typeorm/browser';
import { v4 as uuidV4 } from 'uuid';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { StoragesService } from '../storages/storages.service';
import { TESTCASE_FILE_EXTENSION } from './constants/testcase.constant';
import { CreateProblemDto } from './dto/create-problem.dto';
import { GetProblemsResponseDto } from './dto/get-problems-response.dto';
import {
  ProblemCursorFieldsDto,
  ProblemsCursorQueryDto,
} from './dto/problems-cursor-query.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { Problem } from './entities/problem.entity';
import { ProblemType } from './enums/problem-type.enum';
import { SortBy } from './enums/sort-by.enum';
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
    @InjectDataSource()
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

  async findProblemsByStudent(
    query: ProblemsCursorQueryDto,
    currentUser: JwtPayload,
  ) {
    return this.findProblemsWithPagination(query, {
      joins: ['courseProblem', 'problemTag', 'problemTopic'],
      filterFn: (qb) => this.applyStudentFilter(qb, currentUser.courseId!),
    });
  }

  async findProblemsForAssignmentCreation(query: ProblemsCursorQueryDto) {
    return this.findProblemsWithPagination(query, {
      joins: ['problemTag', 'problemTopic'],
      filterFn: (qb) => this.applyAssignmentCreationFilter(qb),
    });
  }

  async findProblemsForContestCreation(
    query: ProblemsCursorQueryDto,
    currentUser: JwtPayload,
  ) {
    return this.findProblemsWithPagination(query, {
      joins: ['courseProblem', 'contestProblem', 'problemTag', 'problemTopic'],
      filterFn: (qb) =>
        this.applyContestCreationFilter(qb, currentUser.courseId!),
    });
  }

  private async findProblemsWithPagination(
    query: ProblemsCursorQueryDto,
    config: {
      joins: string[];
      filterFn: (qb: SelectQueryBuilder<Problem>) => void;
    },
  ) {
    const pagination = this.validateAndGetPagination(query);
    const sortConfig = this.buildSortConfiguration(
      query,
      pagination.isBackward,
    );

    const ids = await this.findProblemIds(
      query,
      pagination.limit,
      sortConfig,
      config,
    );

    if (ids.length === 0) {
      return this.buildPaginatedResult(
        [],
        pagination.limit,
        pagination.isBackward,
        query,
      );
    }

    const items = await this.findProblemByIds(ids, sortConfig);
    return this.buildPaginatedResult(
      items,
      pagination.limit,
      pagination.isBackward,
      query,
    );
  }

  private async findProblemIds(
    query: ProblemsCursorQueryDto,
    limit: number,
    sortConfig: {
      sortBy: SortBy;
      sortOrder: 'ASC' | 'DESC';
      operator: '<' | '>';
    },
    config: {
      joins: string[];
      filterFn: (qb: SelectQueryBuilder<Problem>) => void;
    },
  ) {
    const queryBuilder = this.buildBaseQuery(config.joins);

    config.filterFn(queryBuilder);
    this.applyMatchFilters(queryBuilder, query);

    await this.applyCursorPagination(queryBuilder, query, sortConfig);

    queryBuilder
      .select('problem.id', 'id')
      .addSelect(`problem.${sortConfig.sortBy}`, sortConfig.sortBy)
      .distinct(true)
      .limit(limit + 1);

    const items = await queryBuilder.getRawMany<{
      id: string;
      [key: string]: any;
    }>();
    this.logger.debug(`Found problem IDs: ${JSON.stringify(items)}`);

    return items.map((item) => item.id);
  }

  private buildBaseQuery(joins: string[]) {
    const queryBuilder = this.dataSource.createQueryBuilder(Problem, 'problem');

    const joinMap: Record<string, string> = {
      courseProblem: 'problem.courseProblems',
      contestProblem: 'problem.contestProblems',
      problemTag: 'problem.problemTags',
      problemTopic: 'problem.problemTopics',
    };

    for (const join of joins) {
      if (joinMap[join]) {
        queryBuilder.leftJoin(joinMap[join], join);
      }
    }

    joins.forEach((join) => {
      if (joinMap[join]) {
        queryBuilder.leftJoin(joinMap[join], join);
      }
    });

    return queryBuilder;
  }

  private applyStudentFilter(
    queryBuilder: SelectQueryBuilder<Problem>,
    courseId: string,
  ) {
    queryBuilder.where(
      '(problem.type IN (:...types) AND courseProblem.course = :courseId)',
      {
        types: [ProblemType.STANDALONE, ProblemType.HYBRID],
        courseId,
      },
    );
  }

  private applyAssignmentCreationFilter(
    queryBuilder: SelectQueryBuilder<Problem>,
  ) {
    queryBuilder.where('problem.type IN (:...types)', {
      types: [ProblemType.STANDALONE, ProblemType.HYBRID],
    });
  }

  private applyContestCreationFilter(
    queryBuilder: SelectQueryBuilder<Problem>,
    courseId: string,
  ) {
    queryBuilder.where(
      '(problem.type IN (:...types) OR (courseProblem.course = :courseId AND contestProblem.id IS NULL))',
      {
        types: [ProblemType.STANDALONE, ProblemType.HYBRID],
        courseId,
      },
    );
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

  private buildSortConfiguration(
    query: ProblemsCursorQueryDto,
    isBackward: boolean,
  ) {
    const sortBy = query?.sortBy;
    const naturalOrder = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

    const operator = this.determineCursorOperator(query, naturalOrder);

    let sortOrder: 'ASC' | 'DESC';
    if (isBackward) {
      sortOrder = naturalOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      sortOrder = naturalOrder;
    }

    return { sortBy, sortOrder, operator };
  }

  private determineCursorOperator(
    query: ProblemsCursorQueryDto,
    naturalOrder: 'ASC' | 'DESC',
  ): '>' | '<' {
    if (query?.after) {
      return naturalOrder === 'ASC' ? '>' : '<';
    }

    if (query?.before) {
      return naturalOrder === 'ASC' ? '<' : '>';
    }

    return '>';
  }

  private applyKeywordFilter(
    queryBuilder: SelectQueryBuilder<Problem>,
    keyword?: string,
  ) {
    if (keyword) {
      queryBuilder.andWhere(
        `"problem"."tsv" @@ websearch_to_tsquery('simple', unaccent(:keyword))`,
        { keyword },
      );
    }
  }

  private applyMatchFilters(
    queryBuilder: SelectQueryBuilder<Problem>,
    query: ProblemsCursorQueryDto,
  ) {
    this.applyKeywordFilter(queryBuilder, query?.keyword);

    const hasFilters =
      !!query?.filters?.difficulty ||
      !!query?.filters?.type ||
      (query?.filters?.topics && query.filters.topics.length > 0) ||
      (query?.filters?.tags && query.filters.tags.length > 0);

    if (!hasFilters) {
      return;
    }

    let filterBracket!: Brackets;

    if (query.matchMode === MatchMode.ALL) {
      filterBracket = new Brackets((qb) => {
        this.applyIndividualFilters(
          qb.andWhere.bind(qb) as (
            condition: string,
            parameters?: ObjectLiteral,
          ) => SelectQueryBuilder<Problem>,
          query,
        );
      });
    } else if (query.matchMode === MatchMode.ANY) {
      filterBracket = new Brackets((qb) => {
        this.applyIndividualFilters(
          qb.orWhere.bind(qb) as (
            condition: string,
            parameters?: ObjectLiteral,
          ) => SelectQueryBuilder<Problem>,
          query,
        );
      });
    }

    queryBuilder.andWhere(filterBracket);
  }

  private applyIndividualFilters(
    where: (
      condition: string,
      parameters?: ObjectLiteral,
    ) => SelectQueryBuilder<Problem>,
    query: ProblemsCursorQueryDto,
  ) {
    if (query?.filters?.difficulty) {
      where('problem.difficulty = :difficulty', {
        difficulty: query.filters.difficulty,
      });
    }

    if (query?.filters?.type) {
      where('problem.type = :type', {
        type: query.filters.type,
      });
    }

    if (query?.filters?.topics && query.filters.topics.length > 0) {
      where('problemTopic.topic IN (:...topicIds)', {
        topicIds: query.filters.topics,
      });
    }

    if (query?.filters?.tags && query.filters.tags.length > 0) {
      where('problemTag.tag IN (:...tagIds)', {
        tagIds: query.filters.tags,
      });
    }
  }

  private async applyCursorPagination(
    queryBuilder: SelectQueryBuilder<Problem>,
    query: ProblemsCursorQueryDto,
    sortConfig: {
      sortBy: SortBy;
      sortOrder: 'ASC' | 'DESC';
      operator: '<' | '>';
    },
  ) {
    if (query?.after || query?.before) {
      const cursor = await this.getAndValidateCursorPayload(
        query?.after ?? (query?.before as string),
      );
      this.logger.debug(`Decoded cursor: ${JSON.stringify(cursor)}`);

      queryBuilder.andWhere(
        `(problem.${sortConfig.sortBy}, problem.id) ${sortConfig.operator} (:cursorValue, :cursorId)`,
        {
          cursorValue: cursor[sortConfig.sortBy],
          cursorId: cursor.id,
        },
      );
    }

    queryBuilder
      .orderBy(`problem.${sortConfig.sortBy}`, sortConfig.sortOrder)
      .addOrderBy('problem.id', sortConfig.sortOrder);
  }

  private async buildPaginatedResult(
    items: GetProblemsResponseDto[],
    limit: number,
    isBackward: boolean,
    query: ProblemsCursorQueryDto,
  ): Promise<CursorPaginated<GetProblemsResponseDto>> {
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
    } as CursorPaginated<GetProblemsResponseDto>;
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

  private async findProblemByIds(
    ids: string[],
    sortConfig: {
      sortBy: SortBy;
      sortOrder: 'ASC' | 'DESC';
    },
  ) {
    const queryBuilder = this.dataSource.createQueryBuilder(Problem, 'problem');

    queryBuilder.where('problem.id IN (:...ids)', { ids });

    this.selectFieldsForProblem(queryBuilder, sortConfig.sortBy);

    queryBuilder
      .orderBy(`problem.${sortConfig.sortBy}`, sortConfig.sortOrder)
      .addOrderBy('problem.id', sortConfig.sortOrder);

    return queryBuilder.getRawMany<GetProblemsResponseDto>();
  }

  private selectFieldsForProblem(
    queryBuilder: SelectQueryBuilder<Problem>,
    sortBy: SortBy,
  ) {
    queryBuilder.select([
      'problem.id AS id',
      'problem.title AS title',
      'problem.difficulty AS difficulty',
      `problem.${sortBy} AS "${sortBy}"`,

      // subquery for tags
      `(SELECT COALESCE(json_agg(jsonb_build_object('id', tag.tag_id, 'name', tag.name)), '[]')
          FROM problem_tags problemTag
          JOIN tags tag ON problemTag.tag_id = tag.tag_id
          WHERE problemTag.problem_id = problem.problem_id
        ) AS tags`,

      // subquery for topics
      `(SELECT COALESCE(json_agg(jsonb_build_object('id', topic.topic_id, 'name', topic.name)), '[]')
          FROM problem_topics problemTopic
          JOIN topics topic ON problemTopic.topic_id = topic.topic_id
          WHERE problemTopic.problem_id = problem.problem_id
        ) AS topics`,
    ]);
  }

  private async getTotalCountWithFilters(
    query: ProblemsCursorQueryDto,
  ): Promise<number> {
    const queryBuilder = this.buildBaseQuery([
      'courseProblem',
      'contestProblem',
      'problemTag',
      'problemTopic',
    ]);

    this.applyKeywordFilter(queryBuilder, query?.keyword);
    this.applyMatchFilters(queryBuilder, query);

    const raw = (await queryBuilder
      .select('COUNT(DISTINCT problem.id)', 'count')
      .getRawOne()) as { count: string };
    return Number.parseInt(raw.count, 10);
  }

  async findById(id: string, select?: FindOptionsSelect<Problem>) {
    return await this.problemsRepository.findOne({ where: { id }, select });
  }

  async findDetailProblemById(id: string, currentUser: JwtPayload) {
    const problem = await this.problemsRepository.findOne({
      where: { id },
      relations: ['testcaseSamples', 'courseProblems', 'courseProblems.course'],
    });
    if (!problem) {
      throw new BadRequestException('Problem not found');
    }

    const isAccessible = problem.courseProblems.some(
      (cp) => cp.course.id === currentUser.courseId,
    );

    if (!isAccessible) {
      throw new ForbiddenException('You do not have access to this problem');
    }

    return problem;
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
