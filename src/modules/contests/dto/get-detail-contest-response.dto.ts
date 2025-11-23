// NestJS
import { ApiProperty } from '@nestjs/swagger';

// Third-party
import { Exclude, Expose } from 'class-transformer';

// Relative imports
import { Course } from 'src/modules/course/entities/course.entity';
import { DifficultyLevel } from 'src/modules/problems/enums/difficulty-level.enum';
import { SubmissionStrategyEnum } from 'src/modules/submission/enums/submission-strategy.enum';
import { User } from 'src/modules/user/entities/user.entity';
import { DeadlineEnforcement } from '../enums/deadline-enforcement.enum';
import { ProblemStatus } from '../enums/problem-status.enum';
import { ParticipationStatusDto } from './participation-status.dto';

export class ContestProblemDetail {
  @ApiProperty({
    description: 'The unique identifier of the problem',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The title of the problem',
    example: 'Two Sum Problem',
  })
  title: string;

  @ApiProperty({
    description: 'The difficulty level of the problem',
    example: DifficultyLevel.EASY,
    enum: DifficultyLevel,
  })
  difficulty: DifficultyLevel;

  @ApiProperty({
    description: 'The memory limit for the problem',
    example: 512,
  })
  memoryLimitKb: number;

  @ApiProperty({
    description: 'The time limit for the problem',
    example: 2000,
  })
  timeLimitMs: number;

  @ApiProperty({
    description: 'The maximum score for this problem in the contest',
    example: 100,
  })
  maxScore: number;

  @ApiProperty({
    description:
      "The user's score for this problem based on the contest's submission strategy",
    example: 85,
  })
  userScore: number;

  @ApiProperty({
    description: 'The status of the problem for the user',
    example: ProblemStatus.UNATTEMPTED,
    enum: ProblemStatus,
  })
  status: ProblemStatus;
}

export class GetDetailContestResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the contest',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The name of the contest',
    example: 'Weekly Coding Challenge',
  })
  name: string;

  @ApiProperty({
    description: 'A brief description of the contest',
    example: 'Solve problems to earn points and climb the leaderboard!',
  })
  description: string;

  @ApiProperty({
    description: 'The start time of the contest',
    example: new Date().toISOString(),
  })
  startTime: Date;

  @ApiProperty({
    description: 'The end time of the contest',
    example: new Date().toISOString(),
  })
  endTime: Date;

  @ApiProperty({
    description:
      'Late deadline time of the contest in ISO 8601 format (null means no late submissions allowed)',
    example: new Date().toISOString(),
    nullable: true,
  })
  lateDeadline: Date | null;

  @ApiProperty({
    description:
      'The duration of the contest in minutes (null means unlimited)',
    example: 120,
    nullable: true,
  })
  durationMinutes: number | null;

  @ApiProperty({
    description: 'The enforcement policy for the contest deadline',
    example: DeadlineEnforcement.STRICT,
    enum: DeadlineEnforcement,
  })
  deadlineEnforcement: DeadlineEnforcement;

  @ApiProperty({
    description:
      'Submission strategy for all problems in this contest (overrides individual problem strategies)',
    enum: SubmissionStrategyEnum,
    example: SubmissionStrategyEnum.BEST_SCORE,
  })
  submissionStrategy: SubmissionStrategyEnum;

  @Exclude()
  courseId: number;

  @Exclude()
  course: Course;

  @Exclude()
  authorId: number;

  @Exclude()
  author: User;

  @ApiProperty({
    description: 'List of problems in the contest with their details',
    type: () => [ContestProblemDetail],
    name: 'problems',
  })
  @Expose({ name: 'problems' })
  contestProblems: ContestProblemDetail[];

  @ApiProperty({
    description: 'User participation status in this contest',
    type: () => ParticipationStatusDto,
  })
  participation: ParticipationStatusDto;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  @Exclude()
  tsv: string;

  constructor(partial: Partial<GetDetailContestResponseDto>) {
    Object.assign(this, partial);
  }
}
