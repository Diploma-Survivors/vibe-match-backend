import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsLessThan } from '../decorators/is-less-than.decorator';
import { ContestStatus } from '../enums/contest-status.enum';

export class CreateContestDto {
  @ApiProperty({
    description: 'The name of the contest',
    example: 'Weekly Coding Challenge',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'A brief description of the contest',
    example: 'A contest to test your coding skills',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description: string;

  @ApiProperty({
    description: 'The start time of the contest in ISO 8601 format',
    example: '2025-10-01T10:00:00Z',
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  @IsLessThan<Date>('endTime', {
    messages: {
      validationFailed: 'startTime must be less than endTime',
    },
  })
  startTime: Date;

  @ApiProperty({
    description: 'The end time of the contest in ISO 8601 format',
    example: '2025-10-01T12:00:00Z',
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  endTime: Date;

  @ApiProperty({
    description: 'The duration of the contest in minutes',
    example: 120,
  })
  @IsNumber()
  @IsPositive()
  durationMinutes: number;

  @ApiProperty({
    description: 'The status of the contest',
    example: ContestStatus.PRIVATE,
    enum: ContestStatus,
  })
  @IsEnum(ContestStatus)
  status: ContestStatus;

  @ApiProperty({
    description: 'List of problem IDs to be included in the contest',
    example: ['123abc', '123jfk2-456abc', '789xyz'],
  })
  @IsUUID('all', { each: true })
  @Expose({ name: 'problemIds' })
  problems: string[];
}
