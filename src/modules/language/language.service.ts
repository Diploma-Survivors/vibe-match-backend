import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from './entities/language.entity';

@Injectable()
export class LanguageService {
  constructor(
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
  ) {}

  async findAll(): Promise<Language[]> {
    return this.languageRepository.find();
  }

  async findOne(id: number): Promise<Language> {
    const language = await this.languageRepository.findOneBy({ id });
    if (!language) {
      throw new Error(`Language with ID ${id} not found`);
    }
    return language;
  }
}
