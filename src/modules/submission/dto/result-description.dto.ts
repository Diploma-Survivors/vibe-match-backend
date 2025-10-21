import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ResultDescription {
  @ApiProperty({
    description: 'A descriptive message about the result of the submission.',
    example: 'Compilation Error: Missing semicolon at line 23.',
  })
  @Expose()
  message: string;

  @ApiProperty({
    description: 'The input that was provided for the test case.',
    example: '5 10',
  })
  @Expose()
  input?: string;
  @ApiProperty({
    description: 'The expected output for the given input.',
    example: '15',
  })
  @Expose()
  expectedOutput?: string;

  @ApiProperty({
    description: 'The actual output produced by the submission.',
    example: '12',
  })
  @Expose()
  actualOutput?: string;
}
