import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { PaginationCursorDto } from '../../../common/pagination/dtos/pagination-cursor.dto';
import { SortOrder } from '../../../common/pagination/enums/sort-order.enum';
import { QuerySubmissionsFilterDto } from './query-submission-filter.dto';

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

  readonly sortBy = 'createdAt';

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
