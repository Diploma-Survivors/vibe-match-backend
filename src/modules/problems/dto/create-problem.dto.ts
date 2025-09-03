import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DifficultyLevel } from '../enums/difficulty-level.enum';
import { CreateTestcaseSampleDto } from '../testcases/dto/create-testcase-sample.dto';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProblemDto {
  @ApiProperty({
    description: 'The title of the problem',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(8, { message: 'Title must be at least 8 characters long' })
  @MaxLength(128, { message: 'Title must be at most 128 characters long' })
  title: string;

  @ApiProperty({
    description: 'The description of the problem',
    minLength: 16,
    maxLength: 512,
  })
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MinLength(16, { message: 'Description must be at least 16 characters long' })
  @MaxLength(512, {
    message: 'Description must be at most 512 characters long',
  })
  description: string;

  @ApiProperty({
    description: 'The input description of the problem',
    minLength: 16,
    maxLength: 512,
  })
  @IsString()
  @IsNotEmpty({ message: 'Input description is required' })
  @MinLength(16, {
    message: 'Input description must be at least 16 characters long',
  })
  @MaxLength(512, {
    message: 'Input description must be at most 512 characters long',
  })
  inputDescription: string;

  @ApiProperty({
    description: 'The output description of the problem',
    minLength: 16,
    maxLength: 512,
  })
  @IsString()
  @IsNotEmpty({ message: 'Output description is required' })
  @MinLength(16, {
    message: 'Output description must be at least 16 characters long',
  })
  @MaxLength(512, {
    message: 'Output description must be at most 512 characters long',
  })
  outputDescription: string;

  @ApiProperty({
    description: 'The maximum score for the problem',
    minimum: 1,
  })
  @IsNotEmpty()
  @IsPositive({ message: 'Max score must be a positive number' })
  maxScore: number;

  @ApiProperty({
    description: 'The time limit for the problem in milliseconds',
    minimum: 1,
  })
  @IsNotEmpty()
  @IsPositive({ message: 'Time limit must be a positive number' })
  timeLimitMs: number;

  @ApiProperty({
    description: 'The memory limit for the problem in kilobytes',
    minimum: 1,
  })
  @IsNotEmpty()
  @IsPositive({ message: 'Memory limit must be a positive number' })
  memoryLimitKb: number;

  @ApiProperty({
    description: 'The difficulty level of the problem',
    enum: DifficultyLevel,
  })
  @IsNotEmpty()
  @IsEnum(DifficultyLevel, {
    message: 'Difficulty level must be a valid enum value',
  })
  difficulty: DifficultyLevel;

  @ApiProperty({
    description: 'The IDs of the tags associated with the problem',
    type: 'array',
    items: { type: 'string', format: 'uuid' },
  })
  @IsUUID('all', { each: true, message: 'Each tag ID must be a valid UUID' })
  tagIds: string[];

  @ApiProperty({
    description: 'The IDs of the topics associated with the problem',
    type: 'array',
    items: { type: 'string', format: 'uuid' },
  })
  @IsArray()
  @IsUUID('all', { each: true, message: 'Each topic ID must be a valid UUID' })
  topicIds: string[];

  @ApiProperty({
    description: 'The IDs of the test cases associated with the problem',
    type: 'array',
    items: { type: 'string', format: 'uuid' },
  })
  @IsArray()
  @IsUUID('all', {
    each: true,
    message: 'Each testcase ID must be a valid UUID',
  })
  testcaseIds: string[];

  @ApiProperty({
    description: 'The IDs of the sample test cases associated with the problem',
    type: 'array',
    items: { type: 'string', format: 'uuid' },
  })
  @IsArray()
  @ValidateNested({ each: true })
  testcaseSamples: CreateTestcaseSampleDto[];
}
