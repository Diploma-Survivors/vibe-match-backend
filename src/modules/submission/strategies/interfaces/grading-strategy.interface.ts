import { Submission } from '../../entities/submission.entity';
import { Problem } from '../../../problems/entities/problem.entity';
import { LtiLaunchSession } from '../../../lti/entities/lti-launch-session.entity';

export interface StrategyContext {
  submission: Submission;
  previousSubmissions: Submission[];
  problem: Problem;
  ltiSession: LtiLaunchSession | null;
}

export interface StrategyResult {
  shouldSendGrade: boolean;
  scoreToSend: number;
  comment: string;
}

export interface IGradingStrategy {
  validateSubmission(context: StrategyContext): Promise<void>;

  shouldSendGrade(context: StrategyContext): Promise<boolean>;

  calculateScore(context: StrategyContext): Promise<number>;

  getComment(context: StrategyContext): string;

  execute(context: StrategyContext): Promise<StrategyResult | null>;
}
