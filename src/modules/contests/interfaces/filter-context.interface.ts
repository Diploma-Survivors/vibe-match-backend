import { ContestStatus } from '../enums/contest-status.enum';

/**
 * Context interface for contest filters.
 */
export interface FilterContext {
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  status?: ContestStatus;
  courseId?: number;
  authorId?: number;
  [key: string]: any;
}
