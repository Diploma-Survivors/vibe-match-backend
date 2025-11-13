// NestJS
import { ApiProperty } from '@nestjs/swagger';

// Relative imports

export class LeaderboardProblemDto {
  @ApiProperty({
    description: 'The unique identifier of the problem',
    example: 101,
  })
  problemId: number;

  @ApiProperty({
    description: 'The alias/title of the problem in the contest',
    example: 'A',
  })
  alias: string;

  @ApiProperty({
    description: 'The maximum score for this problem in the contest',
    example: 100,
  })
  maxScore: number;
}

export class LeaderboardProblemResultDto {
  @ApiProperty({
    description: 'The unique identifier of the problem',
    example: 101,
  })
  problemId: number;

  @ApiProperty({
    description: 'The score achieved for this problem',
    example: 100,
  })
  score: number;

  @ApiProperty({
    description:
      'The time taken to first accepted submission (formatted as MM:SS)',
    example: '15:23',
  })
  time: string;

  @ApiProperty({
    description: 'Whether the submission was accepted',
    example: true,
  })
  isAccepted: boolean;

  @ApiProperty({
    description: 'Number of attempts before acceptance',
    example: 2,
  })
  attempts: number;
}

export class LeaderboardRankingDto {
  @ApiProperty({
    description: 'The rank of the participant',
    example: 1,
  })
  rank: number;

  @ApiProperty({
    description: 'Information about the user',
    type: 'object',
    properties: {
      userId: { type: 'number', example: 15 },
      username: { type: 'string', example: 'tran_nhat_long' },
      displayName: { type: 'string', example: 'Trần Nhật Long' },
    },
  })
  user: {
    userId: number;
    username: string;
    displayName: string;
  };

  @ApiProperty({
    description: 'Total score achieved in the contest',
    example: 500,
  })
  totalScore: number;

  @ApiProperty({
    description: 'Total penalty time (formatted as HH:MM or MM:SS)',
    example: '15:23',
  })
  totalTime: string;

  @ApiProperty({
    description: 'Results for each problem the user attempted',
    type: () => [LeaderboardProblemResultDto],
  })
  problemResults: LeaderboardProblemResultDto[];
}

export class LeaderboardResponseDto {
  @ApiProperty({
    description:
      'List of problems in the contest for building the table header',
    type: () => [LeaderboardProblemDto],
  })
  problems: LeaderboardProblemDto[];

  @ApiProperty({
    description: 'Leaderboard rankings with cursor pagination',
  })
  rankings: any; // Will be defined by the custom schema
}
