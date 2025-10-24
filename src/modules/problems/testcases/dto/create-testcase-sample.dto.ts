import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateTestcaseSampleDto {
  @ApiProperty({
    description: 'The input for the testcase',
    example: '1 2',
  })
  @IsString()
  input: string;

  @ApiProperty({
    description: 'The output for the testcase',
    example: '3',
    minLength: 1,
  })
  @MinLength(1)
  output: string;
}
