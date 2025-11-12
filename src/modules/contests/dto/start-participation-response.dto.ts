import { ApiProperty } from '@nestjs/swagger';

export class StartParticipationResponseDto {
  @ApiProperty({
    description: 'Participation ID',
    example: 1,
  })
  participationId: number;

  @ApiProperty({
    description: 'Contest ID',
    example: 1,
  })
  contestId: number;

  @ApiProperty({
    description: 'When the contest starts (contest-wide)',
    example: '2024-01-15T08:00:00Z',
  })
  contestStartTime: Date;

  @ApiProperty({
    description: 'When the contest ends (contest-wide)',
    example: '2024-01-15T18:00:00Z',
  })
  contestEndTime: Date;

  @ApiProperty({
    description: 'When the user started participating',
    example: '2024-01-15T10:00:00Z',
  })
  startTime: Date;

  @ApiProperty({
    description:
      'When the user must finish (null if no duration limit, otherwise startTime + durationMinutes)',
    example: '2024-01-15T12:00:00Z',
    nullable: true,
  })
  endTime: Date | null;

  @ApiProperty({
    description: 'Contest duration in minutes (null if unlimited)',
    example: 120,
    nullable: true,
  })
  durationMinutes: number | null;
}
