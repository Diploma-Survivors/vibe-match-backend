import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTestCaseDto {
  @ApiProperty({
    description: 'Problem ID this test case belongs to',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  problemId: number;

  @ApiProperty({
    description: 'Test case input data',
    example: '5 3',
  })
  @IsString()
  @IsNotEmpty()
  input: string;

  @ApiProperty({
    description: 'Expected output for validation',
    example: '8',
  })
  @IsString()
  @IsNotEmpty()
  expectedOutput: string;

  @ApiProperty({
    description: 'Whether this test case is visible to users',
    example: false,
    default: false,
  })
  @IsNotEmpty()
  isPublic: boolean = false;
}
