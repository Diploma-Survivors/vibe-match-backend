import { ApiProperty } from '@nestjs/swagger';
import { MaxLength, MinLength } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({
    description: 'The name of the tag',
    type: String,
    minLength: 3,
    maxLength: 30,
  })
  @MinLength(3)
  @MaxLength(30)
  name: string;
}
