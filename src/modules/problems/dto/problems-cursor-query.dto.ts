import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PaginationCursorDto } from 'src/common/pagination/dtos/pagination-cursor.dto';
import { DifficultyLevel } from '../enums/difficulty-level.enum';
import { ProblemType } from '../enums/problem-type.enum';
import { SortBy } from '../enums/sort-by.enum';

class QueryProblemsFilterDto {
  @ApiProperty({
    enum: DifficultyLevel,
    description: 'Filter problems by difficulty level',
    example: DifficultyLevel.EASY,
    required: false,
  })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiProperty({
    enum: ProblemType,
    description: 'Filter problems by type',
    example: ProblemType.CONTEST,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProblemType)
  type?: ProblemType;

  @ApiProperty({
    description: 'Filter problems by topic ID',
    example: [1, 2, 3],
    name: 'topicIds',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsArray()
  @IsInt({ each: true })
  @Expose({ name: 'topicIds' })
  topics?: number[];

  @ApiProperty({
    description: 'Filter problems by an array of tag IDs',
    example: [1, 2, 3],
    name: 'tagIds',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsArray()
  @IsInt({ each: true })
  @Expose({ name: 'tagIds' })
  tags?: number[];
}

export class ProblemCursorFieldsDto {
  @IsInt()
  id: number;

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

export class ProblemsCursorQueryDto extends PaginationCursorDto {
  @ApiProperty({
    enum: SortBy,
    default: SortBy.CREATED_AT,
    description: 'Field to sort by',
    example: SortBy.TITLE,
    required: false,
  })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy: SortBy = SortBy.CREATED_AT;

  @ApiProperty({
    type: () => QueryProblemsFilterDto,
    description: 'Filters for querying problems',
    required: false,
  })
  @IsOptional()
  @Type(() => QueryProblemsFilterDto)
  @ValidateNested()
  filters?: QueryProblemsFilterDto;
}
