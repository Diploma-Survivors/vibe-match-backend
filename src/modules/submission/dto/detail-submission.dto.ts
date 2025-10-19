import { ApiProperty } from '@nestjs/swagger';
import { LanguageDto } from '../../language/dto/language.dto';
import { SubmissionStatus } from '../enums/submission-status.enum';
import { UserInformationDto } from '../../user/dto/user-information.dto';
import { Expose, Type } from 'class-transformer';

export class SubmissionDetailDto {
  @ApiProperty({
    description: 'The unique identifier of the submission.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'The judging status of the submission.',
    enum: SubmissionStatus,
    example: SubmissionStatus.ACCEPTED,
  })
  @Expose()
  status: SubmissionStatus;

  @ApiProperty({
    description: 'The final score of the submission (0 to 100).',
    example: 100,
    nullable: true,
  })
  @Expose()
  score: number;

  @ApiProperty({
    description: 'The execution time in milliseconds.',
    example: 45.5,
    nullable: true,
  })
  @Expose()
  runtime: number;

  @ApiProperty({
    description: 'The memory usage in megabytes.',
    example: 10.2,
    nullable: true,
  })
  @Expose()
  memory: number;

  @ApiProperty({
    description: 'The source code submitted by the user.',
    example:
      '#include <iostream>\nint main() { std::cout << "Hello World!"; return 0; }',
  })
  @Expose()
  sourceCode: string;

  @ApiProperty({
    description: 'The timestamp when the submission was created.',
    example: '2025-10-12T10:00:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'The total number of test cases for the problem.',
    example: 10,
  })
  @Expose()
  totalTests: number;

  @ApiProperty({
    description: 'The number of test cases that passed.',
    example: 10,
  })
  @Expose()
  passedTests: number;

  @ApiProperty({
    description: 'Information about the programming language used.',
    type: () => LanguageDto,
  })
  @Expose()
  language: LanguageDto;

  @ApiProperty({
    description: 'The ID of the contest participation, if any.',
    example: 'cp_55aa66bb',
    nullable: true,
  })
  @Expose()
  contestParticipationId?: number;

  @ApiProperty({
    description: 'Result description or feedback from the judging system.',
    example: 'All test cases passed successfully.',
    nullable: true,
  })
  @Expose()
  resultDescription?: string;

  @ApiProperty({
    description: 'Information about the user who made the submission.',
    type: () => UserInformationDto,
  })
  @Expose()
  @Type(() => UserInformationDto)
  user: UserInformationDto;
}
