import { ApiProperty } from '@nestjs/swagger';
import { SubmissionStatus } from '../../../submission/enums/submission.enum';
import * as judge0Interface_1 from '../../../judge0/judge0.interface';

export class TestResultDto {
  @ApiProperty({
    description: 'Program output',
    example: '8',
  })
  stdout: string;

  @ApiProperty({
    description: 'Error output if any',
    example: 'Error: Segmentation fault',
  })
  stderr?: string;

  @ApiProperty({
    description: 'Execution time in milliseconds',
    example: '0.123',
  })
  time?: number;

  @ApiProperty({
    description: 'Memory usage in MB',
    example: 128,
  })
  memory?: number;

  @ApiProperty({
    description: 'Submission token in judge0 container',
    example: 'd85cd024-1548-4165-96c7-7bc88673f194',
  })
  token: string;

  @ApiProperty({
    description: 'Submission status',
    example: SubmissionStatus.ACCEPTED,
  })
  status: judge0Interface_1.Judge0Status;
}
