import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AddProblemToContestDto {
  @ApiProperty({
    description: 'Problem ID to add to the contest',
    example: 1,
  })
  @IsInt()
  @Min(1)
  problemId: number;

  @ApiProperty({
    description: 'Maximum score for this problem in the contest',
    example: 100,
  })
  @IsInt()
  @Min(1)
  score: number;
}
