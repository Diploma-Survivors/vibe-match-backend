import { Expose, Type } from 'class-transformer';
import {
  IsArray,
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
import { PaginationCursorDto } from 'src/common/pagination/dtos/pagination-cursor.dto';
import { DifficultyLevel } from '../enums/difficulty-level.enum';
import { SortBy } from '../enums/sort-by.enum';
import { ApiProperty } from '@nestjs/swagger';

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
    description: 'Filter problems by topic ID',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    name: 'topicIds',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  @Expose({ name: 'topicIds' })
  topics?: string[];

  @ApiProperty({
    description: 'Filter problems by an array of tag IDs',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    type: [String],
    name: 'tagIds',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @Expose({ name: 'tagIds' })
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
