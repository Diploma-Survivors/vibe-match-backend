import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Max,
  Min,
  Validate,
} from 'class-validator';
import { SortOrder } from '../enums/sort-order.enum';
import { ValidCursorPagination } from '../validators/valid-cursor-pagination.validator';

export class PaginationCursorDto {
  @ApiProperty({
    description: 'Keyword to search problems by title or description',
    example: 'dynamic programming',
    required: false,
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({
    description:
      'The cursor to start fetching results after. Always use with "first".',
    example: 'eyJpZCI6IjI5ZjllODYxLWQ...',
    required: false,
  })
  @IsOptional()
  @IsString()
  after?: string;

  @ApiProperty({
    description:
      'The cursor to start fetching results before. Always use with "last".',
    example: 'eyJpZCI6IjI5ZjllODYxLWQ...',
    required: false,
  })
  @IsOptional()
  @IsString()
  before?: string;

  @ApiProperty({
    description:
      'Number of items to return from the start of the list (forward pagination with "after"). If "first" is provided, "last" must be omitted.',
    example: 10,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @Min(1)
  @Max(100)
  first?: number;

  @ApiProperty({
    description:
      'Number of items to return from the end of the list (backward pagination with "before"). If "last" is provided, "first" must be omitted.',
    example: 10,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @Min(1)
  @Max(100)
  last?: number;

  @ApiProperty({
    enum: SortOrder,
    description: 'Sort order of the results',
    example: SortOrder.DESC,
    default: SortOrder.ASC,
    required: false,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;

  @Validate(ValidCursorPagination)
  private readonly _validate?: any;
}
