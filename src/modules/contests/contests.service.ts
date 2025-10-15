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
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import type { JwtPayload } from '../auth/interfaces/jwt.interface';
import { Problem } from '../problems/entities/problem.entity';
import { ProblemType } from '../problems/enums/problem-type.enum';
import { ProblemsService } from '../problems/problems.service';
import {
  ContestCursorFieldsDto,
  ContestsCursorQueryDto,
} from './dto/contests-cursor-query.dto';
import { CreateContestDto } from './dto/create-contest.dto';
import { GetContestsResponseDto } from './dto/get-contests-response.dto';
import { Contest } from './entities/contest.entity';
import { ContestStatus } from './enums/contest-status.enum';
import { SortBy } from './enums/sort-by.enum';

@Injectable()
export class ContestsService {
  private readonly MAX_PAGE_SIZE = 100;
  private readonly logger = new Logger(ContestsService.name);
  private readonly SELECTABLE_PROBLEM_TYPES = [
    ProblemType.STANDALONE,
    ProblemType.HYBRID,
  ];

  constructor(
    @InjectRepository(Contest)
    private readonly contestsRepository: Repository<Contest>,
    private readonly problemsService: ProblemsService,
  ) {}

  @Transactional()
  async createContest(createContestDto: CreateContestDto, user: JwtPayload) {
    const problems = await this.problemsService
      .getQueryBuilder()
      .leftJoin('problem.courseProblems', 'courseProblem')
      .leftJoin('problem.contestProblems', 'contestProblem')
      .where('problem.id IN (:...ids)', {
        ids: createContestDto.problems.map((problem) => problem.id),
      })
      .andWhere(
        '(problem.type IN (:...types) OR (courseProblem.courseId = :courseId AND contestProblem.id IS NULL))',
        {
          types: this.SELECTABLE_PROBLEM_TYPES,
          courseId: user.courseId,
        },
      )
      .select('problem.id', 'id')
      .addSelect('problem.type', 'type')
      .distinct(true)
      .getRawMany<Problem>();

    if (problems.length !== createContestDto.problems.length) {
      throw new BadRequestException('Some problems are invalid');
    }

    await Promise.all(
      problems.map(async (problem) => {
        if (problem.type === ProblemType.STANDALONE) {
          await this.problemsService.update(
            { id: problem.id },
            { type: ProblemType.HYBRID },
          );
        }
      }),
    );

    const contest = this.contestsRepository.create({
      ...createContestDto,
      contestProblems: createContestDto.problems.map((problem) => ({
        problemId: problem.id,
        score: problem.score,
      })),
      courseId: user.courseId,
      authorId: user.userId,
    });

    const contestSaved = await this.contestsRepository.save(contest);

    return contestSaved;
  }

  async findOne(
    where: FindOptionsWhere<Contest>,
    select?: FindOptionsSelect<Contest>,
    relations?: FindOptionsRelations<Contest>,
  ): Promise<Contest | null> {
    return this.contestsRepository.findOne({ where, select, relations });
  }

  async findContests(query: ContestsCursorQueryDto, currentUser: JwtPayload) {
    const pagination = this.validateAndGetPagination(query);
    const sortConfig = this.buildSortConfiguration(
      query,
      pagination.isBackward,
    );

    const queryBuilder = this.buildBaseQuery();

    this.applyCourseFilter(queryBuilder, currentUser.courseId!);
    this.applyMatchFilters(queryBuilder, query);

    await this.applyCursorPagination(queryBuilder, query, sortConfig);

    this.selectFieldsForContest(queryBuilder, sortConfig.sortBy);

    queryBuilder.distinct(true).limit(pagination.limit + 1);

    const items = await queryBuilder.getRawMany<GetContestsResponseDto>();
    this.logger.debug(`Raw items: ${JSON.stringify(items)}`);

    return this.buildPaginatedResult(
      items,
      pagination.limit,
      pagination.isBackward,
      query,
    );
  }

  private selectFieldsForContest(
    queryBuilder: SelectQueryBuilder<Contest>,
    sortBy: SortBy,
  ) {
    queryBuilder.select([
      'contest.id AS id',
      'contest.name AS name',
      'contest.startTime AS "startTime"',
      'contest.endTime AS "endTime"',
      'contest.durationMinutes AS "durationMinutes"',
      'contest.status AS status',
      `contest.${sortBy} AS "${sortBy}"`,
    ]);
  }

  private async buildPaginatedResult(
    items: GetContestsResponseDto[],
    limit: number,
    isBackward: boolean,
    query: ContestsCursorQueryDto,
  ) {
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
    const endCursor = edges.length > 0 ? edges.at(-1)?.cursor : null;

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
    } as CursorPaginated<GetContestsResponseDto>;
  }

  private async getTotalCountWithFilters(query: ContestsCursorQueryDto) {
    const queryBuilder = this.buildBaseQuery();

    this.applyKeywordFilter(queryBuilder, query?.keyword);
    this.applyMatchFilters(queryBuilder, query);

    const raw = (await queryBuilder
      .select('COUNT(DISTINCT contest.id)', 'count')
      .getRawOne()) as { count: string };
    return Number.parseInt(raw.count, 10);
  }

  private buildBaseQuery() {
    return this.contestsRepository.createQueryBuilder('contest');
  }

  private applyCourseFilter(
    queryBuilder: SelectQueryBuilder<Contest>,
    courseId: number,
  ) {
    queryBuilder.andWhere(
      '(contest.status = :status OR contest.courseId = :courseId)',
      {
        status: ContestStatus.PUBLIC,
        courseId,
      },
    );
  }

  private applyMatchFilters(
    queryBuilder: SelectQueryBuilder<Contest>,
    query: ContestsCursorQueryDto,
  ) {
    this.applyKeywordFilter(queryBuilder, query?.keyword);

    const hasFilters =
      query?.filters?.startTime ||
      query?.filters?.endTime ||
      query?.filters?.minDurationMinutes ||
      query?.filters?.maxDurationMinutes;

    if (!hasFilters) {
      return;
    }

    let filterBracket!: Brackets;
    if (query.matchMode === MatchMode.ALL) {
      filterBracket = new Brackets((qb) => {
        this.applyIndividualFilters(
          qb.andWhere.bind(qb) as (
            condition: string,
            parameters: ObjectLiteral,
          ) => SelectQueryBuilder<Contest>,
          query,
        );
      });
    } else if (query.matchMode === MatchMode.ANY) {
      filterBracket = new Brackets((qb) => {
        this.applyIndividualFilters(
          qb.orWhere.bind(qb) as (
            condition: string,
            parameters: ObjectLiteral,
          ) => SelectQueryBuilder<Contest>,
          query,
        );
      });
    }

    queryBuilder.andWhere(filterBracket);
  }

  private applyIndividualFilters(
    where: (
      condition: string,
      parameters: ObjectLiteral,
    ) => SelectQueryBuilder<Contest>,
    query: ContestsCursorQueryDto,
  ) {
    const filters = [
      {
        value: query?.filters?.startTime,
        condition: 'contest.startTime >= :startTime',
        params: { startTime: query?.filters?.startTime },
      },
      {
        value: query?.filters?.endTime,
        condition: 'contest.endTime <= :endTime',
        params: { endTime: query?.filters?.endTime },
      },
      {
        value: query?.filters?.minDurationMinutes,
        condition: 'contest.durationMinutes >= :minDurationMinutes',
        params: { minDurationMinutes: query?.filters?.minDurationMinutes },
      },
      {
        value: query?.filters?.maxDurationMinutes,
        condition: 'contest.durationMinutes <= :maxDurationMinutes',
        params: { maxDurationMinutes: query?.filters?.maxDurationMinutes },
      },
    ];

    for (const filter of filters) {
      if (filter.value) {
        where(filter.condition, filter.params);
      }
    }
  }

  private applyKeywordFilter(
    queryBuilder: SelectQueryBuilder<Contest>,
    keyword?: string,
  ) {
    if (keyword) {
      queryBuilder.andWhere(
        `"contest"."tsv" @@ websearch_to_tsquery('simple', unaccent(:keyword))`,
        { keyword },
      );
    }
  }

  private async applyCursorPagination(
    queryBuilder: SelectQueryBuilder<Contest>,
    query: ContestsCursorQueryDto,
    sortConfig: {
      sortBy: SortBy;
      sortOrder: 'ASC' | 'DESC';
      operator: '>' | '<';
    },
  ) {
    if (query?.after || query?.before) {
      const cursor = await this.getAndValidateCursorPayload(
        query?.after ?? (query?.before as string),
      );
      this.logger.debug(`Decoded cursor: ${JSON.stringify(cursor)}`);

      queryBuilder.andWhere(
        `(contest.${sortConfig.sortBy}, contest.id) ${sortConfig.operator} (:cursorValue, :cursorId)`,
        {
          cursorValue: cursor[sortConfig.sortBy],
          cursorId: cursor.id,
        },
      );
    }

    queryBuilder
      .orderBy(`contest.${sortConfig.sortBy}`, sortConfig.sortOrder)
      .addOrderBy('contest.id', sortConfig.sortOrder);
  }

  private async getAndValidateCursorPayload(payload: string) {
    const cursorRaw = decodeCursor(payload) as Record<string, any>;
    const cursor = plainToInstance(ContestCursorFieldsDto, cursorRaw);
    const errors = await validate(cursor);

    if (errors.length > 0) {
      throw new BadRequestException('Invalid cursor');
    }

    return cursor;
  }

  private validateAndGetPagination(query: ContestsCursorQueryDto) {
    const isBackward = !!query.before && !query.after;
    const limit = (query.first ?? query.last) as number;

    if (limit && limit > this.MAX_PAGE_SIZE) {
      throw new BadRequestException(
        `Page size must not exceed ${this.MAX_PAGE_SIZE}`,
      );
    }

    return { limit, isBackward };
  }

  private buildSortConfiguration(
    query: ContestsCursorQueryDto,
    isBackward: boolean,
  ) {
    const sortBy = query?.sortBy;
    const naturalOrder: 'ASC' | 'DESC' =
      query?.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
    const operator = this.determineCursorOperator(query, naturalOrder);

    // Reverse sort order for backward pagination
    const reversedOrder: 'ASC' | 'DESC' =
      naturalOrder === 'ASC' ? 'DESC' : 'ASC';
    const sortOrder: 'ASC' | 'DESC' = isBackward ? reversedOrder : naturalOrder;

    return { sortBy, sortOrder, operator };
  }

  private determineCursorOperator(
    query: ContestsCursorQueryDto,
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

  async getDetailContest(id: number, currentUser: JwtPayload) {
    const contest = await this.contestsRepository.findOne({
      where: { id },
      relations: ['contestProblems', 'contestProblems.problem'],
    });
    if (!contest) {
      throw new BadRequestException('Contest not found');
    }

    const isAccessible =
      contest.status === ContestStatus.PUBLIC ||
      contest.courseId === currentUser.courseId;

    if (!isAccessible) {
      throw new ForbiddenException('You do not have access to this contest');
    }

    const problems = contest.contestProblems.map((cp) => ({
      id: cp.problem.id,
      title: cp.problem.title,
      score: cp.score,
      difficulty: cp.problem.difficulty,
      memoryLimitKb: cp.problem.memoryLimitKb,
      timeLimitMs: cp.problem.timeLimitMs,
    }));

    const sortedProblems = problems.toSorted((a, b) => {
      if (a.score === b.score) {
        return a.title.localeCompare(b.title);
      }
      return a.score - b.score;
    });

    return {
      ...contest,
      contestProblems: sortedProblems,
    };
  }
}
