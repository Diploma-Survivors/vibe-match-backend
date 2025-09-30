import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateTopicDto } from './create-topic.dto';

export class CreateTopicBulkDto {
  @IsArray()
  @Type(() => CreateTopicDto)
  @ValidateNested({ each: true })
  topics: CreateTopicDto[];
}
