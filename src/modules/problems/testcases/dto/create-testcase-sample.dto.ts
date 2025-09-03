import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTestcaseSampleDto {
  @ApiProperty({
    description: 'The input for the testcase',
  })
  @IsString()
  @IsNotEmpty()
  input: string;

  @ApiProperty({
    description: 'The output for the testcase',
  })
  @IsString()
  @IsNotEmpty()
  output: string;
}
