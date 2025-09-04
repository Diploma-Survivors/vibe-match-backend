import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class LtiLaunchRequestDto {
  @ApiProperty({
    description: 'The LTI id_token from the platform',
    example: 'eyJhbGciO...',
  })
  @IsString()
  @IsNotEmpty()
  @Expose({ name: 'id_token' })
  public readonly idToken: string;

  @ApiProperty({
    description: 'The state parameter for CSRF protection',
    example: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
  })
  @IsString()
  @IsNotEmpty()
  public readonly state: string;
}
