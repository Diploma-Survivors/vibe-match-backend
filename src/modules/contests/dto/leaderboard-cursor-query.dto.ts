// NestJS
import { ApiProperty } from '@nestjs/swagger';

// Third-party
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

// Shared/Common
import { PaginationCursorDto } from 'src/common/pagination/dtos/pagination-cursor.dto';

export class QueryLeaderboardFilterDto {
  @ApiProperty({
    description:
      'The string to filter users by their firstName, lastName, or email',
    example: 'john_doe',
  })
  @IsOptional()
  name?: string;
}

export class LeaderboardCursorQueryDto extends PaginationCursorDto {
  @ApiProperty({
    description: 'Filter contests by various criteria',
    type: () => QueryLeaderboardFilterDto,
    required: false,
  })
  @IsOptional()
  @Type(() => QueryLeaderboardFilterDto)
  @ValidateNested()
  filters?: QueryLeaderboardFilterDto;
}
