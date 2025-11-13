// NestJS
import { ApiProperty } from '@nestjs/swagger';

export class ProblemSubmissionDto {
  @ApiProperty({
    description: 'The unique identifier of the problem',
    example: 101,
  })
  problemId: number;

  @ApiProperty({
    description: 'The ID of the best submission for this problem',
    example: 12345,
  })
  bestSubmissionId: number;

  @ApiProperty({
    description: 'The score achieved for this problem',
    example: 100,
  })
  score: number;

  @ApiProperty({
    description: 'The status of the best submission',
    example: 'Accepted',
  })
  status: string;
}

export class ParticipantResultDto {
  @ApiProperty({
    description: 'The unique identifier of the contest participation',
    example: 501,
  })
  participationId: number;

  @ApiProperty({
    description: 'Information about the user',
    type: 'object',
    properties: {
      userId: { type: 'number', example: 1 },
      displayName: { type: 'string', example: 'Nguyễn Văn A' },
    },
  })
  user: {
    userId: number;
    displayName: string;
  };

  @ApiProperty({
    description: 'Total score achieved in the contest',
    example: 250,
  })
  totalScore: number;

  @ApiProperty({
    description: 'Results for each problem the participant attempted',
    type: () => [ProblemSubmissionDto],
  })
  problemSubmissions: ProblemSubmissionDto[];
}

export class SubmissionsOverviewResponseDto {
  @ApiProperty({
    description: 'List of problems in the contest',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        problemId: { type: 'number', example: 101 },
        title: { type: 'string', example: 'A. Vòng lặp' },
      },
    },
  })
  problems: Array<{
    problemId: number;
    title: string;
  }>;

  @ApiProperty({
    description: 'Participant results with cursor pagination',
  })
  participantResults: any; // Will be defined by the custom schema
}
