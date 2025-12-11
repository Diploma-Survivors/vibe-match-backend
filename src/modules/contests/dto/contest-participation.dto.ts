import { ApiProperty } from '@nestjs/swagger';
import { UserInformationDto } from '../../user/dto/user-information.dto';
import { ProblemResultDto } from './problem-result.dto';

export class ContestParticipationDto {
  @ApiProperty({
    description: 'The id of the contest participation',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'User information',
    type: UserInformationDto,
  })
  user: UserInformationDto;

  @ApiProperty({
    description: 'Start time of the contest participation',
    example: '2023-01-01T00:00:00.000Z',
  })
  startTime: Date;

  @ApiProperty({
    description: 'End time of the contest participation',
    example: '2023-01-01T01:00:00.000Z',
    nullable: true,
  })
  endTime: Date | null;

  @ApiProperty({
    description: 'Final score achieved in the contest',
    example: 250,
    nullable: true,
  })
  finalScore: number | null;

  @ApiProperty({
    description: 'Time when the participant finished the contest',
    example: '2023-01-01T01:00:00.000Z',
    nullable: true,
  })
  finishedAt: Date | null;

  @ApiProperty({
    description: 'Results for each problem',
    type: () => [ProblemResultDto],
  })
  problemResults: ProblemResultDto[];
}
