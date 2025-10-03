import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { Tag } from './entities/tag.entity';

@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);

  constructor(
    @InjectRepository(Tag) private readonly tagsRepository: Repository<Tag>,
  ) {}

  async create(createTagDto: CreateTagDto) {
    const tag = this.tagsRepository.create(createTagDto);
    return await this.tagsRepository.save(tag);
  }

  async createBulk(createTagDtos: CreateTagDto[]) {
    const tags = this.tagsRepository.create(createTagDtos);
    return await this.tagsRepository.save(tags);
  }

  async findAll() {
    return await this.tagsRepository.find();
  }

  async findOne(id: string) {
    return await this.tagsRepository.findOne({ where: { id } });
  }

  async update(id: string, updateTagDto: UpdateTagDto) {
    await this.tagsRepository.update(id, updateTagDto);
  }

  async remove(id: string) {
    await this.tagsRepository.delete(id);
  }
}
