import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { CreateAuthDto } from './create-auth.dto';

export class UpdateAuthDto extends PartialType(CreateAuthDto) {
  @ApiProperty({
    description: 'Authentication record ID',
    example: 1,
    required: false,
  })
  id?: number;

  @ApiProperty({
    description: 'User ID for authentication',
    example: 1,
    required: false,
  })
  userId?: number;

  @ApiProperty({
    description: 'Authentication token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  token?: string;

  @ApiProperty({
    description: 'Token type (access/refresh)',
    example: 'access',
    enum: ['access', 'refresh'],
    required: false,
  })
  tokenType?: string;

  @ApiProperty({
    description: 'Token expiration date',
    example: '2024-12-31T23:59:59.000Z',
    required: false,
  })
  expiresAt?: Date;
}
