// NestJS
import { Injectable, Logger } from '@nestjs/common';

// Relative imports
import { JwtPayload } from '../../auth/interfaces/jwt.interface';
import { CreateProblemDto } from '../dto/create-problem.dto';
import { UpdateProblemDto } from '../dto/update-problem.dto';
import { CourseProblem } from '../entities/course-problem.entity';
import { ProblemTag } from '../entities/problem-tag.entity';
import { ProblemTopic } from '../entities/problem-topic.entity';
import { Problem } from '../entities/problem.entity';
import { Tag } from '../tags/entities/tag.entity';
import { CreateTestcaseSampleDto } from '../testcases/dto/create-testcase-sample.dto';
import { TestcaseSample } from '../testcases/entities/testcase-sample.entity';
import { Topic } from '../topics/entities/topic.entity';

/**
 * Builder for creating Problem entities
 */
class ProblemBuilder {
  private readonly problem: Partial<Problem> = {};

  withBasicInfo(dto: CreateProblemDto): this {
    this.problem.title = dto.title;
    this.problem.description = dto.description;
    this.problem.inputDescription = dto.inputDescription;
    this.problem.outputDescription = dto.outputDescription;
    this.problem.difficulty = dto.difficulty;
    this.problem.type = dto.type;
    this.problem.timeLimitMs = dto.timeLimitMs;
    this.problem.memoryLimitKb = dto.memoryLimitKb;
    this.problem.maxScore = dto.maxScore;
    this.problem.visibility = dto.visibility;
    this.problem.submissionStrategy = dto.submissionStrategy;
    this.problem.maxAttempts = dto.maxAttempts;
    this.problem.showSubmissionCount = dto.showSubmissionCount;
    return this;
  }

  withAuthor(userId: number): this {
    this.problem.authorId = userId;
    return this;
  }

  withCourse(courseId: number): this {
    this.problem.courseProblems = [
      {
        course: { id: courseId },
      } as CourseProblem,
    ];
    return this;
  }

  withTags(tags: Tag[]): this {
    this.problem.problemTags = tags.map((tag) => ({
      tag,
    })) as ProblemTag[];
    return this;
  }

  withTopics(topics: Topic[]): this {
    this.problem.problemTopics = topics.map((topic) => ({
      topic,
    })) as ProblemTopic[];
    return this;
  }

  withExamples(testcaseSamples: CreateTestcaseSampleDto[]): this {
    this.problem.testcaseSamples = testcaseSamples.map((dto) => ({
      input: dto.input,
      output: dto.output,
    })) as TestcaseSample[];
    return this;
  }

  build(): Partial<Problem> {
    this.problem.testcase = undefined;
    return this.problem;
  }
}

/**
 * Factory for creating Problem entities
 *
 * @example
 * const problemData = factory.createProblem(dto, user, tags, topics);
 */
@Injectable()
export class ProblemFactory {
  private readonly logger = new Logger(ProblemFactory.name);

  createProblem(
    dto: CreateProblemDto,
    user: JwtPayload,
    tags: Tag[],
    topics: Topic[],
  ): Partial<Problem> {
    this.logger.log(`Creating problem: ${dto.title} by user ${user.userId}`);

    const builder = new ProblemBuilder();

    const problem = builder
      .withBasicInfo(dto)
      .withAuthor(user.userId)
      .withCourse(user.courseId!)
      .withTags(tags)
      .withTopics(topics)
      .withExamples(dto.testcaseSamples)
      .build();

    return problem;
  }

  createUpdateData(
    dto: UpdateProblemDto,
    tags?: Tag[],
    topics?: Topic[],
  ): Partial<Problem> {
    const updateData: Partial<Problem> = {};

    // Only include fields that are provided
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.difficulty !== undefined) updateData.difficulty = dto.difficulty;
    if (dto.timeLimitMs !== undefined) updateData.timeLimitMs = dto.timeLimitMs;
    if (dto.memoryLimitKb !== undefined)
      updateData.memoryLimitKb = dto.memoryLimitKb;
    if (dto.inputDescription !== undefined)
      updateData.inputDescription = dto.inputDescription;
    if (dto.outputDescription !== undefined)
      updateData.outputDescription = dto.outputDescription;
    if (dto.testcaseSamples !== undefined) {
      updateData.testcaseSamples = dto.testcaseSamples.map((sample) => ({
        input: sample.input,
        output: sample.output,
      })) as TestcaseSample[];
    }

    if (tags) {
      updateData.problemTags = tags.map((tag) => ({ tag })) as ProblemTag[];
    }

    if (topics) {
      updateData.problemTopics = topics.map((topic) => ({
        topic,
      })) as ProblemTopic[];
    }

    return updateData;
  }
}
