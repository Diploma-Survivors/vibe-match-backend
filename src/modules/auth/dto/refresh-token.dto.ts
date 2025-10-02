import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Unique identifier for the device',
    example: 'device-12345',
  })
  @IsString()
  deviceId: string;
}
