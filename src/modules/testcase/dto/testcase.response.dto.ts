import { ApiProperty } from '@nestjs/swagger';

export class TestCaseDto {
  @ApiProperty({
    description: 'Test case unique identifier',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Problem ID this test case belongs to',
    example: 1,
  })
  problemId: number;

  @ApiProperty({
    description: 'Test case input data',
    example: '5 3',
  })
  input: string;

  @ApiProperty({
    description: 'Expected output',
    example: '8',
  })
  expectedOutput: string;

  @ApiProperty({
    description: 'Whether this test case is visible to users',
    example: false,
  })
  isPublic: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;
}
