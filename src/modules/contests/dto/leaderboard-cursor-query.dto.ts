// NestJS
import { ApiProperty } from '@nestjs/swagger';

// Third-party
import { Type } from 'class-transformer';
import { IsOptional, IsNumber } from 'class-validator';

// Shared/Common
import { PaginationCursorDto } from 'src/common/pagination/dtos/pagination-cursor.dto';

export class LeaderboardCursorQueryDto extends PaginationCursorDto {
  @ApiProperty({
    description: 'Filter leaderboard by user ID (for instructors)',
    example: 123,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;
}

export class LeaderboardCursorFieldsDto {
  @Type(() => Number)
  totalScore: number;

  @Type(() => Number)
  rank: number;

  @Type(() => Number)
  id: number;
}