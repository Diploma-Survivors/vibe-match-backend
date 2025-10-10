import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
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
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { Problem } from '../problems/entities/problem.entity';
import { ProblemType } from '../problems/enums/problem-type.enum';
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

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Contest)
    private readonly contestsRepository: Repository<Contest>,
  ) {}

  async createContest(createContestDto: CreateContestDto, user: JwtPayload) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const problems = await queryRunner.manager
        .createQueryBuilder(Problem, 'problem')
        .leftJoin('problem.courseProblems', 'courseProblem')
        .leftJoin('problem.contestProblems', 'contestProblem')
        .where('problem.id IN (:...ids)', {
          ids: createContestDto.problems.map((problem) => problem.id),
        })
        .andWhere(
          '(problem.type IN (:...types) OR (courseProblem.course = :courseId AND contestProblem.id IS NULL))',
          {
            types: [ProblemType.STANDALONE, ProblemType.HYBRID],
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
            await queryRunner.manager.update(
              Problem,
              { id: problem.id },
              { type: ProblemType.HYBRID },
            );
          }
        }),
      );

      const contest = queryRunner.manager.create(Contest, {
        ...createContestDto,
        contestProblems: createContestDto.problems.map((problem) => ({
          problem: { id: problem.id },
          score: problem.score,
        })),
        course: { id: user.courseId },
        author: { id: user.userId },
      });

      await queryRunner.manager.save(Contest, contest);
      await queryRunner.commitTransaction();

      return contest;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findOne(
    where: FindOptionsWhere<Contest>,
    select?: FindOptionsSelect<Contest>,
  ): Promise<Contest | null> {
    return this.contestsRepository.findOne({ where, select });
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
      'contest.startTime AS startTime',
      'contest.endTime AS endTime',
      'contest.durationMinutes AS durationMinutes',
      'contest.status AS status',
      `contest.${sortBy} AS sortBy`,
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
    return this.dataSource
      .createQueryBuilder(Contest, 'contest')
      .leftJoin('contest.course', 'course');
  }

  private applyCourseFilter(
    queryBuilder: SelectQueryBuilder<Contest>,
    courseId: string,
  ) {
    queryBuilder.andWhere(
      '(contest.status = :status OR course.id = :courseId)',
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
    if (query?.filters?.startTime) {
      where('contest.startTime >= :startTime', {
        startTime: query.filters.startTime,
      });
    }

    if (query?.filters?.endTime) {
      where('contest.endTime <= :endTime', { endTime: query.filters.endTime });
    }

    if (query?.filters?.minDurationMinutes) {
      where('contest.durationMinutes >= :minDurationMinutes', {
        minDurationMinutes: query.filters.minDurationMinutes,
      });
    }

    if (query?.filters?.maxDurationMinutes) {
      where('contest.durationMinutes <= :maxDurationMinutes', {
        maxDurationMinutes: query.filters.maxDurationMinutes,
      });
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
    const naturalOrder = query?.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

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

  async getDetailContest(id: string, currentUser: JwtPayload) {
    const contest = await this.contestsRepository.findOne({
      where: { id },
      relations: ['contestProblems', 'contestProblems.problem', 'course'],
    });
    if (!contest) {
      throw new BadRequestException('Contest not found');
    }

    const isAccessible =
      contest.status === ContestStatus.PUBLIC ||
      contest.course.id === currentUser.courseId;

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
