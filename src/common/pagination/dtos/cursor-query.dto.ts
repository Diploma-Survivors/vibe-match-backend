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

export class CursorQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  after?: string;

  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @ValidateIf((o: CursorQueryDto) => !o.last)
  first?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @ValidateIf((o: CursorQueryDto) => !o.first)
  last?: number;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;

  @Validate(FirstOrLastOnly)
  @Validate(AfterOrBeforeOnly)
  private readonly _validate?: any;
}
