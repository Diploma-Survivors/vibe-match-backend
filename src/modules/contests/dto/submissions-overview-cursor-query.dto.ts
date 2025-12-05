// NestJS
import { ApiProperty } from '@nestjs/swagger';

// Third-party
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

// Shared/Common
import { PaginationCursorDto } from 'src/common/pagination/dtos/pagination-cursor.dto';

export class QuerySubmissionsOverviewFilterDto {
  @ApiProperty({
    description:
      'The string to filter users by their firstName, lastName, or email',
    example: 'john_doe',
    required: false,
  })
  @IsOptional()
  name?: string;
}

export class SubmissionsOverviewCursorQueryDto extends PaginationCursorDto {
  @ApiProperty({
    description: 'Filter submissions by various criteria',
    type: () => QuerySubmissionsOverviewFilterDto,
    required: false,
  })
  @IsOptional()
  @Type(() => QuerySubmissionsOverviewFilterDto)
  @ValidateNested()
  filters?: QuerySubmissionsOverviewFilterDto;
}
