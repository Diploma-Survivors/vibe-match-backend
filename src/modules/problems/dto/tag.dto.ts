import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TagDto {
  @ApiProperty({
    description: 'The ID of the tag',
    format: 'uuid',
  })
  @IsUUID('all', { message: 'Tag ID must be a valid UUID' })
  id: string;
}
