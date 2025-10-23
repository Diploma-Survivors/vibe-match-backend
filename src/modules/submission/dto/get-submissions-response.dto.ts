import { ApiProperty } from '@nestjs/swagger';
import { SubmissionStatus } from '../enums/submission-status.enum';

export class SubmissionInListDto {
  @ApiProperty({
    description: 'The unique identifier of the submission',
    example: 'asfdfa-dafd',
  })
  id: string;

  @ApiProperty({
    description: 'The status of the submission',
    example: SubmissionStatus.ACCEPTED,
  })
  status: SubmissionStatus.ACCEPTED;

  @ApiProperty({
    description: 'Language used for the submission',
    example: 'JavaScript',
  })
  language: string;

  @ApiProperty({
    description: 'Runtime of the submission in milliseconds',
    example: 123.45,
    nullable: true,
  })
  runtime: number | null;

  @ApiProperty({
    description: 'Memory used by the submission in megabytes',
    example: 12.34,
    nullable: true,
  })
  memory: number | null;

  @ApiProperty({
    description: 'Score achieved by the submission',
    example: 100,
    nullable: true,
  })
  score: number | null;

  @ApiProperty({
    description: 'Note about the submission',
    example: 'Too hard solve later',
  })
  note: string | null;
}
