import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class LanguageDto {
  @ApiProperty({
    description: 'The unique identifier of the language.',
    example: 54,
  })
  @Expose()
  id: number;

  @ApiProperty({
    description: 'The name of the programming language.',
    example: 'C++17',
  })
  @Expose()
  name: string;
}
