import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateProblemDto } from './create-problem.dto';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProblemBulkDto {
  @ApiProperty({
    description: 'List of problems to create',
    type: () => [CreateProblemDto],
  })
  @IsArray()
  @Type(() => CreateProblemDto)
  @ValidateNested({ each: true })
  problems: CreateProblemDto[];
}
