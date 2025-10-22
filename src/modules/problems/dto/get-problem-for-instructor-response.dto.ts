import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { User } from 'src/modules/user/entities/user.entity';
import { TestcaseSample } from '../testcases/entities/testcase-sample.entity';
import { Testcase } from './../testcases/entities/testcase.entity';
import { BaseProblemResponseDto } from './base-problem-response.dto';
import { Tag } from '../tags/entities/tag.entity';
import { Topic } from '../topics/entities/topic.entity';

class AuthorInfoDto {
  @ApiProperty({
    description: 'The unique identifier of the author',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The first name of the author',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'The last name of the author',
    example: 'Doe',
  })
  lastName: string;
}

class TestcaseSampleDto {
  @ApiProperty({
    description: 'The unique identifier of the testcase sample',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The input of the testcase sample',
    example: '1 2 3',
  })
  input: string;

  @ApiProperty({
    description: 'The output of the testcase sample',
    example: '6',
  })
  output: string;
}

class TestcaseInfoDto {
  @ApiProperty({
    description: 'The unique identifier of the testcase',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The URL to access the testcase file',
    example: 'https://example.com/testcase/1/file',
  })
  fileUrl: string;
}

class TagDto {
  @ApiProperty({
    description: 'The unique identifier of the tag',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The name of the tag',
    example: 'Dynamic Programming',
  })
  name: string;
}

class TopicDto {
  @ApiProperty({
    description: 'The unique identifier of the topic',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The name of the topic',
    example: 'Graphs',
  })
  name: string;
}

class ProblemStatistics {
  @ApiProperty({
    description: 'Total number of submissions for the problem',
    example: 150,
  })
  totalSubmissions: number;

  @ApiProperty({
    description: 'Total number of accepted submissions for the problem',
    example: 75,
  })
  totalAcceptedSubmissions: number;

  @ApiProperty({
    description: 'Acceptance rate of the problem in percentage',
    example: 50,
  })
  acceptanceRate: number;

  @ApiProperty({
    description: 'Total number of users who attempted the problem',
    example: 100,
  })
  attemptedUsers: number;

  @ApiProperty({
    description: 'Total number of users who solved the problem',
    example: 80,
  })
  solvedUsers: number;

  @ApiProperty({
    description: 'Average number of attempts per user for the problem',
    example: 1.875,
  })
  averageAttempts: number;
}

export class GetProblemForInstructorResponseDto extends BaseProblemResponseDto {
  @Exclude()
  authorId: number;

  @ApiProperty({
    type: () => AuthorInfoDto,
    description: 'Information about the author of the problem',
  })
  author: User;

  @ApiProperty({
    type: () => TestcaseInfoDto,
    description: 'Information about the testcase of the problem',
  })
  testcase: Testcase;

  @ApiProperty({
    type: () => [TestcaseSampleDto],
    description: 'List of testcase samples for the problem',
  })
  testcaseSamples: TestcaseSample[];

  @ApiProperty({
    type: () => [TagDto],
    description: 'List of tags associated with the problem',
  })
  tags: Tag[];

  @ApiProperty({
    type: () => [TopicDto],
    description: 'List of topics associated with the problem',
  })
  topics: Topic[];

  @ApiProperty({
    type: () => ProblemStatistics,
    description: 'Statistical data related to the problem',
  })
  quickStats: ProblemStatistics;

  constructor(partial: Partial<GetProblemForInstructorResponseDto>) {
    super();
    Object.assign(this, partial);
  }
}
