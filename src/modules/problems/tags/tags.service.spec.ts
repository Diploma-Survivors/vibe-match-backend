import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tag } from './entities/tag.entity';
import { TagsService } from './tags.service';

describe('TagsService', () => {
  let service: TagsService;

  const mockTagRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Tag),
          useValue: mockTagRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a tag', async () => {
      const dto = { name: 'tag' };
      const tag = { id: 1, ...dto };
      mockTagRepository.create.mockReturnValue(tag);
      mockTagRepository.save.mockResolvedValue(tag);
      const result = await service.create(dto);
      expect(result).toEqual(tag);
    });
  });

  describe('findAll', () => {
    it('should find all tags', async () => {
      const tags = [{ id: 1, name: 'tag' }];
      mockTagRepository.find.mockResolvedValue(tags);
      const result = await service.findAll();
      expect(result).toEqual(tags);
    });
  });

  describe('findOne', () => {
    it('should find one tag', async () => {
      const tag = { id: 1, name: 'tag' };
      mockTagRepository.findOne.mockResolvedValue(tag);
      const result = await service.findOne(1);
      expect(result).toEqual(tag);
    });
  });

  describe('update', () => {
    it('should update a tag', async () => {
      const dto = { name: 'new tag' };
      await service.update(1, dto);
      expect(mockTagRepository.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('should remove a tag', async () => {
      await service.remove(1);
      expect(mockTagRepository.delete).toHaveBeenCalledWith(1);
    });
  });
});
