import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TopicDto {
  @ApiProperty({
    description: 'The ID of the topic',
    format: 'uuid',
  })
  @IsUUID('all', { message: 'Topic ID must be a valid UUID' })
  id: string;
}
