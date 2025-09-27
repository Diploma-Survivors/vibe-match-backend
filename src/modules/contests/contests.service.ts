import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  FindOptionsSelect,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { Problem } from '../problems/entities/problem.entity';
import { ProblemType } from '../problems/enums/problem-type.enum';
import { CreateContestDto } from './dto/create-contest.dto';
import { Contest } from './entities/contest.entity';

@Injectable()
export class ContestsService {
  constructor(
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
          ids: createContestDto.problems,
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
        contestProblems: problems.map((problem) => ({ problem })),
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
}
