// NestJS
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
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
import { Contest } from './entities/contest.entity';

// Import types
import type { JwtPayload } from '../auth/interfaces/jwt.interface';
import { RoleEnum } from '../user/enums/role.enum';
import { ContestFilterStrategyFactory } from './services/contest-filter-strategy.factory';

@Injectable()
export class ContestsService {
  constructor(
    @InjectRepository(Contest)
    private readonly contestsRepository: Repository<Contest>,
    private readonly problemsService: ProblemsService,
    private readonly contestFilterStrategyFactory: ContestFilterStrategyFactory,
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
}
