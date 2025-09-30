import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateProblemDto } from './create-problem.dto';

export class CreateProblemBulkDto {
  @IsArray()
  @Type(() => CreateProblemDto)
  @ValidateNested({ each: true })
  problems: CreateProblemDto[];
}
