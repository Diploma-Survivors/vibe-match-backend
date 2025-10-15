import { ApiProperty } from '@nestjs/swagger';

export class UpdateSubmissionDto {
  @ApiProperty({
    description: 'Note for the submission',
    example: 'This is an updated note for my submission.',
    required: false,
  })
  note: string;
}
