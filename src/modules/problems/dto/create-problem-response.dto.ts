import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { Course } from 'src/modules/course/entities/course.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { CourseProblem } from '../entities/course-problem.entity';
import { ProblemTag } from '../entities/problem-tag.entity';
import { ProblemTopic } from '../entities/problem-topic.entity';
import { TestcaseSample } from '../testcases/entities/testcase-sample.entity';
import { Testcase } from '../testcases/entities/testcase.entity';
import { BaseProblemResponseDto } from './base-problem-response.dto';

export class CreateProblemResponseDto extends BaseProblemResponseDto {
  @Exclude()
  courseProblems: CourseProblem[];

  @Exclude()
  course: Course;

  @Exclude()
  authorId: number;

  @Exclude()
  author: User;

  @ApiProperty({
    description: 'List of tag IDs associated with the problem',
    example: [1, 2],
    name: 'tagIds',
    type: [Number],
  })
  @Transform(({ value }: { value: ProblemTag[] }) =>
    value?.map((problemTag) => problemTag?.tagId),
  )
  @Expose({ name: 'tagIds' })
  problemTags: ProblemTag[];

  @ApiProperty({
    description: 'List of topic IDs associated with the problem',
    example: [1, 2, 3],
    name: 'topicIds',
    type: [Number],
  })
  @Transform(({ value }: { value: ProblemTopic[] }) =>
    value?.map((problemTopic) => problemTopic?.topicId),
  )
  @Expose({ name: 'topicIds' })
  problemTopics: ProblemTopic[];

  @Exclude()
  testcase: Testcase;

  @ApiProperty({
    description: 'List of testcase sample IDs associated with the problem',
    example: [1, 2, 3],
    name: 'testcaseSampleIds',
    type: [Number],
  })
  @Transform(({ value }: { value: TestcaseSample[] }) =>
    value?.map((sample) => sample?.id),
  )
  @Expose({ name: 'testcaseSampleIds' })
  testcaseSamples: TestcaseSample[];

  @Exclude()
  tsv: string;

  constructor(partial: Partial<CreateProblemResponseDto>) {
    super();
    Object.assign(this, partial);
  }
}
