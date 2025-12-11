import { ApiProperty } from '@nestjs/swagger';
import { SubmissionStrategyEnum } from 'src/modules/submission/enums/submission-strategy.enum';
import { DeadlineEnforcement } from '../enums/deadline-enforcement.enum';

class AuthorDto {
  @ApiProperty({
    description: 'Author user ID',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: 'Author first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'Author last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'Author email',
    example: 'john.doe@example.com',
  })
  email: string;
}

export class GetContestOverviewResponseDto {
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
    example: '2024-01-15T08:00:00Z',
  })
  startTime: Date;

  @ApiProperty({
    description: 'The end time of the contest',
    example: '2024-01-15T18:00:00Z',
  })
  endTime: Date;

  @ApiProperty({
    description:
      'Late deadline time of the contest (null means no late submissions allowed)',
    example: '2024-01-16T00:00:00Z',
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
    enum: DeadlineEnforcement,
    example: DeadlineEnforcement.STRICT,
  })
  deadlineEnforcement: DeadlineEnforcement;

  @ApiProperty({
    description:
      'Submission strategy for all problems in this contest (overrides individual problem strategies)',
    enum: SubmissionStrategyEnum,
    example: SubmissionStrategyEnum.BEST_SCORE,
  })
  submissionStrategy: SubmissionStrategyEnum;

  @ApiProperty({
    description: 'Contest author information',
    type: () => AuthorDto,
  })
  author: AuthorDto;

  @ApiProperty({
    description: 'Total number of problems in the contest',
    example: 5,
  })
  totalProblems: number;

  @ApiProperty({
    description: 'Number of participants who have started the contest',
    example: 42,
  })
  participantCount: number;

  @ApiProperty({
    description: 'Whether the current user has participated in this contest',
    example: false,
  })
  hasParticipated: boolean;

  @ApiProperty({
    description: 'Contest creation time',
    example: '2024-01-01T10:00:00Z',
  })
  createdAt: Date;
}
