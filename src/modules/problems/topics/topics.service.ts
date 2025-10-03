import { Injectable } from '@nestjs/common';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Topic } from './entities/topic.entity';
import { Repository } from 'typeorm';

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

  findAll() {
    return this.topicsRepository.find();
  }

  findOne(id: string) {
    return this.topicsRepository.findOne({ where: { id } });
  }

  update(id: string, updateTopicDto: UpdateTopicDto) {
    return this.topicsRepository.update(id, updateTopicDto);
  }

  remove(id: string) {
    return this.topicsRepository.delete(id);
  }
}
