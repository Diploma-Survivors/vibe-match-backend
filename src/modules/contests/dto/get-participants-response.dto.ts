import { ApiProperty } from '@nestjs/swagger';

class ParticipantDto {
  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Participation start time',
    example: '2024-01-15T10:00:00Z',
  })
  startTime: Date;

  @ApiProperty({
    description: 'Participation end time (null if no duration limit)',
    example: '2024-01-15T12:00:00Z',
    nullable: true,
  })
  endTime: Date | null;

  @ApiProperty({
    description: 'Final score',
    example: 85.5,
    nullable: true,
  })
  finalScore: number | null;
}

export class GetParticipantsResponseDto {
  @ApiProperty({
    description: 'List of participants',
    type: [ParticipantDto],
  })
  participants: ParticipantDto[];

  @ApiProperty({
    description: 'Total number of participants',
    example: 25,
  })
  totalParticipants: number;
}
