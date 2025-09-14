import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Course } from 'src/modules/course/entities/course.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { DifficultyLevel } from '../enums/difficulty-level.enum';
import { Tag } from '../tags/entities/tag.entity';
import { TestcaseSample } from '../testcases/entities/testcase-sample.entity';
import { Testcase } from '../testcases/entities/testcase.entity';
import { Topic } from '../topics/entities/topic.entity';

export class CreateProblemResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the problem',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'The title of the problem',
    example: 'Sample Problem',
  })
  title: string;

  @ApiProperty({
    description: 'The description of the problem',
    example: 'This is a sample problem description.',
  })
  description: string;

  @ApiProperty({
    description: 'The input description of the problem',
    example: 'Input consists of a single integer.',
  })
  inputDescription: string;

  @ApiProperty({
    description: 'The output description of the problem',
    example: 'Output consists of a single integer.',
  })
  outputDescription: string;

  @ApiProperty({
    description: 'The maximum score for the problem',
    example: 100,
  })
  maxScore: number;

  @ApiProperty({
    description: 'The time limit for the problem in milliseconds',
    example: 1000,
  })
  timeLimitMs: number;

  @ApiProperty({
    description: 'The memory limit for the problem in kilobytes',
    example: 1024,
  })
  memoryLimitKb: number;

  @ApiProperty({
    description: 'The difficulty level of the problem',
    example: DifficultyLevel.EASY,
  })
  difficulty: DifficultyLevel;

  @ApiProperty({
    description: 'The ID of the course the problem belongs to',
    example: 'course-123',
  })
  @Transform(({ obj }: { obj: { course: Course } }) => obj.course?.id)
  courseId: string;

  @ApiProperty({
    description: 'The ID of the author who created the problem',
    example: 'user-456',
  })
  @Transform(({ obj }: { obj: { author: User } }) => obj.author?.id)
  authorId: string;

  @ApiProperty({
    description: 'List of tag IDs associated with the problem',
    example: ['tag1', 'tag2'],
  })
  @Transform(({ obj }: { obj: { tags: Tag[] } }) =>
    obj.tags.map((tag) => tag?.id),
  )
  tags: string[];

  @ApiProperty({
    description: 'List of topic IDs associated with the problem',
    example: ['topic1', 'topic2'],
  })
  @Transform(({ obj }: { obj: { topics: Topic[] } }) =>
    obj.topics.map((topic) => topic?.id),
  )
  topics: string[];

  @ApiProperty({
    description: 'The ID of the testcase associated with the problem',
    example: 'testcase-789',
  })
  @Transform(({ obj }: { obj: { testcase: Testcase } }) => obj.testcase?.id)
  testcase: string;

  @ApiProperty({
    description: 'List of testcase sample IDs associated with the problem',
    example: ['sample1', 'sample2'],
  })
  @Transform(({ obj }: { obj: { testcaseSamples: TestcaseSample[] } }) =>
    obj.testcaseSamples.map((sample) => sample?.id),
  )
  testcaseSamples: string[];

  @ApiProperty({
    description: 'The creation timestamp of the problem',
    example: '2025-10-01T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The last updated timestamp of the problem',
    example: '2025-10-01T12:00:00Z',
  })
  updatedAt: Date;
}
