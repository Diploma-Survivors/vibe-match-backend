import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({
    description: 'The name of the tag',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  name: string;
}
