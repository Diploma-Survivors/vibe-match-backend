import { ApiProperty } from '@nestjs/swagger';
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
  })
  durationMinutes: number;

  @ApiProperty({
    description: 'Current status of the contest',
    example: ContestStatus.PUBLIC,
    enum: ContestStatus,
  })
  status: ContestStatus;
}
