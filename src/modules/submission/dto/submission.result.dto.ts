import { ApiProperty } from '@nestjs/swagger';
import { TestResultDto } from '../../problems/testcases/dto/run-testcase-result.response.dto';
import { SubmissionStatus } from '../enums/submission-status.enum';
import { ResultDescription } from './result-description.dto';

export class SubmissionResultDto {
  @ApiProperty({
    description: 'Overall submission status',
    enum: SubmissionStatus,
    example: SubmissionStatus.ACCEPTED,
  })
  status: SubmissionStatus;

  @ApiProperty({
    description: 'Total number of test cases',
    example: 10,
  })
  totalTests: number;

  @ApiProperty({
    description: 'Number of passed test cases',
    example: 8,
  })
  passedTests: number;

  @ApiProperty({
    description: 'Final score',
    example: 80,
  })
  score: number;

  @ApiProperty({
    description: 'Sum of runtime in milliseconds',
    example: 5,
  })
  runtime: number;

  @ApiProperty({
    description: 'Sum of memory in kbs',
    example: 5,
  })
  memory: number;

  @ApiProperty({
    description: 'Results for each test case',
    type: [TestResultDto],
  })
  results?: TestResultDto[];

  @ApiProperty({
    description: 'Description for the submission result',
    example: 'All test cases passed',
    type: ResultDescription,
  })
  resultDescription?: ResultDescription;
}
