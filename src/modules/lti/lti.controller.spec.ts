import { Test, TestingModule } from '@nestjs/testing';
import { KeysService } from './keys.service';
import { LtiController } from './lti.controller';
import { LtiService } from './lti.service';

describe('LtiController', () => {
  let controller: LtiController;
  let keysService: KeysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LtiController],
      providers: [
        {
          provide: LtiService,
          useValue: {},
        },
        {
          provide: KeysService,
          useValue: {
            getJwks: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LtiController>(LtiController);
    keysService = module.get<KeysService>(KeysService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getJwks', () => {
    it('should return a JWKS object', () => {
      const result = { keys: [] };
      jest.spyOn(keysService, 'getJwks').mockReturnValue(result);

      expect(controller.getJwks()).toBe(result);
      expect(keysService.getJwks).toHaveBeenCalled();
    });
  });
});
