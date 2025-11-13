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
import { ContestsCursorQueryDto } from './dto/contests-cursor-query.dto';
import { CreateContestDto } from './dto/create-contest.dto';
import { LeaderboardCursorQueryDto } from './dto/leaderboard-cursor-query.dto';
import {
  LeaderboardProblemDto,
  LeaderboardProblemResultDto,
  LeaderboardRankingDto,
  LeaderboardResponseDto,
} from './dto/leaderboard-response.dto';
import { SubmissionsOverviewCursorQueryDto } from './dto/submissions-overview-cursor-query.dto';
import { SubmissionsOverviewResponseDto } from './dto/submissions-overview-response.dto';
import { Contest } from './entities/contest.entity';

// Import types
import type { JwtPayload } from '../auth/interfaces/jwt.interface';
import { RoleEnum } from '../user/enums/role.enum';
import { ContestFilterStrategyFactory } from './services/contest-filter-strategy.factory';
import { LeaderboardCursorService } from './services/leaderboard-cursor.service';
import { SubmissionsOverviewCursorService } from './services/submissions-overview-cursor.service';
import { SubmissionStatus } from '../submission/enums/submission-status.enum';

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
    private readonly leaderboardCursorService: LeaderboardCursorService,
    private readonly submissionsOverviewCursorService: SubmissionsOverviewCursorService,
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
    ttl: CACHE_TTL.FIVE_MINUTES, // 5 minutes cache for live contests
  })
  async getLeaderboard(
    contestId: number,
    query: LeaderboardCursorQueryDto,
    currentUser: JwtPayload,
  ): Promise<LeaderboardResponseDto> {
    // Check contest access
    const contest = await this.contestsRepository.findOne({
      where: { id: contestId },
      relations: ['contestProblems', 'contestProblems.problem'],
    });

    if (!contest) {
      throw new BadRequestException('Contest not found');
    }

    const isAccessible = contest.courseId === currentUser.courseId;
    if (!isAccessible) {
      throw new ForbiddenException('You do not have access to this contest');
    }

    // Get contest problems for header
    const problems: LeaderboardProblemDto[] = contest.contestProblems
      .sort((a, b) => {
        if (a.score === b.score) {
          return a.problem.title.localeCompare(b.problem.title);
        }
        return a.score - b.score;
      })
      .map((cp, index) => ({
        problemId: cp.problemId,
        alias: String.fromCharCode(65 + index), // A, B, C, etc.
        maxScore: cp.score,
      }));

    // Get all participations for this contest
    const participations = await this.contestParticipationRepository.find({
      where: { contest: { id: contestId } },
      relations: ['user', 'submissions', 'submissions.problem'],
    });

    // Calculate rankings
    const rankings: LeaderboardRankingDto[] = [];

    for (const participation of participations) {
      const userSubmissions = participation.submissions || [];
      const problemResults: LeaderboardProblemResultDto[] = [];
      let totalScore = 0;
      let totalPenaltyTime = 0; // in seconds

      // Group submissions by problem and find best submission for each
      const submissionsByProblem = new Map<number, Submission[]>();
      userSubmissions.forEach((submission) => {
        if (!submissionsByProblem.has(submission.problemId)) {
          submissionsByProblem.set(submission.problemId, []);
        }
        submissionsByProblem.get(submission.problemId)!.push(submission);
      });

      // Process each problem
      for (const [problemId, submissions] of submissionsByProblem) {
        // Sort submissions by creation time
        submissions.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );

        // Find first accepted submission
        const acceptedSubmission = submissions.find(
          (s) => s.status === SubmissionStatus.ACCEPTED,
        );
        if (acceptedSubmission) {
          const contestProblem = contest.contestProblems.find(
            (cp) => cp.problemId === problemId,
          );
          if (contestProblem) {
            const attempts =
              submissions.findIndex((s) => s.id === acceptedSubmission.id) + 1;
            const timeToFirstAC = Math.floor(
              (acceptedSubmission.createdAt.getTime() -
                participation.startTime.getTime()) /
                1000,
            );
            const penaltyTime = (attempts - 1) * 20 * 60; // 20 minutes penalty per wrong attempt
            const totalTimeForProblem = timeToFirstAC + penaltyTime;

            problemResults.push({
              problemId,
              score: contestProblem.score,
              time: this.formatTime(totalTimeForProblem),
              isAccepted: true,
              attempts,
            });

            totalScore += contestProblem.score;
            totalPenaltyTime += totalTimeForProblem;
          }
        }
      }

      if (problemResults.length > 0) {
        rankings.push({
          rank: 0, // Will be set after sorting
          user: {
            userId: participation.user.id,
            username:
              participation.user.email || `user_${participation.user.id}`,
            displayName:
              participation.user.firstName && participation.user.lastName
                ? `${participation.user.firstName} ${participation.user.lastName}`
                : participation.user.email || `User ${participation.user.id}`,
          },
          totalScore,
          totalTime: this.formatTime(totalPenaltyTime),
          problemResults,
        });
      }
    }

    // Sort rankings: highest score first, then lowest penalty time
    rankings.sort((a, b) => {
      if (a.totalScore !== b.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return this.parseTime(a.totalTime) - this.parseTime(b.totalTime);
    });

    // Assign ranks
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    // Apply cursor pagination
    const paginatedRankings = await this.leaderboardCursorService.paginateLeaderboard(
      rankings,
      query,
    );

    return {
      problems,
      rankings: paginatedRankings,
    };
  }

  async getSubmissionsOverview(
    contestId: number,
    query: SubmissionsOverviewCursorQueryDto,
    currentUser: JwtPayload,
  ): Promise<SubmissionsOverviewResponseDto> {
    // Check contest access and instructor/admin role
    const contest = await this.contestsRepository.findOne({
      where: { id: contestId },
      relations: ['contestProblems', 'contestProblems.problem'],
    });

    if (!contest) {
      throw new BadRequestException('Contest not found');
    }

    const isAccessible = contest.courseId === currentUser.courseId;
    if (!isAccessible) {
      throw new ForbiddenException('You do not have access to this contest');
    }

    // Check if user is instructor or admin
    const isInstructorOrAdmin =
      currentUser.roles?.includes(RoleEnum.INSTRUCTOR) ||
      currentUser.roles?.includes(RoleEnum.ADMIN);
    if (!isInstructorOrAdmin) {
      throw new ForbiddenException(
        'Only instructors and admins can view submissions overview',
      );
    }

    // Get contest problems
    const problems = contest.contestProblems
      .sort((a, b) => {
        if (a.score === b.score) {
          return a.problem.title.localeCompare(b.problem.title);
        }
        return a.score - b.score;
      })
      .map((cp, index) => ({
        problemId: cp.problemId,
        title: `${String.fromCharCode(65 + index)}. ${cp.problem.title}`,
      }));

    // Get all participations with their best submissions
    const participations = await this.contestParticipationRepository.find({
      where: { contest: { id: contestId } },
      relations: ['user', 'submissions', 'submissions.problem'],
    });

    const participantResults: Array<{
      participationId: number;
      user: { userId: number; displayName: string };
      totalScore: number;
      problemSubmissions: Array<{
        problemId: number;
        bestSubmissionId: number;
        score: number;
        status: string;
      }>;
    }> = [];

    for (const participation of participations) {
      const userSubmissions = participation.submissions || [];
      let totalScore = 0;
      const problemSubmissions: Array<{
        problemId: number;
        bestSubmissionId: number;
        score: number;
        status: string;
      }> = [];

      // Group submissions by problem and find best submission for each
      const bestSubmissionsByProblem = new Map<number, Submission>();

      userSubmissions.forEach((submission) => {
        const existing = bestSubmissionsByProblem.get(submission.problemId);
        if (!existing || (submission.score || 0) > (existing.score || 0)) {
          bestSubmissionsByProblem.set(submission.problemId, submission);
        }
      });

      // Process each problem's best submission
      for (const [problemId, bestSubmission] of bestSubmissionsByProblem) {
        const contestProblem = contest.contestProblems.find(
          (cp) => cp.problemId === problemId,
        );
        if (contestProblem) {
          problemSubmissions.push({
            problemId,
            bestSubmissionId: bestSubmission.id,
            score: bestSubmission.score || 0,
            status: bestSubmission.status,
          });
          totalScore += bestSubmission.score || 0;
        }
      }

      if (problemSubmissions.length > 0) {
        participantResults.push({
          participationId: participation.id,
          user: {
            userId: participation.user.id,
            displayName:
              participation.user.firstName && participation.user.lastName
                ? `${participation.user.firstName} ${participation.user.lastName}`
                : participation.user.email || `User ${participation.user.id}`,
          },
          totalScore,
          problemSubmissions,
        });
      }
    }

    // Sort by total score descending
    participantResults.sort((a, b) => b.totalScore - a.totalScore);

    // Apply cursor pagination
    const paginatedResults = await this.submissionsOverviewCursorService.paginateSubmissionsOverview(
      participantResults,
      query,
    );

    return {
      problems,
      participantResults: paginatedResults,
    };
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private parseTime(timeStr: string): number {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return parts[0] * 60 + parts[1];
  }
}
