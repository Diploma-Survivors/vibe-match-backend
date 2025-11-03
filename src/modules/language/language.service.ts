// NestJS
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Third-party
import { Repository } from 'typeorm';

// Shared/Common
import { CACHE_TTL } from 'src/common/constants/cache.constants';
import { Cacheable } from 'src/common/decorators/cacheable.decorator';

// Relative imports
import { Language } from './entities/language.entity';

@Injectable()
export class LanguageService {
  constructor(
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
  ) {}

  @Cacheable({
    key: 'languages:all',
    ttl: CACHE_TTL.ONE_HOUR,
  })
  async findAll(): Promise<Language[]> {
    return this.languageRepository.find();
  }

  @Cacheable({
    key: (id: number) => `language:${id}`,
    ttl: CACHE_TTL.ONE_HOUR,
  })
  async findOne(id: number): Promise<Language> {
    const language = await this.languageRepository.findOneBy({ id });
    if (!language) {
      throw new Error(`Language with ID ${id} not found`);
    }
    return language;
  }
}
