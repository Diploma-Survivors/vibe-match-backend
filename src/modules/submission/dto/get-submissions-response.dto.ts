import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { LanguageDto } from '../../language/dto/language.dto';
import { UserInformationDto } from '../../user/dto/user-information.dto';
import { SubmissionStatus } from '../enums/submission-status.enum';

export class SubmissionInListDto {
  @ApiProperty({
    description: 'The unique identifier of the submission',
    example: 'asfdfa-dafd',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'The status of the submission',
    example: SubmissionStatus.ACCEPTED,
  })
  @Expose()
  status: SubmissionStatus.ACCEPTED;

  @ApiProperty({
    description: 'Language used for the submission',
    example: 'JavaScript',
    type: LanguageDto,
  })
  @Expose()
  @Type(() => LanguageDto)
  language: LanguageDto;

  @ApiProperty({
    description: 'Runtime of the submission in milliseconds',
    example: 123.45,
    nullable: true,
  })
  @Expose()
  runtime: number | null;

  @ApiProperty({
    description: 'Memory used by the submission in megabytes',
    example: 12.34,
    nullable: true,
  })
  @Expose()
  memory: number | null;

  @ApiProperty({
    description: 'Score achieved by the submission',
    example: 100,
    nullable: true,
  })
  @Expose()
  score: number | null;

  @ApiProperty({
    description: 'Note about the submission',
    example: 'Too hard solve later',
  })
  @Expose()
  note: string | null;

  @ApiProperty({
    description: 'User info who made the submission',
    example: { id: 1, username: 'john_doe' },
  })
  @Expose()
  @Type(() => UserInformationDto)
  user: UserInformationDto;
}

export class ContestSubmissionDto {
  @ApiProperty({
    description: 'The unique identifier of the submission',
    example: 'asfdfa-dafd',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'The status of the submission',
    example: SubmissionStatus.ACCEPTED,
  })
  @Expose()
  status: SubmissionStatus;

  @ApiProperty({
    description: 'Language name used for the submission',
    example: 'JavaScript',
  })
  @Expose()
  language: string;

  @ApiProperty({
    description: 'Runtime of the submission in milliseconds',
    example: 123.45,
    nullable: true,
  })
  @Expose()
  runtime: number | null;

  @ApiProperty({
    description: 'Memory used by the submission in megabytes',
    example: 12.34,
    nullable: true,
  })
  @Expose()
  memory: number | null;

  @ApiProperty({
    description: 'Score achieved by the submission',
    example: 100,
    nullable: true,
  })
  @Expose()
  score: number | null;

  @ApiProperty({
    description: 'Note about the submission',
    example: 'Too hard solve later',
    nullable: true,
  })
  @Expose()
  note: string | null;

  @ApiProperty({
    description: 'User info who made the submission',
    example: { id: 1, username: 'john_doe' },
  })
  @Expose()
  @Type(() => UserInformationDto)
  user: UserInformationDto;
}
