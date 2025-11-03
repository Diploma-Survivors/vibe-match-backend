// NestJS
import { ApiProperty } from '@nestjs/swagger';

// Relative imports
import { ContestStatus } from '../enums/contest-status.enum';

export class GetContestsResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the contest',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Name of the contest',
    example: 'Coding Challenge',
  })
  name: string;

  @ApiProperty({
    description: 'Start time of the contest',
    example: new Date().toISOString(),
  })
  startTime: Date;

  @ApiProperty({
    description: 'End time of the contest',
    example: new Date().toISOString(),
  })
  endTime: Date;

  @ApiProperty({
    description: 'Duration of the contest in minutes',
    example: 120,
    nullable: true,
  })
  durationMinutes: number | null;

  @ApiProperty({
    description: 'The current status of the contest',
    example: ContestStatus.ONGOING,
    enum: ContestStatus,
  })
  status: ContestStatus;
}
