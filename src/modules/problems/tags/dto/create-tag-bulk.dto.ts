import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateTagDto } from './create-tag.dto';

export class CreateTagBulkDto {
  @IsArray()
  @Type(() => CreateTagDto)
  @ValidateNested({ each: true })
  tags: CreateTagDto[];
}
