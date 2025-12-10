import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Topic } from './entities/topic.entity';
import { TopicsService } from './topics.service';

describe('TopicsService', () => {
  let service: TopicsService;

  const mockTopicRepository = {
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
        TopicsService,
        {
          provide: getRepositoryToken(Topic),
          useValue: mockTopicRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<TopicsService>(TopicsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a topic', async () => {
      const dto = { name: 'topic', description: 'description' };
      const topic = { id: 1, ...dto };
      mockTopicRepository.create.mockReturnValue(topic);
      mockTopicRepository.save.mockResolvedValue(topic);
      const result = await service.create(dto);
      expect(result).toEqual(topic);
    });
  });

  describe('findAll', () => {
    it('should find all topics', async () => {
      const topics = [{ id: 1, name: 'topic' }];
      mockTopicRepository.find.mockResolvedValue(topics);
      const result = await service.findAll();
      expect(result).toEqual(topics);
    });
  });

  describe('findOne', () => {
    it('should find one topic', async () => {
      const topic = { id: 1, name: 'topic' };
      mockTopicRepository.findOne.mockResolvedValue(topic);
      const result = await service.findOne(1);
      expect(result).toEqual(topic);
    });
  });

  describe('update', () => {
    it('should update a topic', async () => {
      const dto = { name: 'new topic' };
      await service.update(1, dto);
      expect(mockTopicRepository.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('should remove a topic', async () => {
      await service.remove(1);
      expect(mockTopicRepository.delete).toHaveBeenCalledWith(1);
    });
  });
});
