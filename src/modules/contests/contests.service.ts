// NestJS
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Shared/Common
import { Cacheable } from 'src/common/decorators/cacheable.decorator';
import { CACHE_TTL } from 'src/common/constants/cache.constants';
import { PaginationCursorResponseDto } from 'src/common/pagination/dtos/pagination-cursor-response.dto';

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
import { SubmissionStatus } from '../submission/enums/submission-status.enum';
import { SubmissionStrategyEnum } from '../submission/enums/submission-strategy.enum';
import { GradingStrategyFactory } from '../submission/strategies/grading-strategy.factory';
import { StrategyContext } from '../submission/strategies/interfaces/grading-strategy.interface';
import { BaseProblemResponseDto } from '../problems/dto/base-problem-response.dto';
import { ContestsCursorQueryDto } from './dto/contests-cursor-query.dto';
import { CreateContestDto } from './dto/create-contest.dto';
import { LeaderboardCursorQueryDto } from './dto/leaderboard-cursor-query.dto';
import { LeaderboardResponseDto } from './dto/leaderboard-response.dto';
import { ContestParticipationDto } from './dto/contest-participation.dto';
import { SubmissionsOverviewCursorQueryDto } from './dto/submissions-overview-cursor-query.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { AddProblemToContestDto } from './dto/add-problem-to-contest.dto';
import { UpdateContestProblemDto } from './dto/update-contest-problem.dto';
import { Contest } from './entities/contest.entity';
import { ContestProblem } from './entities/contest-problem.entity';
import { ContestProblemResult } from './entities/contest-problem-result.entity';
import { ProblemStatus } from './enums/problem-status.enum';

// Import types
import type { JwtPayload } from '../auth/interfaces/jwt.interface';
import { RoleEnum } from '../user/enums/role.enum';
import { ContestFilterStrategyFactory } from './services/contest-filter-strategy.factory';
import { LeaderboardPaginationService } from './services/leaderboard-pagination.service';
import { SubmissionsOverviewPaginationService } from './services/submissions-overview-pagination.service';
import { ContestParticipationService } from './services/contest-participation.service';

@Injectable()
export class ContestsService {
  constructor(
    @InjectRepository(Contest)
    private readonly contestsRepository: Repository<Contest>,
    @InjectRepository(ContestProblem)
    private readonly contestProblemRepository: Repository<ContestProblem>,
    @InjectRepository(ContestParticipation)
    private readonly contestParticipationRepository: Repository<ContestParticipation>,
    @InjectRepository(ContestProblemResult)
    private readonly contestProblemResultRepository: Repository<ContestProblemResult>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    private readonly problemsService: ProblemsService,
    private readonly contestFilterStrategyFactory: ContestFilterStrategyFactory,
    private readonly contestParticipationService: ContestParticipationService,
    private readonly gradingStrategyFactory: GradingStrategyFactory,
    private readonly leaderboardPaginationService: LeaderboardPaginationService,
    private readonly submissionsOverviewPaginationService: SubmissionsOverviewPaginationService,
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

    if (contest.courseId !== currentUser.courseId) {
      throw new ForbiddenException('You do not have access to this contest');
    }

    // Lazy update expired participation before fetching
    await this.contestParticipationService.lazyUpdateExpiredParticipation(
      id,
      currentUser.userId,
    );

    const participation = await this.contestParticipationService.findOne(
      id,
      currentUser.userId,
    );
    if (!participation) {
      throw new ForbiddenException(
        'You must start participating in the contest first',
      );
    }

    // Fetch all submissions for this user in this contest participation
    // We still need submissions for the fallback/backfill logic
    const submissions = await this.submissionRepository.find({
      where: {
        contestParticipation: { id: participation.id },
        userId: currentUser.userId,
      },
      relations: ['problem'],
      order: { createdAt: 'ASC' },
    });

    // Create a map of problem submissions
    const problemSubmissionsMap = new Map<number, Submission[]>();
    for (const submission of submissions) {
      if (!problemSubmissionsMap.has(submission.problemId)) {
        problemSubmissionsMap.set(submission.problemId, []);
      }
      problemSubmissionsMap.get(submission.problemId)!.push(submission);
    }

    // Fetch persisted problem results
    const problemResults = await this.contestProblemResultRepository.find({
      where: { contestParticipation: { id: participation.id } },
      relations: ['problem'],
    });

    const problemResultsMap = new Map<number, ContestProblemResult>();
    for (const result of problemResults) {
      problemResultsMap.set(result.problem.id, result);
    }

    // Check if contest has ended
    const now = new Date();
    const contestEnded = now > contest.endTime;

    // Get contest strategy
    const contestStrategy =
      contest.submissionStrategy || SubmissionStrategyEnum.BEST_SCORE;
    const strategy = this.gradingStrategyFactory.create(contestStrategy);

    const problems = await Promise.all(
      contest.contestProblems.map(async (cp) => {
        let userScore = 0;
        let status = ProblemStatus.UNATTEMPTED;

        // Check if we have a persisted result
        if (problemResultsMap.has(cp.problem.id)) {
          const result = problemResultsMap.get(cp.problem.id)!;
          userScore = result.score;
          status = result.status;
        } else {
          // Fallback / Lazy Backfill
          const problemSubmissions =
            problemSubmissionsMap.get(cp.problem.id) || [];
          const submissionStatuses = problemSubmissions.map((s) => s.status);
          status = this.calculateProblemStatus(
            submissionStatuses,
            contestEnded,
          );

          if (problemSubmissions.length > 0) {
            const latestSubmission =
              problemSubmissions[problemSubmissions.length - 1];
            const previousSubmissions = problemSubmissions.slice(0, -1);

            const context: StrategyContext = {
              submission: latestSubmission,
              previousSubmissions,
              problem: cp.problem,
              ltiSession: null,
            };

            // Use the strategy's calculateScore method
            userScore = await strategy.calculateScore(context);

            // Cap the score at the contest's max score for this problem
            userScore = Math.min(userScore, cp.score);

            // Persist this result for future reads (Lazy Backfill)
            // We do this asynchronously to not block the response too much, or await it if we want consistency
            // Let's await it to be safe and simple
            try {
              const newResult = this.contestProblemResultRepository.create({
                contestParticipation: participation,
                problem: cp.problem,
                score: userScore,
                status: status,
              });
              await this.contestProblemResultRepository.save(newResult);
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
              // Ignore unique constraint errors if parallel requests happen
            }
          }
        }

        return {
          id: cp.problem.id,
          title: cp.problem.title,
          difficulty: cp.problem.difficulty,
          memoryLimitKb: cp.problem.memoryLimitKb,
          timeLimitMs: cp.problem.timeLimitMs,
          maxScore: cp.score,
          userScore,
          status,
        };
      }),
    );

    const sortedProblems = problems.toSorted((a, b) => {
      if (a.maxScore === b.maxScore) {
        return a.title.localeCompare(b.title);
      }
      return a.maxScore - b.maxScore;
    });

    const participationStatus =
      this.contestParticipationService.getParticipationStatus(
        participation,
        contest,
      );

    return {
      ...contest,
      contestProblems: sortedProblems,
      participation: participationStatus,
    };
  }

  private calculateProblemStatus(
    submissionStatuses: SubmissionStatus[],
    contestEnded: boolean,
  ): ProblemStatus {
    if (submissionStatuses.length === 0) {
      return ProblemStatus.UNATTEMPTED;
    }

    const hasAccepted = submissionStatuses.includes(SubmissionStatus.ACCEPTED);
    if (hasAccepted) {
      return ProblemStatus.SOLVED;
    }

    if (contestEnded) {
      return ProblemStatus.UNSOLVED;
    }

    return ProblemStatus.ATTEMPTED;
  }

  @Transactional()
  async updateContest(
    id: number,
    updateContestDto: UpdateContestDto,
    currentUser: JwtPayload,
  ) {
    const contest = await this.contestsRepository.findOne({
      where: { id },
    });
    if (!contest) {
      throw new NotFoundException('Contest not found');
    }

    if (contest.courseId !== currentUser.courseId) {
      throw new ForbiddenException('You do not have access to this contest');
    }

    if (contest.authorId !== currentUser.userId) {
      throw new ForbiddenException('Only the contest author can update it');
    }

    Object.assign(contest, updateContestDto);

    return this.contestsRepository.save(contest);
  }

  @Transactional()
  async deleteContest(id: number, currentUser: JwtPayload) {
    const contest = await this.contestsRepository.findOne({
      where: { id },
    });
    if (!contest) {
      throw new NotFoundException('Contest not found');
    }

    if (contest.courseId !== currentUser.courseId) {
      throw new ForbiddenException('You do not have access to this contest');
    }

    if (contest.authorId !== currentUser.userId) {
      throw new ForbiddenException('Only the contest author can delete it');
    }

    await this.contestsRepository.remove(contest);
  }

  @Transactional()
  async addProblemToContest(
    contestId: number,
    addProblemDto: AddProblemToContestDto,
    currentUser: JwtPayload,
  ) {
    const contest = await this.contestsRepository.findOne({
      where: { id: contestId },
    });
    if (!contest) {
      throw new NotFoundException('Contest not found');
    }

    if (contest.courseId !== currentUser.courseId) {
      throw new ForbiddenException('You do not have access to this contest');
    }

    if (contest.authorId !== currentUser.userId) {
      throw new ForbiddenException('Only the contest author can add problems');
    }

    const problem = await this.problemsService
      .getQueryBuilder()
      .leftJoin('problem.courseProblems', 'courseProblem')
      .where('problem.id = :problemId', { problemId: addProblemDto.problemId })
      .andWhere(
        '(problem.visibility = :visibility OR courseProblem.courseId = :courseId)',
        {
          visibility: ProblemVisibility.PUBLIC,
          courseId: currentUser.courseId,
        },
      )
      .select('problem.id', 'id')
      .getRawOne<Problem>();

    if (!problem) {
      throw new BadRequestException(
        'Problem not found or not accessible in this course',
      );
    }

    const existingContestProblem = await this.contestProblemRepository.findOne({
      where: {
        contestId,
        problemId: addProblemDto.problemId,
      },
    });

    if (existingContestProblem) {
      throw new BadRequestException('Problem already exists in this contest');
    }

    const contestProblem = this.contestProblemRepository.create({
      contestId,
      problemId: addProblemDto.problemId,
      score: addProblemDto.score,
    });

    return this.contestProblemRepository.save(contestProblem);
  }

  @Transactional()
  async updateContestProblem(
    contestId: number,
    problemId: number,
    updateDto: UpdateContestProblemDto,
    currentUser: JwtPayload,
  ) {
    const contest = await this.contestsRepository.findOne({
      where: { id: contestId },
    });
    if (!contest) {
      throw new NotFoundException('Contest not found');
    }

    if (contest.courseId !== currentUser.courseId) {
      throw new ForbiddenException('You do not have access to this contest');
    }

    if (contest.authorId !== currentUser.userId) {
      throw new ForbiddenException(
        'Only the contest author can update problems',
      );
    }

    const contestProblem = await this.contestProblemRepository.findOne({
      where: { contestId, problemId },
    });

    if (!contestProblem) {
      throw new NotFoundException('Problem not found in this contest');
    }

    contestProblem.score = updateDto.score;

    return this.contestProblemRepository.save(contestProblem);
  }

  @Transactional()
  async removeProblemFromContest(
    contestId: number,
    problemId: number,
    currentUser: JwtPayload,
  ) {
    const contest = await this.contestsRepository.findOne({
      where: { id: contestId },
    });
    if (!contest) {
      throw new NotFoundException('Contest not found');
    }

    if (contest.courseId !== currentUser.courseId) {
      throw new ForbiddenException('You do not have access to this contest');
    }

    if (contest.authorId !== currentUser.userId) {
      throw new ForbiddenException(
        'Only the contest author can remove problems',
      );
    }

    const contestProblem = await this.contestProblemRepository.findOne({
      where: { contestId, problemId },
    });

    if (!contestProblem) {
      throw new NotFoundException('Problem not found in this contest');
    }

    await this.contestProblemRepository.remove(contestProblem);
  }

  async getContestParticipants(contestId: number, currentUser: JwtPayload) {
    const contest = await this.contestsRepository.findOne({
      where: { id: contestId },
    });
    if (!contest) {
      throw new NotFoundException('Contest not found');
    }

    if (contest.courseId !== currentUser.courseId) {
      throw new ForbiddenException('You do not have access to this contest');
    }

    if (contest.authorId !== currentUser.userId) {
      throw new ForbiddenException(
        'Only the contest author can view participants',
      );
    }

    const participants = await this.contestParticipationRepository.find({
      where: { contest: { id: contestId } },
      relations: ['user'],
      order: { startTime: 'ASC' },
    });

    return {
      participants: participants.map((p) => ({
        userId: p.user.id,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        email: p.user.email,
        startTime: p.startTime,
        endTime: p.endTime,
        finalScore: p.finalScore,
      })),
      totalParticipants: participants.length,
    };
  }

  async getContestOverview(id: number, currentUser: JwtPayload) {
    const contest = await this.contestsRepository.findOne({
      where: { id },
      relations: ['author', 'contestProblems'],
    });
    if (!contest) {
      throw new NotFoundException('Contest not found');
    }

    if (contest.courseId !== currentUser.courseId) {
      throw new ForbiddenException('You do not have access to this contest');
    }

    const participantCount = await this.contestParticipationRepository.count({
      where: { contest: { id } },
    });

    const userParticipation = await this.contestParticipationRepository.findOne(
      {
        where: {
          contest: { id },
          user: { id: currentUser.userId },
        },
      },
    );

    return {
      id: contest.id,
      name: contest.name,
      description: contest.description,
      startTime: contest.startTime,
      endTime: contest.endTime,
      lateDeadline: contest.lateDeadline,
      durationMinutes: contest.durationMinutes,
      deadlineEnforcement: contest.deadlineEnforcement,
      submissionStrategy: contest.submissionStrategy,
      author: {
        userId: contest.author.id,
        firstName: contest.author.firstName,
        lastName: contest.author.lastName,
        email: contest.author.email,
      },
      totalProblems: contest.contestProblems.length,
      participantCount,
      hasParticipated: !!userParticipation,
      createdAt: contest.createdAt,
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

    // Use the leaderboard pagination service
    const rankings = await this.leaderboardPaginationService.calculateRankings(
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
  ): Promise<PaginationCursorResponseDto<ContestParticipationDto>> {
    // Check contest access and instructor/admin role
    const contest = await this.contestsRepository.findOne({
      where: { id: contestId },
      relations: ['contestProblems', 'contestProblems.problem'],
    });

    if (!contest) {
      throw new BadRequestException('Contest not found');
    }

    // Use the pagination service - pagination is applied at database level
    const paginatedResult =
      await this.submissionsOverviewPaginationService.getContestants(
        contestId,
        query,
      );

    // Transform entities to DTOs - ensure user is not null
    const transformedEdges = paginatedResult.edges.map((edge) => {
      if (!edge.node.user) {
        throw new BadRequestException(
          'Unable to retrieve participant information',
        );
      }

      return {
        ...edge,
        node: {
          id: edge.node.id,
          user: {
            id: edge.node.user.id,
            firstName: edge.node.user.firstName ?? '',
            lastName: edge.node.user.lastName ?? '',
            email: edge.node.user.email ?? '',
          },
          startTime: edge.node.startTime,
          endTime: edge.node.endTime,
          finalScore: edge.node.finalScore,
        } as ContestParticipationDto,
      };
    });

    return {
      ...paginatedResult,
      edges: transformedEdges,
    };
  }
}
