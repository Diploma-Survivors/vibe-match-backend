import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateTopicDto } from './create-topic.dto';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTopicBulkDto {
  @ApiProperty({
    type: [CreateTopicDto],
    description: 'List of topics to create',
  })
  @IsArray()
  @Type(() => CreateTopicDto)
  @ValidateNested({ each: true })
  topics: CreateTopicDto[];
}
