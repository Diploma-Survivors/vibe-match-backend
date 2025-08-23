import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Judge0Response, Judge0SubmissionPayload } from './judge0.interface';
import axios, { AxiosResponse } from 'axios';

@Injectable()
export class Judge0Service {
  private readonly logger = new Logger(Judge0Service.name);
  private readonly judge0Url: string;

  constructor(private readonly configService: ConfigService) {
    this.judge0Url = this.configService.get<string>('appConfig.judge0Url')!;
  }

  async createSubmission(
    payload: Judge0SubmissionPayload,
  ): Promise<Judge0Response> {
    try {
      const url = `${this.judge0Url}/submissions?wait=true&base64_encoded=true`;
      const response: AxiosResponse<Judge0Response> = await axios.post(
        url,
        payload,
        {
          timeout: 30000, // 30 seconds timeout
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.debug(
        `Judge0 response status: ${response.data.status?.description}`,
      );
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Judge0 API error:', error.message);
      }

      throw error;
    }
  }

  encodeBase64(str: string | null | undefined): string {
    return Buffer.from(str || '', 'utf8').toString('base64');
  }

  decodeBase64(input?: string): string | undefined {
    if (!input) return undefined;
    try {
      return Buffer.from(input, 'base64').toString('utf8');
    } catch {
      return input;
    }
  }
}
