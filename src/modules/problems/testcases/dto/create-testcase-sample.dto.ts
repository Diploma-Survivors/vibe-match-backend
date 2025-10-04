import { ApiProperty } from '@nestjs/swagger';
import { MinLength } from 'class-validator';

export class CreateTestcaseSampleDto {
  @ApiProperty({
    description: 'The input for the testcase',
    example: '1 2',
  })
  @MinLength(3)
  input: string;

  @ApiProperty({
    description: 'The output for the testcase',
    example: '3',
  })
  @MinLength(1)
  output: string;
}
