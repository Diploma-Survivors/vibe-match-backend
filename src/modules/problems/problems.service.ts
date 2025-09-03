import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Problem } from './entities/problem.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProblemsService {
  private readonly logger = new Logger(ProblemsService.name);

  constructor(
    @InjectRepository(Problem)
    private readonly problemsRepository: Repository<Problem>,
  ) {}

  async create(createProblemDto: CreateProblemDto) {
    try {
      const problem = this.problemsRepository.create(createProblemDto);
      return await this.problemsRepository.save(problem);
    } catch (err) {
      this.logger.error(err);
      throw new BadRequestException();
    }
  }

  async findAll() {
    try {
      return await this.problemsRepository.find();
    } catch (err) {
      this.logger.error(err);

      throw new BadRequestException();
    }
  }

  async findOne(id: string) {
    try {
      return await this.problemsRepository.findOne({ where: { id } });
    } catch (err) {
      this.logger.error(err);
      throw new BadRequestException();
    }
  }

  async update(id: string, updateProblemDto: UpdateProblemDto) {
    try {
      await this.problemsRepository.update(id, updateProblemDto);
    } catch (err) {
      this.logger.error(err);
      throw new BadRequestException();
    }
  }

  async remove(id: string) {
    try {
      await this.problemsRepository.delete(id);
    } catch (err) {
      this.logger.error(err);
      throw new BadRequestException();
    }
  }
}
