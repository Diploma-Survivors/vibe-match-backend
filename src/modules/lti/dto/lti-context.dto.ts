import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LtiContextType } from '../enums/lti-context-type.enum';
import { ApiProperty } from '@nestjs/swagger';

export class LtiContextDto {
  @ApiProperty({
    description: 'LTI context ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({
    description: 'LTI context label',
    example: 'Course 101',
    required: false,
  })
  @IsOptional()
  @IsString()
  label: string;

  @ApiProperty({
    description: 'LTI context title',
    example: 'Introduction to Course 101',
    required: false,
  })
  @IsOptional()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'LTI context type',
    enum: LtiContextType,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsEnum(LtiContextType, { each: true })
  type: LtiContextType[];
}
