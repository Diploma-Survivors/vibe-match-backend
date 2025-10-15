import { ApiProperty } from '@nestjs/swagger';
import { DifficultyLevel } from '../enums/difficulty-level.enum';

export class GetTagDto {
  @ApiProperty({
    description: 'The unique identifier of the tag',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The name of the tag',
    example: 'Mathematics',
  })
  name: string;
}

export class GetTopicDto {
  @ApiProperty({
    description: 'The unique identifier of the topic',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The name of the topic',
    example: 'Algebra',
  })
  name: string;
}
export class GetProblemsResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the problem',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The title of the problem',
    example: 'Solve for x in the equation 2x + 3 = 7',
  })
  title: string;

  @ApiProperty({
    description: 'The difficulty level of the problem',
    example: DifficultyLevel.MEDIUM,
    enum: DifficultyLevel,
  })
  difficulty: DifficultyLevel;

  @ApiProperty({
    description: 'The tags associated with the problem',
    type: [GetTagDto],
  })
  tags: GetTagDto[];

  @ApiProperty({
    description: 'The topics associated with the problem',
    type: [GetTopicDto],
  })
  topics: GetTopicDto[];
}
