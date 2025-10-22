import { ApiProperty } from '@nestjs/swagger';

export class UpdateProblemResponseDto {
  @ApiProperty({
    example: 'Problem updated successfully',
    description: 'Response message',
  })
  message: string;
}
