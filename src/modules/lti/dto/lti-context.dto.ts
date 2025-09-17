import { ApiProperty } from '@nestjs/swagger';
import { LtiContextType } from '../enums/lti-context-type.enum';

export class LtiContextDto {
  @ApiProperty({
    description: 'LTI context ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'LTI context label',
    example: 'Course 101',
    required: false,
  })
  label: string;

  @ApiProperty({
    description: 'LTI context title',
    example: 'Introduction to Course 101',
    required: false,
  })
  title: string;

  @ApiProperty({
    description: 'LTI context type',
    enum: LtiContextType,
    isArray: true,
    required: false,
  })
  type: LtiContextType[];
}
