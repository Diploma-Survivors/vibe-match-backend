import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateSubmissionDto {
  @ApiProperty({
    description: 'User id',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  readonly userId: number;

  @ApiProperty({
    description: 'Programming language identifier',
    example: 71,
  })
  @IsNumber()
  @IsNotEmpty()
  readonly languageId: number;

  @ApiPropertyOptional({
    description: 'Source code for the submission',
    example: 'console.log("Hello World");',
  })
  @IsString()
  @IsOptional()
  readonly sourceCode?: string;

  @ApiProperty({
    description: 'Problem identifier',
    example: '1',
  })
  @IsNumber()
  @IsNotEmpty()
  readonly problemId: number;

  @Transform(({ value }) => {
    let parsed: unknown = value;

    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value) as unknown;
      } catch {
        return value; // return original if JSON.parse fails
      }
    }

    return Array.isArray(parsed)
      ? parsed.map((v) => Object.assign(new CreateTestCaseDto(), v as object))
      : parsed;
  })
  @ValidateNested({ each: true })
  @Type(() => CreateTestcaseSampleDto)
  readonly testCases: CreateTestcaseSampleDto[];
}
