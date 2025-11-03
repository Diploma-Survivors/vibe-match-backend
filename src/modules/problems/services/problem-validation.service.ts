// NestJS
import { BadRequestException, Injectable, Logger } from '@nestjs/common';

// Third-party
import { In } from 'typeorm';

// Relative imports
import { CreateProblemDto } from '../dto/create-problem.dto';
import { UpdateProblemDto } from '../dto/update-problem.dto';
import { Tag } from '../tags/entities/tag.entity';
import { TagsService } from '../tags/tags.service';
import { Topic } from '../topics/entities/topic.entity';
import { TopicsService } from '../topics/topics.service';

/**
 * Specification interface for validation rules
 */
interface ValidationSpecification<T> {
  isSatisfiedBy(value: T): boolean;
  getErrorMessage(): string;
}

/**
 * Tags existence specification
 */
class TagsExistSpecification implements ValidationSpecification<number[]> {
  constructor(
    private readonly validTagIds: Set<number>,
    private readonly requestedIds: number[],
  ) {}

  isSatisfiedBy(tagIds: number[]): boolean {
    return tagIds.every((id) => this.validTagIds.has(id));
  }

  getErrorMessage(): string {
    const invalidIds = this.requestedIds.filter(
      (id) => !this.validTagIds.has(id),
    );
    return `Invalid tag IDs: ${invalidIds.join(', ')}`;
  }
}

/**
 * Topics existence specification
 */
class TopicsExistSpecification implements ValidationSpecification<number[]> {
  constructor(
    private readonly validTopicIds: Set<number>,
    private readonly requestedIds: number[],
  ) {}

  isSatisfiedBy(topicIds: number[]): boolean {
    return topicIds.every((id) => this.validTopicIds.has(id));
  }

  getErrorMessage(): string {
    const invalidIds = this.requestedIds.filter(
      (id) => !this.validTopicIds.has(id),
    );
    return `Invalid topic IDs: ${invalidIds.join(', ')}`;
  }
}

/**
 * Result of validation containing validated entities
 */
export interface ValidationResult {
  tags: Tag[];
  topics: Topic[];
}

/**
 * Service responsible for validating problem data
 *
 * @example
 * const result = await validator.validateProblemData(dto);
 */
@Injectable()
export class ProblemValidationService {
  private readonly logger = new Logger(ProblemValidationService.name);

  constructor(
    private readonly tagsService: TagsService,
    private readonly topicsService: TopicsService,
  ) {}

  async validateProblemData(dto: CreateProblemDto): Promise<ValidationResult> {
    const [tags, topics] = await Promise.all([
      this.validateTags(dto.tags),
      this.validateTopics(dto.topics),
    ]);

    return { tags, topics };
  }

  async validateUpdateData(
    dto: UpdateProblemDto,
  ): Promise<Partial<ValidationResult>> {
    const result: Partial<ValidationResult> = {};

    // Only validate if tags are being updated
    if (dto.tags && dto.tags.length > 0) {
      result.tags = await this.validateTags(dto.tags);
    }

    // Only validate if topics are being updated
    if (dto.topics && dto.topics.length > 0) {
      result.topics = await this.validateTopics(dto.topics);
    }

    return result;
  }

  private async validateTags(tagIds: number[]): Promise<Tag[]> {
    if (!tagIds || tagIds.length === 0) {
      return [];
    }

    const tags = await this.tagsService.find({
      where: { id: In(tagIds) },
      select: ['id', 'name'],
    });

    const validTagIds = new Set(tags.map((t) => t.id));
    const specification = new TagsExistSpecification(validTagIds, tagIds);

    if (!specification.isSatisfiedBy(tagIds)) {
      throw new BadRequestException(specification.getErrorMessage());
    }

    return tags;
  }

  private async validateTopics(topicIds: number[]): Promise<Topic[]> {
    if (!topicIds || topicIds.length === 0) {
      return [];
    }

    const topics = await this.topicsService.find({
      where: { id: In(topicIds) },
      select: ['id', 'name'],
    });

    const validTopicIds = new Set(topics.map((t) => t.id));
    const specification = new TopicsExistSpecification(validTopicIds, topicIds);

    if (!specification.isSatisfiedBy(topicIds)) {
      throw new BadRequestException(specification.getErrorMessage());
    }

    return topics;
  }

  validateFileRequired(
    file: Express.Multer.File | undefined,
    fieldName: string = 'file',
  ): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException(`${fieldName} is required`);
    }
  }

  validateTestcaseFile(file: Express.Multer.File): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedMimeTypes = [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-tar',
      'application/gzip',
    ];

    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
      );
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }
  }
}
