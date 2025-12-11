import { ApiProperty } from '@nestjs/swagger';

export class FinishParticipationResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the participation',
    example: 1,
  })
  participationId: number;

  @ApiProperty({
    description: 'The unique identifier of the contest',
    example: 1,
  })
  contestId: number;

  @ApiProperty({
    description: 'When the user started participating',
    example: '2024-01-15T10:00:00Z',
  })
  startTime: Date;

  @ApiProperty({
    description: 'When the user finished participating',
    example: '2024-01-15T11:30:00Z',
  })
  finishedAt: Date;

  @ApiProperty({
    description: 'The scheduled end time (null if no duration limit)',
    example: '2024-01-15T12:00:00Z',
    nullable: true,
  })
  endTime: Date | null;

  @ApiProperty({
    description: 'Final score of the participation',
    example: 85.5,
    nullable: true,
  })
  finalScore: number | null;

  @ApiProperty({
    description: 'Message confirming the participation was finished',
    example: 'Contest participation finished successfully',
  })
  message: string;
}
