import { ApiProperty } from '@nestjs/swagger';

export class UserInformationDto {
  @ApiProperty({
    description: 'The unique identifier of the user.',
    example: 'clqj9v1p00000u9s7b1g2h3i4',
  })
  id: string;

  @ApiProperty({
    description: 'The firstname of the user.',
    example: 'john_doe',
  })
  firstName: string;

  @ApiProperty({
    description: 'The lastname of the user.',
    example: 'john_doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'The email of the user.',
    example: 'john_doe@abc.com',
  })
  email?: string;
}
