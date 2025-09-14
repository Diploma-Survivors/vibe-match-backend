import { ApiProperty } from '@nestjs/swagger';

export class CreateTagResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the tag',
    example: 'tag_12345',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the tag',
    example: 'Dynamic Programming',
  })
  name: string;

  @ApiProperty({
    description: 'The creation date of the tag',
    example: '2025-10-01T12:34:56.789Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The last updated date of the tag',
    example: '2025-10-01T12:34:56.789Z',
  })
  updatedAt: Date;
}
