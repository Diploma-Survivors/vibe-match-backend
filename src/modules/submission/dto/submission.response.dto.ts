import { ApiProperty } from '@nestjs/swagger';
import { SubmissionStatus } from '../enums/submission.enum';
import { TestResultDto } from '../../testcase/dto/run-testcase-result.response.dto';

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
    description: 'Results for each test case',
    type: [TestResultDto],
  })
  results: TestResultDto[];
}
