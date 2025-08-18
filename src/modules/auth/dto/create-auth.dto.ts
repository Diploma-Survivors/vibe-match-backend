import { ApiProperty } from '@nestjs/swagger';

export class CreateAuthDto {
  @ApiProperty({
    description: 'User ID for authentication',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: 'Authentication token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Token type (access/refresh)',
    example: 'access',
    enum: ['access', 'refresh'],
  })
  tokenType: string;

  @ApiProperty({
    description: 'Token expiration date',
    example: '2024-12-31T23:59:59.000Z',
  })
  expiresAt: Date;
}
