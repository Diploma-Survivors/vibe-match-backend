import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MatchMode } from 'src/common/pagination/enums/match-mode.enum';
import { SortOrder } from 'src/common/pagination/enums/sort-order.enum';
import { CursorPaginated } from 'src/common/pagination/interfaces/cursor-paginated.interface';
import { decodeCursor, encodeCursor } from 'src/common/utils/cursor-query.util';
import {
  Brackets,
  FindOptionsSelect,
  FindOptionsWhere,
  In,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { SelectQueryBuilder } from 'typeorm/browser';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';
import type { JwtPayload } from '../auth/interfaces/jwt.interface';
import { StoragesService } from '../storages/storages.service';
import { SubmissionService } from '../submission/submission.service';
import { UserService } from '../user/user.service';
import { CreateProblemDto } from './dto/create-problem.dto';
import { GetProblemsResponseDto } from './dto/get-problems-response.dto';
import {
  ProblemCursorFieldsDto,
  ProblemsCursorQueryDto,
} from './dto/problems-cursor-query.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { ProblemTag } from './entities/problem-tag.entity';
import { ProblemTopic } from './entities/problem-topic.entity';
import { Problem } from './entities/problem.entity';
import { ProblemType } from './enums/problem-type.enum';
import { SortBy } from './enums/sort-by.enum';
import { TagsService } from './tags/tags.service';
import { TestcasesService } from './testcases/testcases.service';
import { TopicsService } from './topics/topics.service';

@Injectable()
export class ProblemsService {
  private readonly logger = new Logger(ProblemsService.name);
  private readonly MAX_PAGE_SIZE = 100;
  private readonly SELECTABLE_PROBLEM_TYPES = [
    ProblemType.STANDALONE,
    ProblemType.HYBRID,
  ];

  constructor(
    @InjectRepository(Problem)
    private readonly problemsRepository: Repository<Problem>,
    @InjectRepository(ProblemTag)
    private readonly problemTagsRepository: Repository<ProblemTag>,
    @InjectRepository(ProblemTopic)
    private readonly problemTopicsRepository: Repository<ProblemTopic>,
    private readonly tagsService: TagsService,
    private readonly topicsService: TopicsService,
    private readonly testcasesService: TestcasesService,
    private readonly userService: UserService,
    private readonly submissionService: SubmissionService,
    private readonly storagesService: StoragesService,
  ) {}

  getQueryBuilder(): SelectQueryBuilder<Problem> {
    return this.problemsRepository.createQueryBuilder('problem');
  }

  async getDetailProblemForInstructor(id: number, currentUser: JwtPayload) {
    const queryBuilder = this.getQueryBuilder();

    const problem = await queryBuilder
      .leftJoin('problem.courseProblems', 'courseProblem')
      .where('problem.id = :id', { id })
      .andWhere('courseProblem.courseId = :courseId', {
        courseId: currentUser.courseId,
      })
      .select(['problem'])
      .distinct(true)
      .getOne();

    if (!problem) {
      throw new ForbiddenException('You do not have access to this problem');
    }

    const author = await this.userService.findOne({
      where: { id: problem.authorId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!author) {
      throw new BadRequestException('Author not found');
    }

    const tags = await this.tagsService.find({
      where: { problemTags: { problemId: problem.id } },
      select: ['id', 'name'],
    });

    const topics = await this.topicsService.find({
      where: { problemTopics: { problemId: problem.id } },
      select: ['id', 'name'],
    });

    const testcase = await this.testcasesService.findTestcaseOne({
      where: { problemId: problem.id },
      select: ['id', 'fileUrl'],
    });

    if (!testcase) {
      throw new BadRequestException('Testcase not found');
    }

    const testcaseSamples = await this.testcasesService.findTestcaseSamples({
      where: { problemId: problem.id },
      select: ['id', 'input', 'output'],
    });

    const quickStats =
      await this.submissionService.getStatisticsByProblemId(id);

    const detailProblem = {
      ...problem,
      author,
      tags,
      topics,
      testcase,
      testcaseSamples,
      quickStats,
    };

    return detailProblem;
  }

  @Transactional()
  async create(
    createProblemDto: CreateProblemDto,
    user: JwtPayload,
    testcaseFile: Express.Multer.File,
  ) {
    const tags = await this.tagsService.find({
      where: { id: In(createProblemDto.tags) },
      select: ['id'],
    });
    if (tags.length !== createProblemDto.tags.length) {
      throw new BadRequestException('Some tags are invalid');
    }

    const topics = await this.topicsService.find({
      where: { id: In(createProblemDto.topics) },
      select: ['id'],
    });
    if (topics.length !== createProblemDto.topics.length) {
      throw new BadRequestException('Some topics are invalid');
    }

    const problem = this.problemsRepository.create({
      ...createProblemDto,
      authorId: user.userId,
      testcase: undefined,
      courseProblems: [{ course: { id: user.courseId } }],
      problemTags: tags.map((tag) => ({ tag })),
      problemTopics: topics.map((topic) => ({ topic })),
    });
    const problemSaved = await this.problemsRepository.save(problem);

    await this.testcasesService.uploadAndSaveFileTestcase(
      testcaseFile,
      user,
      problemSaved.id,
    );

    return problemSaved;
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
        config,
      );
    }

    const items = await this.findProblemByIds(ids, sortConfig);
    return this.buildPaginatedResult(
      items,
      pagination.limit,
      pagination.isBackward,
      query,
      config,
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
    const queryBuilder = this.getQueryBuilder();

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

    return queryBuilder;
  }

  private applyStudentFilter(
    queryBuilder: SelectQueryBuilder<Problem>,
    courseId: number,
  ) {
    queryBuilder.where(
      '(problem.type IN (:...types) AND courseProblem.courseId = :courseId)',
      {
        types: this.SELECTABLE_PROBLEM_TYPES,
        courseId,
      },
    );
  }

  private applyAssignmentCreationFilter(
    queryBuilder: SelectQueryBuilder<Problem>,
  ) {
    queryBuilder.where('problem.type IN (:...types)', {
      types: this.SELECTABLE_PROBLEM_TYPES,
    });
  }

  private applyContestCreationFilter(
    queryBuilder: SelectQueryBuilder<Problem>,
    courseId: number,
  ) {
    queryBuilder.where(
      '(problem.type IN (:...types) OR (courseProblem.courseId = :courseId AND contestProblem.id IS NULL))',
      {
        types: this.SELECTABLE_PROBLEM_TYPES,
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
    const naturalOrder: 'ASC' | 'DESC' =
      query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
    const operator = this.determineCursorOperator(query, naturalOrder);

    // Reverse sort order for backward pagination
    const reversedOrder: 'ASC' | 'DESC' =
      naturalOrder === 'ASC' ? 'DESC' : 'ASC';
    const sortOrder: 'ASC' | 'DESC' = isBackward ? reversedOrder : naturalOrder;

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
    const filters = [
      {
        value: query?.filters?.difficulty,
        condition: 'problem.difficulty = :difficulty',
        params: { difficulty: query?.filters?.difficulty },
      },
      {
        value: query?.filters?.type,
        condition: 'problem.type = :type',
        params: { type: query?.filters?.type },
      },
      {
        value: query?.filters?.topics,
        condition: 'problemTopic.topic IN (:...topicIds)',
        params: { topicIds: query?.filters?.topics },
        checkLength: true,
      },
      {
        value: query?.filters?.tags,
        condition: 'problemTag.tag IN (:...tagIds)',
        params: { tagIds: query?.filters?.tags },
        checkLength: true,
      },
    ];

    for (const filter of filters) {
      const shouldApply = filter.checkLength
        ? Array.isArray(filter.value) && filter.value.length > 0
        : !!filter.value;

      if (shouldApply) {
        where(filter.condition, filter.params);
      }
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
    config: {
      joins: string[];
      filterFn: (qb: SelectQueryBuilder<Problem>) => void;
    },
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

    const totalCount = await this.getTotalCountWithFilters(query, config);

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
    const queryBuilder = this.getQueryBuilder();

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
    config: {
      joins: string[];
      filterFn: (qb: SelectQueryBuilder<Problem>) => void;
    },
  ): Promise<number> {
    const queryBuilder = this.buildBaseQuery(config.joins);

    config.filterFn(queryBuilder);
    this.applyMatchFilters(queryBuilder, query);

    const raw = (await queryBuilder
      .select('COUNT(DISTINCT problem.id)', 'count')
      .getRawOne()) as { count: string };
    return Number.parseInt(raw.count, 10);
  }

  async findById(id: number, select?: FindOptionsSelect<Problem>) {
    return await this.problemsRepository.findOne({ where: { id }, select });
  }

  async findDetailProblemById(id: number, currentUser: JwtPayload) {
    const problem = await this.problemsRepository.findOne({
      where: { id },
      relations: ['testcaseSamples', 'courseProblems'],
    });
    if (!problem) {
      throw new BadRequestException('Problem not found');
    }

    const isAccessible = problem.courseProblems.some(
      (cp) => cp.courseId === currentUser.courseId,
    );

    if (!isAccessible) {
      throw new ForbiddenException('You do not have access to this problem');
    }

    return problem;
  }

  @Transactional()
  async updateById(
    id: number,
    updateProblemDto: UpdateProblemDto,
    currentUser: JwtPayload,
    testcaseFile?: Express.Multer.File,
  ) {
    const problem = await this.findById(id, {
      id: true,
      authorId: true,
    });
    if (!problem || problem.authorId !== currentUser.userId) {
      throw new ForbiddenException('You do not have access to this problem');
    }

    const { tags, topics, testcaseSamples, ...restDto } = updateProblemDto;

    await this.problemsRepository.update(id, {
      ...restDto,
      testcase: undefined,
    });

    if (tags) {
      const existingTags = await this.problemTagsRepository.find({
        where: { problemId: id },
      });
      const toDeleteTags = existingTags.filter((t) => !tags.includes(t.tagId));
      const toAddTags = tags.filter(
        (tagId) => !existingTags.some((t) => t.tagId === tagId),
      );

      if (toDeleteTags.length > 0) {
        await this.problemTagsRepository.delete(toDeleteTags);
      }

      if (toAddTags.length > 0) {
        const newProblemTags = toAddTags.map((tagId) =>
          this.problemTagsRepository.create({ problemId: id, tagId }),
        );
        await this.problemTagsRepository.save(newProblemTags);
      }
    }

    if (topics) {
      const existingTopics = await this.problemTopicsRepository.find({
        where: { problemId: id },
      });
      const toDeleteTopics = existingTopics.filter(
        (t) => !topics.includes(t.topicId),
      );
      const toAddTopics = topics.filter(
        (topicId) => !existingTopics.some((t) => t.topicId === topicId),
      );

      if (toDeleteTopics.length > 0) {
        await this.problemTopicsRepository.delete(toDeleteTopics);
      }

      if (toAddTopics.length > 0) {
        const newProblemTopics = toAddTopics.map((topicId) =>
          this.problemTopicsRepository.create({ problemId: id, topicId }),
        );
        await this.problemTopicsRepository.save(newProblemTopics);
      }
    }

    if (testcaseSamples) {
      await Promise.all(
        testcaseSamples.map(async (sample) => {
          if (sample?.id) {
            await this.testcasesService.updateTestcaseSample(
              { id: sample.id, problemId: id },
              { input: sample.input, output: sample.output },
            );
          } else {
            await this.testcasesService.createTestcaseSample({
              problemId: id,
              input: sample.input,
              output: sample.output,
            });
          }
        }),
      );
    }

    if (!testcaseFile) {
      return;
    }

    const existingTestcase = await this.testcasesService.findTestcaseOne({
      where: { problemId: id },
      select: ['id', 'fileUrl'],
    });
    if (!existingTestcase) {
      throw new BadRequestException('Testcase not found');
    }

    const keyS3 = this.storagesService.getKeyFromUrl(existingTestcase.fileUrl);
    await this.testcasesService.uploadAndSaveFileTestcase(
      testcaseFile,
      currentUser,
      id,
      keyS3,
    );
  }

  async update(
    where: FindOptionsWhere<Problem>,
    updateData: QueryDeepPartialEntity<Problem>,
  ) {
    await this.problemsRepository.update(where, updateData);
  }

  async remove(id: string) {
    await this.problemsRepository.delete(id);
  }
}
