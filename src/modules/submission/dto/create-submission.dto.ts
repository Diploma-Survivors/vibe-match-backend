import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { CreateTestcaseSampleDto } from '../../problems/testcases/dto/create-testcase-sample.dto';

export class CreateSubmissionDto {
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
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  readonly problemId: string;

  @ApiProperty({
    description: 'Test case samples for the submission',
    type: [CreateTestcaseSampleDto],
  })
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
      ? parsed.map((v) =>
          Object.assign(new CreateTestcaseSampleDto(), v as object),
        )
      : parsed;
  })
  @ValidateNested({ each: true })
  @Type(() => CreateTestcaseSampleDto)
  readonly testCases: CreateTestcaseSampleDto[];
}
