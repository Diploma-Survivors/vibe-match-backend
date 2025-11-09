// Relative imports
import { DifficultyLevel } from '../enums/difficulty-level.enum';
import { ProblemType } from '../enums/problem-type.enum';
import { ProblemVisibility } from '../enums/problem-visibility.enum';

/**
 * Interface representing the context for problem filters
 */
export interface FilterContext {
  difficulty?: DifficultyLevel;
  tags?: number[];
  topics?: number[];
  courseId?: number;
  type?: ProblemType;
  visibility?: ProblemVisibility;
  authorId?: number;
  [key: string]: any;
}
