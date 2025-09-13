import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import {
  Judge0BatchResponse,
  Judge0SubmissionPayload,
} from './judge0.interface';

@Injectable()
export class Judge0Service {
  private readonly logger = new Logger(Judge0Service.name);
  private readonly judge0Url: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.judge0Url = this.configService.get<string>('appConfig.judge0Url')!;
    this.publicUrl = this.configService.get<string>(
      'appConfig.judge0CallbackUrl',
    )!;
  }

  /**
   * Create batch submissions with callbacks
   */
  async createSubmissionBatch(
    items: Judge0SubmissionPayload[],
  ): Promise<Judge0BatchResponse> {
    try {
      const url = `${this.judge0Url}/submissions/batch?base64_encoded=true&wait=false`;

      const response: AxiosResponse<Judge0BatchResponse> = await axios.post(
        url,
        { submissions: items },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create batch submission: ${error}`);
      throw error;
    }
  }

  /**
   * Convert time from milliseconds to seconds for Judge0
   */
  msToSeconds(ms: number): number {
    return Math.ceil(ms / 1000);
  }

  encodeBase64(data: string): string {
    return Buffer.from(data).toString('base64');
  }

  decodeBase64(data?: string): string {
    if (!data) return '';
    return Buffer.from(data, 'base64').toString('utf-8');
  }

  getCallbackUrl(submissionId: string, testcaseId: string): string {
    return `${this.publicUrl}/judge0/callback?sid=${submissionId}&tcid=${testcaseId}`;
  }

  normalizeOutput(output: string = ''): string {
    return output.replace(/\r\n/g, '\n').replace(/\s+$/g, '');
  }
}
