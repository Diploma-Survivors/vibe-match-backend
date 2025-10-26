import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class SubmissionCursorPayloadDto {
  @Type(() => Date)
  @IsDate()
  createdAt: Date;
}
