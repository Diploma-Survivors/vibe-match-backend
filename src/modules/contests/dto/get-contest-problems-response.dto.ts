import { ApiProperty } from '@nestjs/swagger';
import { DifficultyLevel } from 'src/modules/problems/enums/difficulty-level.enum';

export class ContestProblemDto {
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
}

export class GetContestProblemsResponseDto {
  @ApiProperty({
    description: 'List of problems in the contest',
    type: [ContestProblemDto],
  })
  problems: ContestProblemDto[];

  @ApiProperty({
    description: 'Total number of problems',
    example: 5,
  })
  totalProblems: number;
}
