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
import { ApiProperty } from '@nestjs/swagger';

class QueryProblemsFilterDto {
  @ApiProperty({
    enum: DifficultyLevel,
    description: 'Filter problems by difficulty level',
    example: DifficultyLevel.EASY,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiProperty({
    description: 'Filter problems by topic ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  topic?: string;

  @ApiProperty({
    description: 'Filter problems by an array of tag IDs',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    isArray: true,
    nullable: true,
  })
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
  @ApiProperty({
    enum: SortBy,
    default: SortBy.CREATED_AT,
    description: 'Field to sort by',
    example: SortBy.CREATED_AT,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy: SortBy = SortBy.CREATED_AT;

  @ApiProperty({
    type: () => QueryProblemsFilterDto,
    description: 'Filters for querying problems',
    nullable: true,
  })
  @IsOptional()
  @Type(() => QueryProblemsFilterDto)
  @ValidateNested()
  filters?: QueryProblemsFilterDto;
}
