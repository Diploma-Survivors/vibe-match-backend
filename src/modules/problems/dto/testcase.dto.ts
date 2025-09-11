import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TestcaseDto {
  @ApiProperty({
    description: 'The ID of the test case',
    format: 'uuid',
  })
  @IsUUID('all', { message: 'Test case ID must be a valid UUID' })
  id: string;
}
