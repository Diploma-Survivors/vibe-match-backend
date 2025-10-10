import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for testcase sample information
 */
export class GetTestcaseSampleDto {
  @ApiProperty({
    description: 'The unique identifier of the testcase sample',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'The input of the testcase sample',
    example: '1 2 3',
  })
  input: string;

  @ApiProperty({
    description: 'The output of the testcase sample',
    example: '6',
  })
  output: string;

  @ApiProperty({
    description: 'The creation timestamp of the testcase sample',
    example: new Date().toISOString(),
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The last updated timestamp of the testcase sample',
    example: new Date().toISOString(),
  })
  updatedAt: Date;
}
