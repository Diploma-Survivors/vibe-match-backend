// NestJS
import { ApiProperty } from '@nestjs/swagger';

// Third-party
import { NormalizeEmail, Trim } from 'class-sanitizer';
import {
  IsEmail,
  IsStrongPassword,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignUpDto {
  @ApiProperty({
    description: 'User email address',
    example: 'test@example.com',
    uniqueItems: true,
  })
  @IsEmail()
  @NormalizeEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'StrongPassword123!',
  })
  @IsStrongPassword()
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @MinLength(1)
  @MaxLength(50)
  @Trim()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @MinLength(1)
  @MaxLength(50)
  @Trim()
  lastName: string;
}
