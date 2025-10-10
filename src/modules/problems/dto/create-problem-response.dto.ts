import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { Course } from 'src/modules/course/entities/course.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { ProblemTag } from '../entities/problem-tag.entity';
import { ProblemTopic } from '../entities/problem-topic.entity';
import { TestcaseSample } from '../testcases/entities/testcase-sample.entity';
import { Testcase } from '../testcases/entities/testcase.entity';
import { BaseProblemResponseDto } from './base-problem-response.dto';

export class CreateProblemResponseDto extends BaseProblemResponseDto {
  @ApiProperty({
    description: 'The ID of the course the problem belongs to',
    example: 'course-123',
    name: 'courseId',
    type: 'string',
  })
  @Transform(({ value }: { value: Course }) => value?.id)
  @Expose({ name: 'courseId' })
  course: Course;

  @ApiProperty({
    description: 'The ID of the author who created the problem',
    example: 'user-456',
    name: 'authorId',
    type: 'string',
  })
  @Transform(({ value }: { value: User }) => value?.id)
  @Expose({ name: 'authorId' })
  author: User;

  @ApiProperty({
    description: 'List of tag IDs associated with the problem',
    example: ['tag1', 'tag2'],
    name: 'tagIds',
    type: [String],
  })
  @Transform(({ value }: { value: ProblemTag[] }) =>
    value?.map((problemTag) => problemTag?.tag?.id),
  )
  @Expose({ name: 'tagIds' })
  problemTags: ProblemTag[];

  @ApiProperty({
    description: 'List of topic IDs associated with the problem',
    example: ['topic1', 'topic2'],
    name: 'topicIds',
    type: [String],
  })
  @Transform(({ value }: { value: ProblemTopic[] }) =>
    value?.map((problemTopic) => problemTopic?.topic?.id),
  )
  @Expose({ name: 'topicIds' })
  problemTopics: ProblemTopic[];

  @ApiProperty({
    description: 'The ID of the testcase associated with the problem',
    example: 'testcase-789',
    name: 'testcaseId',
    type: String,
  })
  @Transform(({ value }: { value: Testcase }) => value?.id)
  @Expose({ name: 'testcaseId' })
  testcase: Testcase;

  @ApiProperty({
    description: 'List of testcase sample IDs associated with the problem',
    example: ['sample1', 'sample2'],
    name: 'testcaseSampleIds',
    type: [String],
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
