// NestJS
import { BadRequestException, Logger } from '@nestjs/common';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';

// Third-party
import { plainToInstance, Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, ValidateNested } from 'class-validator';

// Relative imports
import { CreateTestcaseSampleDto } from '../testcases/dto/create-testcase-sample.dto';
import { CreateProblemDto } from './create-problem.dto';

export class UpdateTestcaseSample extends PartialType(CreateTestcaseSampleDto) {
  @ApiProperty({
    example: 1,
    description:
      'Testcase Sample ID. If provided, the sample will be updated, otherwise it will be created a new.',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number;
}

export class UpdateProblemDto extends PartialType(
  OmitType(CreateProblemDto, [
    'type',
    'testcaseSamples',
    'visibility',
  ] as const),
) {
  @ApiProperty({
    type: () => [UpdateTestcaseSample],
    required: false,
    description: 'List of testcase samples need to be updated',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsedValue = JSON.parse(value) as unknown;
        return plainToInstance(UpdateTestcaseSample, parsedValue);
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
  testcaseSamples: UpdateTestcaseSample[];
}
