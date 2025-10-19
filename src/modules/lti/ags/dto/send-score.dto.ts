import { AgsActivityProgress } from '../enums/ags-activity-progress.enum';
import { AgsGradingProgress } from '../enums/ags-grading-progress.enum';

export class SendScoreDto {
  userId: string;
  scoreGiven: number;
  scoreMaximum: number;
  comment?: string;
  timestamp: string;
  activityProgress: AgsActivityProgress;
  gradingProgress: AgsGradingProgress;
}

