import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Tag } from './entities/tag.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);

  constructor(
    @InjectRepository(Tag) private readonly tagsRepository: Repository<Tag>,
  ) {}

  async create(createTagDto: CreateTagDto) {
    try {
      const tag = this.tagsRepository.create(createTagDto);
      return await this.tagsRepository.save(tag);
    } catch (err) {
      this.logger.error(err);
      throw new BadRequestException();
    }
  }

  async findAll() {
    try {
      return await this.tagsRepository.find();
    } catch (err) {
      this.logger.error(err);
      throw new BadRequestException();
    }
  }

  async findOne(id: string) {
    try {
      return await this.tagsRepository.findOne({ where: { id } });
    } catch (err) {
      this.logger.error(err);
      throw new BadRequestException();
    }
  }

  async update(id: string, updateTagDto: UpdateTagDto) {
    try {
      await this.tagsRepository.update(id, updateTagDto);
    } catch (err) {
      this.logger.error(err);
      throw new BadRequestException();
    }
  }

  async remove(id: string) {
    try {
      await this.tagsRepository.delete(id);
    } catch (err) {
      this.logger.error(err);
      throw new BadRequestException();
    }
  }
}
