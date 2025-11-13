import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { SubmissionStatus } from '../enums/submission-status.enum';
import { Transform } from 'class-transformer';

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
  @Transform(({ value }) =>
    value !== undefined && value !== null && value !== ''
      ? Number(value)
      : undefined,
  )
  @IsInt()
  languageId?: number;

  @ApiProperty({
    description: 'Filter submissions by contest participation ID',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== null && value !== ''
      ? Number(value)
      : undefined,
  )
  @IsInt()
  participationId?: number;

  @ApiProperty({
    description: 'Filter submissions by problem ID',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== null && value !== ''
      ? Number(value)
      : undefined,
  )
  @IsInt()
  problemId?: number;
}
