// NestJS
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Shared/Common
import { Cacheable } from 'src/common/decorators/cacheable.decorator';
import { CACHE_TTL } from 'src/common/constants/cache.constants';
import { CursorPaginated } from 'src/common/pagination/interfaces/cursor-paginated.interface';

// Third-party
import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { Transactional } from 'typeorm-transactional';

// Relative imports
import { Submission } from '../submission/entities/submission.entity';
import { ContestParticipation } from './entities/contest-participations.entity';
import { Problem } from '../problems/entities/problem.entity';
import { ProblemVisibility } from '../problems/enums/problem-visibility.enum';
import { ProblemsService } from '../problems/problems.service';
import { BaseProblemResponseDto } from '../problems/dto/base-problem-response.dto';
import { ContestsCursorQueryDto } from './dto/contests-cursor-query.dto';
import { CreateContestDto } from './dto/create-contest.dto';
import { LeaderboardCursorQueryDto } from './dto/leaderboard-cursor-query.dto';
import { LeaderboardResponseDto } from './dto/leaderboard-response.dto';
import { ContestParticipationDto } from './dto/contest-participation.dto';
import { SubmissionsOverviewCursorQueryDto } from './dto/submissions-overview-cursor-query.dto';
import { Contest } from './entities/contest.entity';

// Import types
import type { JwtPayload } from '../auth/interfaces/jwt.interface';
import { RoleEnum } from '../user/enums/role.enum';
import { ContestFilterStrategyFactory } from './services/contest-filter-strategy.factory';
import { ContestsPaginationService } from './services/contests-pagination.service';

@Injectable()
export class ContestsService {
  constructor(
    @InjectRepository(Contest)
    private readonly contestsRepository: Repository<Contest>,
    @InjectRepository(ContestParticipation)
    private readonly contestParticipationRepository: Repository<ContestParticipation>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    private readonly problemsService: ProblemsService,
    private readonly contestFilterStrategyFactory: ContestFilterStrategyFactory,
    private readonly contestsPaginationService: ContestsPaginationService,
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
        '(problem.visibility = :visibility OR courseProblem.courseId = :courseId)',
        {
          visibility: ProblemVisibility.PUBLIC,
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

  async findContests(query: ContestsCursorQueryDto, user: JwtPayload) {
    query.filters = {
      ...query.filters,
      authorId: user.userId,
      courseId: user.courseId,
    };
    if (user.roles.includes(RoleEnum.STUDENT)) {
      delete query?.filters?.authorId;
    }

    const strategy = this.contestFilterStrategyFactory.getStrategy(user.roles);
    return strategy.findWithCursorPagination(query);
  }

  async getDetailContest(id: number, currentUser: JwtPayload) {
    const contest = await this.contestsRepository.findOne({
      where: { id },
      relations: ['contestProblems', 'contestProblems.problem'],
    });
    if (!contest) {
      throw new BadRequestException('Contest not found');
    }

    const isAccessible = contest.courseId === currentUser.courseId;

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

  @Cacheable({
    key: (contestId: number, query: LeaderboardCursorQueryDto) =>
      `leaderboard:${contestId}:${JSON.stringify(query)}`,
    ttl: CACHE_TTL.ONE_MINUTE,
  })
  async getLeaderboard(
    contestId: number,
    query: LeaderboardCursorQueryDto,
  ): Promise<LeaderboardResponseDto> {
    // Check contest access
    const contest = await this.contestsRepository.findOne({
      where: { id: contestId },
      relations: ['contestProblems', 'contestProblems.problem'],
    });

    if (!contest) {
      throw new BadRequestException('Contest not found');
    }

    // Get contest problems for header
    const problems: BaseProblemResponseDto[] = contest.contestProblems
      .sort((a, b) => {
        if (a.score === b.score) {
          return a.problem.title.localeCompare(b.problem.title);
        }
        return a.score - b.score;
      })
      .map((cp, index) => ({
        id: cp.problem.id,
        title: `${String.fromCharCode(65 + index)}. ${cp.problem.title}`,
        description: cp.problem.description,
        inputDescription: cp.problem.inputDescription,
        outputDescription: cp.problem.outputDescription,
        maxScore: cp.score,
        timeLimitMs: cp.problem.timeLimitMs,
        memoryLimitKb: cp.problem.memoryLimitKb,
        difficulty: cp.problem.difficulty,
        type: cp.problem.type,
        visibility: cp.problem.visibility,
        createdAt: cp.problem.createdAt,
        updatedAt: cp.problem.updatedAt,
      }));

    // Get all participations for this contest with submissions
    // Note: Ranking calculation requires all participants' data for accurate relative rankings
    // Cursor pagination is applied after ranking calculation for correctness

    // Use the contests pagination service
    const rankings = await this.contestsPaginationService.calculateRankings(
      contestId,
      query,
    );

    return {
      problems,
      rankings,
    };
  }

  async getSubmissionsOverview(
    contestId: number,
    query: SubmissionsOverviewCursorQueryDto,
  ): Promise<CursorPaginated<ContestParticipationDto>> {
    // Check contest access and instructor/admin role
    const contest = await this.contestsRepository.findOne({
      where: { id: contestId },
      relations: ['contestProblems', 'contestProblems.problem'],
    });

    if (!contest) {
      throw new BadRequestException('Contest not found');
    }

    // Use the pagination service
    const paginatedResult =
      await this.contestsPaginationService.paginateContestants(
        contestId,
        query,
      );

    // The pagination service already returns the correct DTO format
    return paginatedResult;
  }
}
