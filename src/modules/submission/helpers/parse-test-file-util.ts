import { CreateSubmissionDto } from 'src/modules/submission/dto/create-submission.dto';
import { StoragesService } from 'src/modules/storages/storages.service';
import { Judge0SubmissionPayload } from '../../judge0/judge0.interface';
import { Problem } from '../../problems/entities/problem.entity';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TestcaseParserUtil {
  constructor(
    private readonly storagesService: StoragesService,
    private readonly configService: ConfigService,
  ) {}

  async buildItemsFromProblemFile(
    submissionId: string,
    dto: CreateSubmissionDto,
    problem: Problem,
    buildJudge0Payload: (
      dto: CreateSubmissionDto,
      problem: Problem,
      submissionId: string,
      index: number,
      input: string,
      output: string,
      run: boolean,
      sourceBase64?: string,
      additionalFilesBase64?: string,
    ) => Judge0SubmissionPayload,
    sourceBase64?: string,
    additionalFilesBase64?: string,
  ): Promise<Judge0SubmissionPayload[]> {
    const source = this.configService.get<boolean>('useAWS')
      ? String(problem.testcase.fileUrl)
      : 'src/modules/submission/testcase.txt';

    const buffer = await this.storagesService.readAuto(source);
    const content = buffer.toString('utf-8').trim();

    const items: Judge0SubmissionPayload[] = [];

    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    let stage: 'header' | 'index' | 'input' | 'output' = 'header';
    let input = '';
    let output = '';
    let i = 0;

    for (const line of lines) {
      if (stage === 'header') {
        stage = 'index';
        continue;
      }

      if (stage === 'index') {
        stage = 'input';
        continue;
      }

      if (stage === 'input') {
        input = line;
        stage = 'output';
        continue;
      }

      if (stage === 'output') {
        output = line;
        items.push(
          buildJudge0Payload(
            dto,
            problem,
            submissionId,
            i++,
            input,
            output,
            true,
            sourceBase64,
            additionalFilesBase64,
          ),
        );
        stage = 'index';
      }
    }
    return items;
  }
}
