import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTopicDto {
  @ApiProperty({
    description: 'The name of the topic',
    minLength: 3,
    maxLength: 50,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @ApiProperty({
    description: 'The description of the topic',
    minLength: 10,
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  description: string;
}
