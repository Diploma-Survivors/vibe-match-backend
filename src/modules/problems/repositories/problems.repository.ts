// NestJS
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Third-party
import {
  DeepPartial,
  FindOneOptions,
  FindOptionsWhere,
  In,
  Repository,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';

// Relative imports
import { Problem } from '../entities/problem.entity';

@Injectable()
export class ProblemsRepository {
  constructor(
    @InjectRepository(Problem)
    private readonly repository: Repository<Problem>,
  ) {}

  async findById(
    id: number,
    options?: FindOneOptions<Problem>,
  ): Promise<Problem | null> {
    return this.repository.findOne({ where: { id }, ...options });
  }

  async findByIdOrFail(
    id: number,
    options?: FindOneOptions<Problem>,
  ): Promise<Problem> {
    const problem = await this.findById(id, options);
    if (!problem) {
      throw new NotFoundException(`Problem with ID ${id} not found`);
    }
    return problem;
  }

  async findByIds(
    ids: number[],
    options?: FindOneOptions<Problem>,
  ): Promise<Problem[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.repository.find({ where: { id: In(ids) }, ...options });
  }

  async findOne(
    where: FindOptionsWhere<Problem>,
    options?: Omit<FindOneOptions<Problem>, 'where'>,
  ): Promise<Problem | null> {
    return this.repository.findOne({ where, ...options });
  }

  async find(
    where: FindOptionsWhere<Problem>,
    options?: Omit<FindOneOptions<Problem>, 'where'>,
  ): Promise<Problem[]> {
    return this.repository.find({ where, ...options });
  }

  create(data: DeepPartial<Problem>): Problem {
    return this.repository.create(data);
  }

  async save(problem: Problem): Promise<Problem> {
    return this.repository.save(problem);
  }

  async update(
    id: number,
    data: QueryDeepPartialEntity<Problem>,
  ): Promise<void> {
    const result = await this.repository.update(id, data);
    if (result.affected === 0) {
      throw new NotFoundException(`Problem with ID ${id} not found`);
    }
  }

  async updateMany(
    where: FindOptionsWhere<Problem>,
    data: QueryDeepPartialEntity<Problem>,
  ): Promise<number> {
    const result = await this.repository.update(where, data);
    return result.affected ?? 0;
  }

  async delete(id: number): Promise<void> {
    const result = await this.repository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Problem with ID ${id} not found`);
    }
  }

  async count(where?: FindOptionsWhere<Problem>): Promise<number> {
    return this.repository.count({ where });
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  createQueryBuilder(alias: string = 'problem') {
    return this.repository.createQueryBuilder(alias);
  }
}
