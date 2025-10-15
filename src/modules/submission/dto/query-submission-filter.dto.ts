import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { SubmissionStatus } from '../enums/submission-status.enum';

export class QuerySubmissionsFilterDto {
  @ApiProperty({
    enum: SubmissionStatus,
    description: 'Filter submissions by status',
    required: false,
  })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;

  @ApiProperty({
    description: 'Filter submissions by language ID',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  languageId?: number;
}
