import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_TTL } from 'src/common/constants/cache.constants';
import {
  Cacheable,
  CacheInvalidate,
} from 'src/common/decorators/cacheable.decorator';
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

  @CacheInvalidate({ keys: ['topics:all'] })
  create(createTopicDto: CreateTopicDto) {
    const topic = this.topicsRepository.create(createTopicDto);
    return this.topicsRepository.save(topic);
  }

  @CacheInvalidate({ keys: ['topics:all'] })
  async createBulk(createTopicDtos: CreateTopicDto[]) {
    const topics = this.topicsRepository.create(createTopicDtos);
    return this.topicsRepository.save(topics);
  }

  @Cacheable({
    key: 'topics:all',
    ttl: CACHE_TTL.ONE_DAY,
  })
  async findAll() {
    return this.topicsRepository.find();
  }

  async find(options: FindManyOptions<Topic>) {
    return this.topicsRepository.find(options);
  }

  @Cacheable({
    key: (id: number) => `topic:${id}`,
    ttl: CACHE_TTL.ONE_DAY,
  })
  async findOne(id: number) {
    return this.topicsRepository.findOne({ where: { id } });
  }

  @CacheInvalidate({
    keys: (id: number) => [`topic:${id}`, 'topics:all'],
  })
  async update(id: number, updateTopicDto: UpdateTopicDto) {
    return this.topicsRepository.update(id, updateTopicDto);
  }

  @CacheInvalidate({
    keys: (id: number) => [`topic:${id}`, 'topics:all'],
  })
  async remove(id: number) {
    return this.topicsRepository.delete(id);
  }
}
