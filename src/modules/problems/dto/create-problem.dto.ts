import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNotEmptyObject,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DifficultyLevel } from '../enums/difficulty-level.enum';
import { CreateTestcaseSampleDto } from '../testcases/dto/create-testcase-sample.dto';
import { ProblemType } from '../enums/problem-type.enum';

export class CreateProblemDto {
  @ApiProperty({
    description: 'The title of the problem',
    minLength: 3,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
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
    minLength: 8,
    maxLength: 512,
  })
  @IsString()
  @IsNotEmpty({ message: 'Input description is required' })
  @MinLength(8, {
    message: 'Input description must be at least 8 characters long',
  })
  @MaxLength(512, {
    message: 'Input description must be at most 512 characters long',
  })
  inputDescription: string;

  @ApiProperty({
    description: 'The output description of the problem',
    minLength: 3,
    maxLength: 512,
  })
  @IsString()
  @IsNotEmpty({ message: 'Output description is required' })
  @MinLength(3, {
    message: 'Output description must be at least 3 characters long',
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
    description: 'The type of the problem',
    example: ProblemType.STANDALONE,
    enum: [ProblemType.STANDALONE, ProblemType.CONTEST],
  })
  @IsEnum([ProblemType.STANDALONE, ProblemType.CONTEST])
  type: Exclude<ProblemType, ProblemType.HYBRID>;

  @ApiProperty({
    description: 'The IDs of the tags associated with the problem',
    type: 'array',
    items: { type: 'string', format: 'uuid' },
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @Expose({ name: 'tagIds' })
  tags: string[];

  @ApiProperty({
    description: 'The IDs of the topics associated with the problem',
    type: 'array',
    items: { type: 'string', format: 'uuid' },
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @Expose({ name: 'topicIds' })
  topics: string[];

  @ApiProperty({
    description: 'The ID of the test case associated with the problem',
    type: 'string',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsUUID()
  @Expose({ name: 'testcaseId' })
  testcase: string;

  @ApiProperty({
    description: 'The IDs of the sample test cases associated with the problem',
    type: () => [CreateTestcaseSampleDto],
  })
  @IsArray()
  @Type(() => CreateTestcaseSampleDto)
  @IsNotEmptyObject({ nullable: false }, { each: true })
  @ValidateNested({ each: true })
  testcaseSamples: CreateTestcaseSampleDto[];
}
