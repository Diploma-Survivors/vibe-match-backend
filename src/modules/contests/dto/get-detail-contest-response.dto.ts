import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { Course } from 'src/modules/course/entities/course.entity';
import { DifficultyLevel } from 'src/modules/problems/enums/difficulty-level.enum';
import { User } from 'src/modules/user/entities/user.entity';
import { ContestStatus } from '../enums/contest-status.enum';

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
    description: 'The score assigned to the problem in the contest',
    example: 100,
  })
  score: number;

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
    description: 'The duration of the contest in minutes',
    example: 120,
  })
  durationMinutes: number;

  @Exclude()
  status: ContestStatus;

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
