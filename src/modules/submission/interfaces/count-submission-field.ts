import { SubmissionStatus } from '../enums/submission-status.enum';

export interface CountSubmissionField {
  userId?: number;
  problemId?: number;
  contestParticipationId?: number;
  status?: SubmissionStatus;
}
