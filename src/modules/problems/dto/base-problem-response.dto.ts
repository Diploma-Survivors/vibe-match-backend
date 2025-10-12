import { ApiProperty } from '@nestjs/swagger';
import { DifficultyLevel } from '../enums/difficulty-level.enum';
import { ProblemType } from '../enums/problem-type.enum';

/**
 * Base class for Problem Response DTOs containing common fields
 */
export abstract class BaseProblemResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the problem',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'The title of the problem',
    example: 'Sample Problem',
  })
  title: string;

  @ApiProperty({
    description: 'The description of the problem',
    example: 'This is a sample problem description.',
  })
  description: string;

  @ApiProperty({
    description: 'The input description of the problem',
    example: 'Input consists of a single integer.',
  })
  inputDescription: string;

  @ApiProperty({
    description: 'The output description of the problem',
    example: 'Output consists of a single integer.',
  })
  outputDescription: string;

  @ApiProperty({
    description: 'The maximum score for the problem',
    example: 100,
  })
  maxScore: number;

  @ApiProperty({
    description: 'The time limit for the problem in milliseconds',
    example: 1000,
  })
  timeLimitMs: number;

  @ApiProperty({
    description: 'The memory limit for the problem in kilobytes',
    example: 1024,
  })
  memoryLimitKb: number;

  @ApiProperty({
    description: 'The difficulty level of the problem',
    example: DifficultyLevel.EASY,
    enum: DifficultyLevel,
  })
  difficulty: DifficultyLevel;

  @ApiProperty({
    description: 'The type of the problem',
    example: ProblemType.STANDALONE,
    enum: ProblemType,
  })
  type: ProblemType;

  @ApiProperty({
    description: 'The creation timestamp of the problem',
    example: '2025-10-01T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The last updated timestamp of the problem',
    example: '2025-10-01T12:00:00Z',
  })
  updatedAt: Date;
}
