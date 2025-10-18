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
  private readonly apiVersion: string;
  private readonly rapidHost: string;
  private readonly rapidKey: string;
  private readonly judge0UseCe: boolean;

  constructor(private readonly configService: ConfigService) {
    this.judge0UseCe = this.configService.get<boolean>(
      'judge0Config.judge0UseCe',
    )!;
    this.rapidHost = this.configService.get<string>(
      'judge0Config.apiRapidHost',
    )!;

    if (this.judge0UseCe) {
      this.judge0Url = `https://${this.rapidHost}`;
    } else {
      this.judge0Url = this.configService.get<string>(
        'judge0Config.judge0Url',
      )!;
    }

    this.publicUrl = this.configService.get<string>(
      'judge0Config.judge0CallbackUrl',
    )!;
    this.apiVersion = this.configService.get<string>('appConfig.apiVersion')!;
    this.rapidKey = this.configService.get<string>('judge0Config.apiRapidKey')!;
  }

  /**
   * Create batch submissions with callbacks
   */
  async createSubmissionBatch(
    items: Judge0SubmissionPayload[],
  ): Promise<Judge0BatchResponse> {
    try {
      const url = `${this.judge0Url}/submissions/batch?base64_encoded=true`;

      this.logger.log(url);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.judge0UseCe) {
        headers['X-RapidAPI-Key'] = this.rapidKey;
        headers['X-RapidAPI-Host'] = this.rapidHost;
      }

      const response: AxiosResponse<Judge0BatchResponse> = await axios.post(
        url,
        { submissions: items },
        {
          headers,
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create batch submission: ${error}`);
      throw error;
    }
  }

  getCallbackUrl(
    submissionId: string,
    testcaseId: string,
    isSubmit: boolean,
  ): string {
    if (isSubmit) {
      return `${this.publicUrl}/${this.apiVersion}/submissions/judge0/callback/submit?sid=${submissionId}&tcid=${testcaseId}`;
    }
    return `${this.publicUrl}/${this.apiVersion}/submissions/judge0/callback/run?sid=${submissionId}&tcid=${testcaseId}`;
  }
}
