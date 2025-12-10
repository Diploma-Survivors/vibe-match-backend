import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { Judge0Service } from './judge0.service';

jest.mock('axios');

describe('Judge0Service', () => {
  let service: Judge0Service;

  const mockConfig = {
    'judge0Config.judge0UseCe': true,
    'judge0Config.apiRapidHost': 'judge0.p.rapidapi.com',
    'judge0Config.apiRapidKey': 'rapid-api-key',
    'appConfig.apiVersion': 'v1',
    'judge0Config.judge0CallbackUrl': 'http://localhost:3000',
    'judge0Config.judge0Url': 'http://localhost:2358',
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return mockConfig[key] || undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Judge0Service,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<Judge0Service>(Judge0Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockConfigService.get.mockImplementation((key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return mockConfig[key] || undefined;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSubmissionBatch', () => {
    const items = [{ language_id: 1, source_code: 'bWFpbiA9IHB1dHMNCg==' }];
    const response = { data: [{ token: 'submission-token' }] };

    it('should create a batch submission successfully with CE', async () => {
      (axios.post as jest.Mock).mockResolvedValue(response);
      const result = await service.createSubmissionBatch(items);

      expect(axios.post).toHaveBeenCalledWith(
        'https://judge0.p.rapidapi.com/submissions/batch?base64_encoded=true',
        { submissions: items },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': 'rapid-api-key',
            'X-RapidAPI-Host': 'judge0.p.rapidapi.com',
          },
        },
      );
      expect(result).toEqual(response.data);
    });

    it('should create a batch submission successfully without CE', async () => {
      jest.spyOn(mockConfigService, 'get').mockImplementation((key: string) => {
        if (key === 'judge0Config.judge0UseCe') return false;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return mockConfig[key];
      });
      const customService = new Judge0Service(
        mockConfigService as unknown as ConfigService,
      );
      (axios.post as jest.Mock).mockResolvedValue(response);
      await customService.createSubmissionBatch(items);

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:2358/submissions/batch?base64_encoded=true',
        { submissions: items },
        { headers: { 'Content-Type': 'application/json' } },
      );
    });

    it('should throw an error if axios fails', async () => {
      const error = new Error('axios error');
      (axios.post as jest.Mock).mockRejectedValue(error);
      await expect(service.createSubmissionBatch(items)).rejects.toThrow(
        'axios error',
      );
    });
  });

  describe('getSubmissionDetails', () => {
    const token = 'submission-token';
    const response = { data: { token: 'submission-token' } };

    it('should get submission details successfully', async () => {
      (axios.get as jest.Mock).mockResolvedValue(response);
      const result = await service.getSubmissionDetails(token);

      expect(axios.get).toHaveBeenCalledWith(
        'https://judge0.p.rapidapi.com/submissions/submission-token?base64_encoded=true&fields=token,stdout,time,memory,stderr,compile_output,message,status,expected_output,stdin',
        {
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': 'rapid-api-key',
            'X-RapidAPI-Host': 'judge0.p.rapidapi.com',
          },
        },
      );
      expect(result).toEqual(response.data);
    });

    it('should throw InternalServerErrorException if axios fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('axios error'));
      await expect(service.getSubmissionDetails(token)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getCallbackUrl', () => {
    it('should return the correct callback URL for submit', () => {
      const submissionId = 'submission-id';
      const testcaseId = 'testcase-id';
      const isSubmit = true;
      const expectedUrl =
        'http://localhost:3000/v1/submissions/judge0/callback/submit?sid=submission-id&tcid=testcase-id';

      const result = service.getCallbackUrl(submissionId, testcaseId, isSubmit);

      expect(result).toEqual(expectedUrl);
    });

    it('should return the correct callback URL for run', () => {
      const submissionId = 'submission-id';
      const testcaseId = 'testcase-id';
      const isSubmit = false;
      const expectedUrl =
        'http://localhost:3000/v1/submissions/judge0/callback/run?sid=submission-id&tcid=testcase-id';

      const result = service.getCallbackUrl(submissionId, testcaseId, isSubmit);

      expect(result).toEqual(expectedUrl);
    });
  });
});
