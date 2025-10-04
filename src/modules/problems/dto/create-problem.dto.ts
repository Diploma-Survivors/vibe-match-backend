import { BadRequestException, Logger } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance, Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsPositive,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TESTCASE_FILE_FIELD_NAME } from '../constants/testcase.constant';
import { DifficultyLevel } from '../enums/difficulty-level.enum';
import { ProblemType } from '../enums/problem-type.enum';
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
  @Transform(({ value }: { value: string }) => Number.parseInt(value, 10))
  @IsPositive({ message: 'Max score must be a positive number' })
  maxScore: number;

  @ApiProperty({
    description: 'The time limit for the problem in milliseconds',
    example: 1000,
    minimum: 1,
  })
  @Transform(({ value }: { value: string }) => Number.parseFloat(value))
  @IsPositive({ message: 'Time limit must be a positive number' })
  timeLimitMs: number;

  @ApiProperty({
    description: 'The memory limit for the problem in kilobytes',
    example: 65536,
    minimum: 1,
  })
  @Transform(({ value }: { value: string }) => Number.parseFloat(value))
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
    enum: [ProblemType.STANDALONE, ProblemType.CONTEST],
  })
  @IsEnum([ProblemType.STANDALONE, ProblemType.CONTEST])
  type: Exclude<ProblemType, ProblemType.HYBRID>;

  @ApiProperty({
    description: 'The IDs of the tags associated with the problem',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    type: 'array',
    items: { type: 'string', format: 'uuid' },
    name: 'tagIds',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as string[];
      } catch (err) {
        Logger.warn(err);
        throw new BadRequestException('Invalid JSON format for tagIds');
      }
    }

    throw new BadRequestException('tagIds must be a JSON array string');
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @Expose({ name: 'tagIds' })
  tags: string[];

  @ApiProperty({
    description: 'The IDs of the topics associated with the problem',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    type: 'array',
    items: { type: 'string', format: 'uuid' },
    name: 'topicIds',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as string[];
      } catch (err) {
        Logger.warn(err);
        throw new BadRequestException('Invalid JSON format for topicIds');
      }
    }

    throw new BadRequestException('topicIds must be a JSON array string');
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @Expose({ name: 'topicIds' })
  topics: string[];

  @ApiProperty({
    description: 'The test case file associated with the problem',
    example: 'testcase.txt',
    type: 'string',
    format: 'binary',
    name: 'testcaseFile',
  })
  @Expose({ name: TESTCASE_FILE_FIELD_NAME })
  testcase: string;

  @ApiProperty({
    description: 'The IDs of the sample test cases associated with the problem',
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
