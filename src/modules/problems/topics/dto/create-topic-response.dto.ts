import { ApiProperty } from '@nestjs/swagger';

export class CreateTopicResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the topic',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The name of the topic',
    example: 'Dynamic Programming',
  })
  name: string;

  @ApiProperty({
    description: 'The description of the topic',
    example:
      'This topic covers various dynamic programming techniques and problems.',
  })
  description: string;

  @ApiProperty({
    description: 'The creation date of the topic',
    example: '2025-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The last update date of the topic',
    example: '2025-01-01T00:00:00Z',
  })
  updatedAt: Date;

  constructor(partial: Partial<CreateTopicResponseDto>) {
    Object.assign(this, partial);
  }
}
