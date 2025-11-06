import { IsDate, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

// Decoded from JSON before, after cursor
export class SubmissionCursorFieldsDto {
  @IsInt()
  id: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdAt?: Date;
}
