import { ApiProperty } from '@nestjs/swagger';

export class CreateTestcaseResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the testcase',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'The URL of the testcase file',
    example:
      'https://example.com/testcase-550e8400-e29b-41d4-a716-446655440000',
  })
  fileUrl: string;

  @ApiProperty({
    description: 'The creation date of the testcase',
    example: '2025-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The last update date of the testcase',
    example: '2025-01-01T00:00:00Z',
  })
  updatedAt: Date;
}
