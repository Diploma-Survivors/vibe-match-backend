import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from './entities/language.entity';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;
  let repository: Repository<Language>;

  const mockLanguageRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanguageService,
        {
          provide: getRepositoryToken(Language),
          useValue: mockLanguageRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<LanguageService>(LanguageService);
    repository = module.get<Repository<Language>>(getRepositoryToken(Language));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of languages', async () => {
      const languages = [new Language(), new Language()];
      mockLanguageRepository.find.mockResolvedValue(languages);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalled();
      expect(result).toEqual(languages);
    });
  });

  describe('findOne', () => {
    it('should return a single language', async () => {
      const id = 1;
      const language = new Language();
      mockLanguageRepository.findOneBy.mockResolvedValue(language);

      const result = await service.findOne(id);

      expect(repository.findOneBy).toHaveBeenCalledWith({ id });
      expect(result).toEqual(language);
    });

    it('should throw an error if the language is not found', async () => {
      const id = 1;
      mockLanguageRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(Error);
    });
  });
});
