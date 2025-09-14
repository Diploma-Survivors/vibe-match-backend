import { ApiProperty } from '@nestjs/swagger';

export class CreateTestcaseDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Upload a text file containing the testcase data',
  })
  file: string;
}
