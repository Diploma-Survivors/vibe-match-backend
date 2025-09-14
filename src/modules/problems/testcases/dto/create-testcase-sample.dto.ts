import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTestcaseSampleDto {
  @ApiProperty({
    description: 'The input for the testcase',
    example: '1 2',
  })
  @IsString()
  @IsNotEmpty()
  input: string;

  @ApiProperty({
    description: 'The output for the testcase',
    example: '3',
  })
  @IsString()
  @IsNotEmpty()
  output: string;
}
