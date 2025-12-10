// NestJS
import { ApiProperty } from '@nestjs/swagger';

// Third-party
import { NormalizeEmail } from 'class-sanitizer';
import { IsEmail, IsStrongPassword } from 'class-validator';

export class SignInDto {
  @ApiProperty({
    description: 'User email address',
    example: 'test@example.com',
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
}
