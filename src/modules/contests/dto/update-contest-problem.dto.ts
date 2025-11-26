import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateContestProblemDto {
  @ApiProperty({
    description: 'New maximum score for this problem in the contest',
    example: 150,
  })
  @IsInt()
  @Min(1)
  score: number;
}
