import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CreateTagResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the tag',
    example: 'tag_12345',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'The name of the tag',
    example: 'Dynamic Programming',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'The creation date of the tag',
    example: '2025-10-01T12:34:56.789Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'The last updated date of the tag',
    example: '2025-10-01T12:34:56.789Z',
  })
  @Expose()
  updatedAt: Date;
}
