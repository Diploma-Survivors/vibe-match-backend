import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CursorQueryDto } from 'src/common/pagination/dtos/cursor-query.dto';
import { DifficultyLevel } from '../enums/difficulty-level.enum';
import { SortBy } from '../enums/sort-by.enum';

class QueryProblemsFilterDto {
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @IsOptional()
  @IsUUID()
  topic?: string;

  @IsOptional()
  @IsUUID('all', { each: true })
  tags?: string[];
}

export class ProblemCursorFieldsDto {
  @IsNotEmpty()
  @IsUUID()
  id: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @IsOptional()
  @IsInt()
  @IsPositive()
  maxScore?: number;
}

export class QueryProblemsDto extends CursorQueryDto {
  @IsOptional()
  @IsEnum(SortBy)
  sortBy: SortBy = SortBy.CREATED_AT;

  @IsOptional()
  @Type(() => QueryProblemsFilterDto)
  @ValidateNested()
  filters?: QueryProblemsFilterDto;
}
