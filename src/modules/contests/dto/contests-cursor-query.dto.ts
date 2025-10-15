import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PaginationCursorDto } from 'src/common/pagination/dtos/pagination-cursor.dto';
import { IsLessThan } from '../decorators/is-less-than.decorator';
import { SortBy } from '../enums/sort-by.enum';

export class QueryContestsFilterDto {
  @ApiProperty({
    description: 'Filter contests have started after the specified start time',
    example: new Date().toISOString(),
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsLessThan<Date>('endTime', {
    messages: {
      message: 'startTime must be less than endTime',
    },
  })
  @IsDate()
  startTime?: Date;

  @ApiProperty({
    description: 'Filter contests have ended before the specified end time',
    example: new Date().toISOString(),
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endTime?: Date;

  @ApiProperty({
    description: 'Filter contests by minimum duration in minutes',
    example: 30,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsLessThan<number>('maxDurationMinutes', {
    messages: {
      message: 'minDurationMinutes must be less than maxDurationMinutes',
    },
  })
  @Type(() => Number)
  @IsPositive()
  minDurationMinutes?: number;

  @ApiProperty({
    description: 'Filter contests by maximum duration in minutes',
    example: 120,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  maxDurationMinutes?: number;
}

export class ContestsCursorQueryDto extends PaginationCursorDto {
  @ApiProperty({
    description: 'Sort contests by the specified field',
    enum: SortBy,
    example: SortBy.NAME,
    required: false,
    default: SortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy: SortBy = SortBy.CREATED_AT;

  @ApiProperty({
    description: 'Filter contests by various criteria',
    type: () => QueryContestsFilterDto,
    required: false,
  })
  @IsOptional()
  @Type(() => QueryContestsFilterDto)
  @ValidateNested()
  filters?: QueryContestsFilterDto;
}

export class ContestCursorFieldsDto {
  @IsInt()
  id: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startTime?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endTime?: Date;

  @IsOptional()
  @IsString()
  name?: string;
}
