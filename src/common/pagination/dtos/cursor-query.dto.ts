import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Validate,
  ValidateIf,
} from 'class-validator';
import { SortOrder } from '../enums/sort-order.enum';
import { FirstOrLastOnly } from '../validators/first-or-last-only.validator';
import { AfterOrBeforeOnly } from '../validators/after-or-before-only.validator';
import { ApiProperty } from '@nestjs/swagger';

export class CursorQueryDto {
  @ApiProperty({
    description: 'Keyword to search problems by title or description',
    example: 'array',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({
    description: 'The cursor to start fetching results after',
    example: 'eyJpZCI6IjI5ZjllODYxLWQ...',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  after?: string;

  @ApiProperty({
    description: 'The cursor to start fetching results before',
    example: 'eyJpZCI6IjI5ZjllODYxLWQ...',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  before?: string;

  @ApiProperty({
    description: 'Number of items to return from the start of the list',
    example: 10,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @ValidateIf((o: CursorQueryDto) => !o.last)
  first?: number;

  @ApiProperty({
    description: 'Number of items to return from the end of the list',
    example: 10,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @ValidateIf((o: CursorQueryDto) => !o.first)
  last?: number;

  @ApiProperty({
    enum: SortOrder,
    description: 'Sort order of the results',
    example: SortOrder.ASC,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;

  @Validate(FirstOrLastOnly)
  @Validate(AfterOrBeforeOnly)
  private readonly _validate?: any;
}
