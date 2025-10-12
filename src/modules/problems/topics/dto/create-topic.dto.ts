import { ApiProperty } from '@nestjs/swagger';
import { MaxLength, MinLength } from 'class-validator';

export class CreateTopicDto {
  @ApiProperty({
    description: 'The name of the topic',
    minLength: 3,
    maxLength: 50,
  })
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @ApiProperty({
    description: 'The description of the topic',
    minLength: 10,
    maxLength: 200,
  })
  @MinLength(10)
  @MaxLength(200)
  description: string;
}
