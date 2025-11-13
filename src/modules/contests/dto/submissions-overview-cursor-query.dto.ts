// NestJS
import { ApiProperty } from '@nestjs/swagger';

// Third-party
import { Type } from 'class-transformer';
import { IsOptional, IsNumber } from 'class-validator';

// Shared/Common
import { PaginationCursorDto } from 'src/common/pagination/dtos/pagination-cursor.dto';

export class SubmissionsOverviewCursorQueryDto extends PaginationCursorDto {
  @ApiProperty({
    description: 'Filter by user ID (for instructors)',
    example: 123,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;
}

export class SubmissionsOverviewCursorFieldsDto {
  @Type(() => Number)
  totalScore: number;

  @Type(() => Number)
  participationId: number;

  @Type(() => Number)
  id: number;
}