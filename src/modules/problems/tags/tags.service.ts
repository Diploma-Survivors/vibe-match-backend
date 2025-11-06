// NestJS
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Third-party
import { FindManyOptions, Repository } from 'typeorm';

// Shared/Common
import { CACHE_TTL } from 'src/common/constants/cache.constants';
import {
  Cacheable,
  CacheInvalidate,
} from 'src/common/decorators/cacheable.decorator';

// Relative imports
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { Tag } from './entities/tag.entity';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag) private readonly tagsRepository: Repository<Tag>,
  ) {}

  @CacheInvalidate({ keys: ['tags:all'] })
  async create(createTagDto: CreateTagDto) {
    const tag = this.tagsRepository.create(createTagDto);
    return await this.tagsRepository.save(tag);
  }

  @CacheInvalidate({ keys: ['tags:all'] })
  async createBulk(createTagDtos: CreateTagDto[]) {
    const tags = this.tagsRepository.create(createTagDtos);
    return await this.tagsRepository.save(tags);
  }

  @Cacheable({
    key: 'tags:all',
    ttl: CACHE_TTL.ONE_DAY,
  })
  async findAll() {
    return await this.tagsRepository.find();
  }

  @Cacheable({
    key: (id: number) => `tag:${id}`,
    ttl: CACHE_TTL.ONE_DAY,
  })
  async findOne(id: number) {
    return await this.tagsRepository.findOne({ where: { id } });
  }

  async find(options: FindManyOptions<Tag>) {
    return await this.tagsRepository.find(options);
  }

  @CacheInvalidate({
    keys: (id: number) => [`tag:${id}`, 'tags:all'],
  })
  async update(id: number, updateTagDto: UpdateTagDto) {
    await this.tagsRepository.update(id, updateTagDto);
  }

  @CacheInvalidate({
    keys: (id: number) => [`tag:${id}`, 'tags:all'],
  })
  async remove(id: number) {
    await this.tagsRepository.delete(id);
  }
}
