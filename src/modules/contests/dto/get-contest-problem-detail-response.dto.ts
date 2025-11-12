import { ApiProperty } from '@nestjs/swagger';
import { DifficultyLevel } from 'src/modules/problems/enums/difficulty-level.enum';

class TestcaseSampleDto {
  @ApiProperty({
    description: 'Sample input',
    example: '5 10',
  })
  input: string;

  @ApiProperty({
    description: 'Sample output',
    example: '15',
  })
  output: string;
}

export class GetContestProblemDetailResponseDto {
  @ApiProperty({
    description: 'Problem ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Problem title',
    example: 'Two Sum',
  })
  title: string;

  @ApiProperty({
    description: 'Maximum score for this problem in the contest',
    example: 100,
  })
  maxScore: number;

  @ApiProperty({
    description: 'Problem description',
    example: 'Given an array of integers...',
  })
  problemDescription: string;

  @ApiProperty({
    description: 'Input description',
    example: 'First line contains N...',
  })
  inputDescription: string;

  @ApiProperty({
    description: 'Output description',
    example: 'Print the sum of...',
  })
  outputDescription: string;

  @ApiProperty({
    description: 'Problem difficulty',
    enum: DifficultyLevel,
    example: DifficultyLevel.EASY,
  })
  difficulty: DifficultyLevel;

  @ApiProperty({
    description: 'Time limit in milliseconds',
    example: 2000,
  })
  timeLimitMs: number;

  @ApiProperty({
    description: 'Memory limit in kilobytes',
    example: 256000,
  })
  memoryLimitKb: number;

  @ApiProperty({
    description: 'Sample test cases',
    type: [TestcaseSampleDto],
  })
  testcaseSamples: TestcaseSampleDto[];

  @ApiProperty({
    description: 'Maximum number of attempts allowed (null if unlimited)',
    example: 10,
    nullable: true,
  })
  maxAttempts: number | null;

  @ApiProperty({
    description: 'Whether to show submission count to the user',
    example: true,
  })
  showSubmissionCount: boolean;
}
