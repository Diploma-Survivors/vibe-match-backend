// NestJS
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Third-party
import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { Transactional } from 'typeorm-transactional';

// Relative imports
import { Problem } from '../problems/entities/problem.entity';
import { ProblemVisibility } from '../problems/enums/problem-visibility.enum';
import { ProblemsService } from '../problems/problems.service';
import { ContestsCursorQueryDto } from './dto/contests-cursor-query.dto';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { AddProblemToContestDto } from './dto/add-problem-to-contest.dto';
import { UpdateContestProblemDto } from './dto/update-contest-problem.dto';
import { Contest } from './entities/contest.entity';
import { ContestProblem } from './entities/contest-problem.entity';
import { ContestParticipation } from './entities/contest-participations.entity';

// Import types
import type { JwtPayload } from '../auth/interfaces/jwt.interface';
import { RoleEnum } from '../user/enums/role.enum';
import { ContestFilterStrategyFactory } from './services/contest-filter-strategy.factory';
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
    private readonly problemsService: ProblemsService,
    private readonly contestFilterStrategyFactory: ContestFilterStrategyFactory,
    private readonly contestParticipationService: ContestParticipationService,
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
}
