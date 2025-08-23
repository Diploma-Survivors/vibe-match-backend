import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as judge0Interface_1 from '../../judge0/judge0.interface';
import { SubmissionStatus } from '../../submission/enums/submission.enum';

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
  expectedOutput: string;

  @ApiProperty({
    description: 'Actual output from execution',
    example: '8',
  })
  actualOutput: string;

  @ApiProperty({
    description: 'Execution runtime',
    example: '34ms',
  })
  runtime: string;

  @ApiProperty({
    description: 'Memory usage',
    example: '1.2MB',
  })
  memory: string;

  @ApiProperty({
    description: 'Submission status',
    example: SubmissionStatus.ACCEPTED,
  })
  status: judge0Interface_1.Judge0Status;

  @ApiPropertyOptional({
    description: 'Error message if any',
    example: 'Compilation error: syntax error',
  })
  errorMessage?: string;
}
