import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { PaginationCursorDto } from '../../../common/pagination/dtos/pagination-cursor.dto';
import { SortOrder } from '../../../common/pagination/enums/sort-order.enum';
import { QuerySubmissionsFilterDto } from './query-submission-filter.dto';
import { SortBy } from '../enums/submission-search.enum';

export class SubmissionsCursorQueryDto extends PaginationCursorDto {
  @ApiProperty({
    enum: SortOrder,
    default: SortOrder.DESC,
    description: 'Sort order by creation time',
    required: false,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;

  @ApiProperty({
    enum: SortBy,
    default: SortBy.CREATED_AT,
    description: 'Field to sort by',
    example: SortBy.CREATED_AT,
    required: false,
  })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy: SortBy = SortBy.CREATED_AT;

  @ApiProperty({
    type: () => QuerySubmissionsFilterDto,
    description: 'Filters for querying submissions',
    required: false,
  })
  @IsOptional()
  @Type(() => QuerySubmissionsFilterDto)
  @ValidateNested()
  filters?: QuerySubmissionsFilterDto;
}
