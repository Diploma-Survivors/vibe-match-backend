import { ApiProperty } from '@nestjs/swagger';

export class LanguageDto {
  @ApiProperty({
    description: 'The unique identifier of the language.',
    example: 54,
  })
  id: number;

  @ApiProperty({
    description: 'The name of the programming language.',
    example: 'C++17',
  })
  name: string;
}
