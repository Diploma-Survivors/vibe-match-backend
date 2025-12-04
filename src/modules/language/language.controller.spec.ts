import { Test, TestingModule } from '@nestjs/testing';
import { Language } from './entities/language.entity';
import { LanguageController } from './language.controller';
import { LanguageService } from './language.service';

describe('LanguageController', () => {
  let controller: LanguageController;
  let service: LanguageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LanguageController],
      providers: [
        {
          provide: LanguageService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LanguageController>(LanguageController);
    service = module.get<LanguageService>(LanguageService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of languages', async () => {
      const result: Language[] = [];
      jest.spyOn(service, 'findAll').mockResolvedValue(result);

      expect(await controller.findAll()).toBe(result);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single language', async () => {
      const result: Language = {
        id: 1,
        name: 'javascript',
      };
      jest.spyOn(service, 'findOne').mockResolvedValue(result);

      expect(await controller.findOne('1')).toBe(result);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });
});
