import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { CourseProblem } from '../entities/course-problem.entity';
import { GetTestcaseSampleDto } from '../testcases/dto/get-testcase-sample.dto';
import { BaseProblemResponseDto } from './base-problem-response.dto';

export class GetDetailProblemResponseDto extends BaseProblemResponseDto {
  @ApiProperty({
    description: 'List of testcase sample IDs associated with the problem',
    type: () => [GetTestcaseSampleDto],
  })
  testcaseSamples: GetTestcaseSampleDto[];

  @Exclude()
  courseProblems: CourseProblem[];

  constructor(partial: Partial<GetDetailProblemResponseDto>) {
    super();
    Object.assign(this, partial);
  }
}
