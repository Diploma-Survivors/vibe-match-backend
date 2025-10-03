import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateTagDto } from './create-tag.dto';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTagBulkDto {
  @ApiProperty({ type: [CreateTagDto], description: 'Array of tags to create' })
  @IsArray()
  @Type(() => CreateTagDto)
  @ValidateNested({ each: true })
  tags: CreateTagDto[];
}
