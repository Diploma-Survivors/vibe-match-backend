// NestJS
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsEnum } from 'class-validator';

// Shared/Common
import { PaginationCursorDto } from 'src/common/pagination/dtos/pagination-cursor.dto';

// Relative imports
import { SortBy } from '../enums/sort-by.enum';

export class LeaderboardQueryDto extends PaginationCursorDto {
  @ApiPropertyOptional({
    description: 'Sort leaderboard by the specified field',
    enum: SortBy,
    example: SortBy.NAME,
    default: SortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy: SortBy = SortBy.CREATED_AT;
}
