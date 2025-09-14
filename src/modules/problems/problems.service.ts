import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { Problem } from './entities/problem.entity';

@Injectable()
export class ProblemsService {
  private readonly logger = new Logger(ProblemsService.name);

  constructor(
    @InjectRepository(Problem)
    private readonly problemsRepository: Repository<Problem>,
  ) {}

  async create(createProblemDto: CreateProblemDto, user: JwtPayload) {
    const problem = this.problemsRepository.create({
      ...createProblemDto,
      author: { id: user.userId },
      course: { id: user.courseId },
    });

    return await this.problemsRepository.save(problem);
  }

  async findAll() {
    return await this.problemsRepository.find();
  }

  async findOne(id: string) {
    return await this.problemsRepository.findOne({ where: { id } });
  }

  async update(id: string, updateProblemDto: UpdateProblemDto) {
    await this.problemsRepository.update(id, updateProblemDto);
  }

  async remove(id: string) {
    await this.problemsRepository.delete(id);
  }
}
