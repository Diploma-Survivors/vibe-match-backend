// NestJS
import { BadRequestException, Logger } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

// Third-party
import { Expose, plainToInstance, Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

// Relative imports
import { SubmissionStrategyEnum } from '../../submission/enums/submission-strategy.enum';
import { JsonArrayTransform } from '../decorators/json-transform.decorator';
import { DifficultyLevel } from '../enums/difficulty-level.enum';
import { ProblemType } from '../enums/problem-type.enum';
import { ProblemVisibility } from '../enums/problem-visibility.enum';
import { TESTCASE_FILE_FIELD_NAME } from '../testcases/constants/testcases.constant';
import { CreateTestcaseSampleDto } from '../testcases/dto/create-testcase-sample.dto';

export class CreateProblemDto {
  @ApiProperty({
    description: 'The title of the problem',
    example: 'Sample Problem Title',
    minLength: 3,
    maxLength: 128,
  })
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(128, { message: 'Title must be at most 128 characters long' })
  title: string;

  @ApiProperty({
    description: 'The description of the problem',
    example: 'This is a sample problem description.',
    minLength: 16,
    maxLength: 512,
  })
  @MinLength(16, { message: 'Description must be at least 16 characters long' })
  @MaxLength(512, {
    message: 'Description must be at most 512 characters long',
  })
  description: string;

  @ApiProperty({
    description: 'The input description of the problem',
    example: 'The first line contains an integer n.',
    minLength: 3,
    maxLength: 512,
  })
  @MinLength(3, {
    message: 'Input description must be at least 3 characters long',
  })
  @MaxLength(512, {
    message: 'Input description must be at most 512 characters long',
  })
  inputDescription: string;

  @ApiProperty({
    description: 'The output description of the problem',
    example: 'Output a single integer, the result.',
    minLength: 1,
    maxLength: 512,
  })
  @MinLength(1, {
    message: 'Output description must be at least 1 characters long',
  })
  @MaxLength(512, {
    message: 'Output description must be at most 512 characters long',
  })
  outputDescription: string;

  @ApiProperty({
    description: 'The maximum score for the problem',
    example: 100,
    minimum: 1,
  })
  @Type(() => Number)
  @IsPositive({ message: 'Max score must be a positive number' })
  maxScore: number;

  @ApiProperty({
    description: 'The time limit for the problem in milliseconds',
    example: 1000,
    minimum: 1,
  })
  @Type(() => Number)
  @IsPositive({ message: 'Time limit must be a positive number' })
  timeLimitMs: number;

  @ApiProperty({
    description: 'The memory limit for the problem in kilobytes',
    example: 65536,
    minimum: 1,
  })
  @Type(() => Number)
  @IsPositive({ message: 'Memory limit must be a positive number' })
  memoryLimitKb: number;

  @ApiProperty({
    description: 'The difficulty level of the problem',
    example: DifficultyLevel.EASY,
    enum: DifficultyLevel,
  })
  @IsEnum(DifficultyLevel, {
    message: 'Difficulty level must be a valid enum value',
  })
  difficulty: DifficultyLevel;

  @ApiProperty({
    description: 'The type of the problem',
    example: ProblemType.STANDALONE,
    enum: ProblemType,
  })
  @IsEnum(ProblemType)
  type: ProblemType;

  @ApiProperty({
    description: 'The visibility of the problem',
    example: ProblemVisibility.PUBLIC,
    enum: ProblemVisibility,
  })
  @IsEnum(ProblemVisibility)
  visibility: ProblemVisibility;

  @ApiProperty({
    description: 'The IDs of the tags associated with the problem',
    example: [1, 2, 3],
    type: 'array',
    items: { type: 'int' },
    name: 'tagIds',
    maxItems: 4,
  })
  @JsonArrayTransform('tagIds')
  @IsArray()
  @ArrayMaxSize(4, {
    message: 'A maximum of 4 tags can be associated with a problem',
  })
  @IsInt({ each: true })
  @Expose({ name: 'tagIds' })
  tags: number[];

  @ApiProperty({
    description: 'The IDs of the topics associated with the problem',
    example: [1, 2, 3],
    type: 'array',
    items: { type: 'int' },
    name: 'topicIds',
    maximum: 3,
  })
  @JsonArrayTransform('topicIds')
  @IsArray()
  @ArrayMaxSize(3, {
    message: 'A maximum of 3 topics can be associated with a problem',
  })
  @IsInt({ each: true })
  @Expose({ name: 'topicIds' })
  topics: number[];

  @ApiProperty({
    description: 'The test case file associated with the problem',
    example: 'testcase.txt',
    type: 'string',
    format: 'binary',
    name: TESTCASE_FILE_FIELD_NAME,
  })
  testcase: string;

  @ApiProperty({
    description: 'Submission strategy for this problem',
    example: SubmissionStrategyEnum.BEST_SCORE,
    enum: SubmissionStrategyEnum,
    required: false,
    default: SubmissionStrategyEnum.BEST_SCORE,
  })
  @IsOptional()
  @IsEnum(SubmissionStrategyEnum, {
    message: 'Submission strategy must be a valid enum value',
  })
  submissionStrategy?: SubmissionStrategyEnum;

  @ApiProperty({
    description:
      'Maximum number of submission attempts allowed (null = unlimited)',
    example: 5,
    minimum: 1,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Max attempts must be an integer' })
  @Min(1, { message: 'Max attempts must be at least 1' })
  maxAttempts?: number | null;

  @ApiProperty({
    description: 'Whether to show submission count to students',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'Show submission count must be a boolean' })
  showSubmissionCount?: boolean;

  @ApiProperty({
    description: 'The sample test cases associated with the problem',
    type: () => [CreateTestcaseSampleDto],
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsedValue = JSON.parse(value) as unknown;
        return plainToInstance(CreateTestcaseSampleDto, parsedValue);
      } catch (err) {
        Logger.error(err);
        throw new BadRequestException(
          'Invalid JSON format for testcaseSamples',
        );
      }
    }

    throw new BadRequestException(
      'testcaseSamples must be a JSON array string',
    );
  })
  @IsArray()
  @ValidateNested({ each: true })
  testcaseSamples: CreateTestcaseSampleDto[];
}
