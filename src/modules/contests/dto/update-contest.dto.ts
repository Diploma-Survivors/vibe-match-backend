import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SubmissionStrategyEnum } from 'src/modules/submission/enums/submission-strategy.enum';
import { DeadlineEnforcement } from '../enums/deadline-enforcement.enum';

export class UpdateContestDto {
  @ApiPropertyOptional({
    description: 'Contest name',
    example: 'Weekly Coding Challenge - Updated',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Contest description',
    example: 'An updated description for the contest',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Contest start time in ISO 8601 format',
    example: '2024-01-15T08:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Contest end time in ISO 8601 format',
    example: '2024-01-15T18:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Late deadline for flexible enforcement (ISO 8601 format)',
    example: '2024-01-16T00:00:00Z',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  lateDeadline?: string | null;

  @ApiPropertyOptional({
    description: 'Contest duration in minutes (null for unlimited)',
    example: 120,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number | null;

  @ApiPropertyOptional({
    description: 'Deadline enforcement policy',
    enum: DeadlineEnforcement,
    example: DeadlineEnforcement.STRICT,
  })
  @IsOptional()
  @IsEnum(DeadlineEnforcement)
  deadlineEnforcement?: DeadlineEnforcement;

  @ApiPropertyOptional({
    description:
      'Submission strategy for all problems in this contest (overrides individual problem strategies)',
    enum: SubmissionStrategyEnum,
    example: SubmissionStrategyEnum.BEST_SCORE,
  })
  @IsOptional()
  @IsEnum(SubmissionStrategyEnum)
  submissionStrategy?: SubmissionStrategyEnum;
}
