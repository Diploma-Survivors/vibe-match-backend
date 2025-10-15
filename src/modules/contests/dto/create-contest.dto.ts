import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsAfterNow } from '../decorators/is-after-now.decorator';
import { IsLessThan } from '../decorators/is-less-than.decorator';
import { ContestStatus } from '../enums/contest-status.enum';

export class CreateProblemWithContestDto {
  @ApiProperty({
    description: 'The unique identifier of the problem',
    example: 1,
    name: 'problemId',
  })
  @IsInt()
  @Expose({ name: 'problemId' })
  id: number;

  @ApiProperty({
    description: 'The score assigned to the problem in the contest',
    example: 100,
    minimum: 1,
  })
  @IsPositive()
  score: number;
}

export class CreateContestDto {
  @ApiProperty({
    description: 'The name of the contest',
    example: 'Weekly Coding Challenge',
    minLength: 3,
    maxLength: 100,
  })
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'A brief description of the contest',
    example: 'A contest to test your coding skills',
    minLength: 10,
    maxLength: 500,
  })
  @MinLength(10)
  @MaxLength(500)
  description: string;

  @ApiProperty({
    description:
      'The start time of the contest in ISO 8601 format (must be before endTime and in the future)',
    example: new Date().toISOString(),
  })
  @Type(() => Date)
  @IsDate()
  @IsLessThan<Date>('endTime', {
    messages: {
      validationFailed: 'startTime must be less than endTime',
    },
  })
  @IsAfterNow()
  startTime: Date;

  @ApiProperty({
    description: 'The end time of the contest in ISO 8601 format',
    example: new Date().toISOString(),
  })
  @Type(() => Date)
  @IsDate()
  endTime: Date;

  @ApiProperty({
    description: 'The duration of the contest in minutes',
    example: 120,
    minimum: 1,
  })
  @IsOptional()
  @IsPositive()
  durationMinutes?: number;

  @ApiProperty({
    description: 'The status of the contest',
    example: ContestStatus.PRIVATE,
    enum: ContestStatus,
  })
  @IsEnum(ContestStatus)
  status: ContestStatus;

  @ApiProperty({
    description: 'List of problems included in the contest with their scores',
    type: () => [CreateProblemWithContestDto],
  })
  @Type(() => CreateProblemWithContestDto)
  @IsArray()
  @ValidateNested({ each: true })
  problems: CreateProblemWithContestDto[];
}
