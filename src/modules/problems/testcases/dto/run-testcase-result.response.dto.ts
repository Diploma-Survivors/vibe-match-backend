import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as judge0Interface_1 from '../../../judge0/judge0.interface';
import { SubmissionStatus } from '../../../submission/enums/submission.enum';

export class TestResultDto {
  @ApiProperty({
    description: 'Test case input',
    example: '5 3',
  })
  input: string;

  @ApiProperty({
    description: 'Expected output',
    example: '8',
  })
  output: string;

  @ApiProperty({
    description: 'Submission token',
    example: 'd85cd024-1548-4165-96c7-7bc88673f194',
  })
  token: string;

  @ApiProperty({
    description: 'Submission status',
    example: SubmissionStatus.ACCEPTED,
  })
  status: judge0Interface_1.Judge0Status;

  @ApiProperty({
    description: 'Program output',
    example: '8',
  })
  stdout: string;

  @ApiProperty({
    description: 'Error output if any',
    example: 'Error: Segmentation fault',
  })
  stderr: string;

  @ApiProperty({
    description: 'Execution time in seconds',
    example: '0.123',
  })
  time: string;

  @ApiProperty({
    description: 'Memory usage in KB',
    example: 128,
  })
  memory: number;
}
