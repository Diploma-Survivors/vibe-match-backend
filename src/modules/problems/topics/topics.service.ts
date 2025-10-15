import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { Topic } from './entities/topic.entity';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicsRepository: Repository<Topic>,
  ) {}

  create(createTopicDto: CreateTopicDto) {
    const topic = this.topicsRepository.create(createTopicDto);
    return this.topicsRepository.save(topic);
  }

  async createBulk(createTopicDtos: CreateTopicDto[]) {
    const topics = this.topicsRepository.create(createTopicDtos);
    return this.topicsRepository.save(topics);
  }

  async findAll() {
    return this.topicsRepository.find();
  }

  async find(options: FindManyOptions<Topic>) {
    return this.topicsRepository.find(options);
  }

  async findOne(id: number) {
    return this.topicsRepository.findOne({ where: { id } });
  }

  async update(id: number, updateTopicDto: UpdateTopicDto) {
    return this.topicsRepository.update(id, updateTopicDto);
  }

  async remove(id: number) {
    return this.topicsRepository.delete(id);
  }
}
