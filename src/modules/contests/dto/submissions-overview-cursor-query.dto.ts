// NestJS
// Third-party
import { Type } from 'class-transformer';

// Shared/Common
import { PaginationCursorDto } from 'src/common/pagination/dtos/pagination-cursor.dto';

export class SubmissionsOverviewCursorQueryDto extends PaginationCursorDto {}

export class SubmissionsOverviewCursorFieldsDto {
  @Type(() => Number)
  totalScore: number;

  @Type(() => Number)
  participationId: number;

  @Type(() => Number)
  id: number;
}
