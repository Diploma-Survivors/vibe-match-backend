import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserInformationDto {
  @ApiProperty({
    description: 'The unique identifier of the user.',
    example: 1,
  })
  @Expose()
  id: number;

  @ApiProperty({
    description: 'The firstname of the user.',
    example: 'john_doe',
  })
  @Expose()
  firstName: string;

  @ApiProperty({
    description: 'The lastname of the user.',
    example: 'john_doe',
  })
  @Expose()
  lastName: string;

  @ApiProperty({
    description: 'The email of the user.',
    example: 'john_doe@abc.com',
  })
  @Expose()
  email?: string;
}
