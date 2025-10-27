import { ApiProperty } from '@nestjs/swagger';

export class UserInformationDto {
  @ApiProperty({
    description: 'The unique identifier of the user.',
    example: 1,
  })
  id: number;

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
