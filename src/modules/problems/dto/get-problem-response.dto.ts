import { ApiProperty } from '@nestjs/swagger';
import { DifficultyLevel } from '../enums/difficulty-level.enum';
import { ProblemType } from '../enums/problem-type.enum';

export class GetProblemResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the problem',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
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
    example: 'This is a sample input description.',
  })
  inputDescription: string;

  @ApiProperty({
    description: 'The output description of the problem',
    example: 'This is a sample output description.',
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
    description: 'The creation date of the problem',
    example: new Date(),
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The last updated date of the problem',
    example: new Date(),
  })
  updatedAt: Date;
}
