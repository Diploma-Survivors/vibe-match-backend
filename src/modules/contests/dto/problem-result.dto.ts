import { ApiProperty } from '@nestjs/swagger';
import { ProblemStatus } from '../enums/problem-status.enum';

export class ProblemResultDto {
  @ApiProperty({
    description: 'The ID of the problem',
    example: 1,
  })
  problemId: number;

  @ApiProperty({
    description: 'Score achieved for this problem (null if unattempted)',
    example: 100,
    nullable: true,
  })
  score: number | null;

  @ApiProperty({
    description:
      'Time taken to solve this problem (formatted as MM:SS or HH:MM:SS, null if unattempted)',
    example: '15:23',
    nullable: true,
  })
  time: string | null;

  @ApiProperty({
    description: 'Status of the problem solution',
    example: ProblemStatus.SOLVED,
    enum: ProblemStatus,
  })
  status: ProblemStatus;
}
