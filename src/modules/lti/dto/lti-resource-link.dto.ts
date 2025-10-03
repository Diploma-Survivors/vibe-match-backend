import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { ContentItemType } from '../enums/content-item-type.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class LtiResourceImageDto {
  @ApiProperty({
    description: 'URL of the image',
    example: 'https://example.com/image.png',
  })
  @IsNotEmpty()
  @IsString()
  url: string;

  @ApiProperty({
    description: 'Width of the image in pixels',
    example: 64,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  width: number;

  @ApiProperty({
    description: 'Height of the image in pixels',
    example: 64,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  height: number;
}

class LtiResourceWindowDto {
  @ApiProperty({
    description: 'Target name for the window',
    example: '_blank',
    required: false,
  })
  @IsOptional()
  @IsString()
  targetName: string;

  @ApiProperty({
    description: 'Width of the window in pixels',
    example: 800,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  width?: number;

  @ApiProperty({
    description: 'Height of the window in pixels',
    example: 600,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  height?: number;

  @ApiProperty({
    description: 'Features of the window (e.g., scrollbars, resizable)',
    example: 'scrollbars,resizable',
    required: false,
  })
  @IsOptional()
  @IsString()
  windowFeatures?: string;
}

class LtiIframeDto {
  @ApiProperty({
    description: 'Width of the iframe in pixels',
    example: 800,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  width: number;

  @ApiProperty({
    description: 'Height of the iframe in pixels',
    example: 600,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  height: number;
}

class LtiLineItemDto {
  @ApiProperty({
    description: 'Label for the line item',
    example: 'Assignment 1',
    required: false,
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({
    description: 'Maximum score for the line item',
    example: 100,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  scoreMaximum: number;

  @ApiProperty({
    description: 'Resource ID for the line item',
    example: 'resource-123',
  })
  @IsNotEmpty()
  @IsString()
  resourceId: string;

  @ApiProperty({
    description: 'Tag for the line item',
    example: 'vibe-match-assignment',
    required: false,
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiProperty({
    description: 'Whether grades are released to the students',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  gradesReleased?: boolean;
}

class LtiDurationDto {
  @ApiProperty({
    description: 'Start date and time in ISO 8601 format',
    example: '2025-10-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  startDateTime?: Date;

  @ApiProperty({
    description: 'End date and time in ISO 8601 format',
    example: '2025-10-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  endDateTime?: Date;
}

export class LtiResourceLinkDto {
  @ApiProperty({
    description: 'Device ID used to track the user session',
    example: 'device-12345',
  })
  @IsString()
  deviceId?: string;

  type?: ContentItemType;

  @ApiProperty({
    description: 'URL of the resource',
    example: 'https://example.com/resource/12345',
    required: false,
  })
  @IsOptional()
  @IsUrl({
    require_tld: process.env.NODE_ENV === 'production',
  })
  url?: string;

  @ApiProperty({
    description: 'Title of the resource',
    example: 'Example Resource',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Text description of the resource',
    example: 'This is an example resource.',
    required: false,
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({
    description: 'Icon of the resource',
    example: {
      url: 'https://example.com/icon.png',
      width: 64,
      height: 64,
    },
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LtiResourceImageDto)
  icon?: LtiResourceImageDto;

  @ApiProperty({
    description: 'Thumbnail of the resource',
    example: {
      url: 'https://example.com/thumbnail.png',
      width: 128,
      height: 128,
    },
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LtiResourceImageDto)
  thumbnail?: LtiResourceImageDto;

  @ApiProperty({
    description: 'Window settings for launching the resource',
    required: false,
    type: () => LtiResourceWindowDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LtiResourceWindowDto)
  window?: LtiResourceWindowDto;

  @ApiProperty({
    description: 'Iframe settings for the resource',
    required: false,
    type: () => LtiIframeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LtiIframeDto)
  iframe?: LtiIframeDto;

  @ApiProperty({
    description: 'Custom parameters for the resource',
    example: { key1: 'value1', key2: 'value2' },
    required: false,
  })
  @IsOptional()
  custom?: Record<string, any>;

  @ApiProperty({
    description: 'Line item for the resource',
    required: false,
    type: () => LtiLineItemDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LtiLineItemDto)
  lineItem?: LtiLineItemDto;

  @ApiProperty({
    description: 'Duration when the resource is available',
    required: false,
    type: () => LtiDurationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LtiDurationDto)
  available?: LtiDurationDto;

  @ApiProperty({
    description: 'Duration when the resource can be submitted',
    required: false,
    type: () => LtiDurationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LtiDurationDto)
  submission?: LtiDurationDto;

  constructor(partial: Partial<LtiResourceLinkDto>) {
    Object.assign(this, partial);
  }
}
