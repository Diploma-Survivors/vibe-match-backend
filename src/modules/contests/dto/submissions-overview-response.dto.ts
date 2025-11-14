// NestJS
import { ApiProperty } from '@nestjs/swagger';
import { UserInformationDto } from '../../user/dto/user-information.dto';

export class ParticipantResultDto {
  @ApiProperty({
    description: 'The unique identifier of the contest participation',
    example: 501,
  })
  participationId: number;

  @ApiProperty({
    description: 'Information about the user',
    type: UserInformationDto,
  })
  user: UserInformationDto;

  @ApiProperty({
    description: 'Total score achieved in the contest',
    example: 250,
  })
  totalScore: number;
}
