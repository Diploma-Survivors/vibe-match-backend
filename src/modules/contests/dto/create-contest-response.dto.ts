import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Course } from 'src/modules/course/entities/course.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { ContestProblem } from '../entities/contest-problem.entity';
import { ContestStatus } from '../enums/contest-status.enum';

export class CreateContestResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the contest',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Name of the contest',
    example: 'Weekly Coding Challenge',
  })
  name: string;

  @ApiProperty({
    description: 'Description of the contest',
    example: 'A contest to test your coding skills',
  })
  description: string;

  @ApiProperty({
    description: 'Start time of the contest in ISO 8601 format',
    example: new Date().toISOString(),
  })
  startTime: Date;

  @ApiProperty({
    description: 'End time of the contest in ISO 8601 format',
    example: new Date().toISOString(),
  })
  endTime: Date;

  @ApiProperty({
    description: 'Duration of the contest in minutes',
    example: 120,
    nullable: true,
  })
  durationMinutes: number;

  @ApiProperty({
    description: 'Status of the contest',
    example: ContestStatus.PRIVATE,
    enum: ContestStatus,
  })
  status: ContestStatus;

  @Exclude()
  courseId: number;

  @Exclude()
  course: Course;

  @Exclude()
  authorId: number;

  @Exclude()
  author: User;

  @Exclude()
  contestProblems: ContestProblem[];

  @ApiProperty({
    description: 'Timestamp when the contest was created',
    example: new Date().toISOString(),
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the contest was last updated',
    example: new Date().toISOString(),
  })
  updatedAt: Date;

  @Exclude()
  tsv: string;

  constructor(partial: Partial<CreateContestResponseDto>) {
    Object.assign(this, partial);
  }
}
