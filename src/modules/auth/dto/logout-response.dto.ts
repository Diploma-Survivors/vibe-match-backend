import { ApiProperty } from '@nestjs/swagger';

export class LogoutResponseDto {
  @ApiProperty({
    example: 'Logged out successfully',
    description: 'Response message',
  })
  message: string;
}
