import { Expose } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ContentItemType } from '../enums/content-item-type.enum';
import { PresentationTargetDocument } from '../enums/presentation-target-document.enum';
import { ApiProperty } from '@nestjs/swagger';

export class LtiDeepLinkingSettingsClaimDto {
  @ApiProperty({
    description: 'URL to return the deep link response',
    example: 'https://example.com/deep-link-return',
  })
  @IsUrl(
    { require_tld: process.env.NODE_ENV === 'production' },
    { message: 'deep_link_return_url must be a valid URL' },
  )
  @IsNotEmpty()
  @Expose({ name: 'deep_link_return_url' })
  deepLinkReturnUrl: string;

  @ApiProperty({
    description: 'Accepted content item types',
    isArray: true,
    enum: ContentItemType,
    example: [ContentItemType.LINK, ContentItemType.FILE],
  })
  @IsArray()
  @IsEnum(ContentItemType, { each: true })
  @IsNotEmpty({ each: true })
  @Expose({ name: 'accept_types' })
  acceptTypes: ContentItemType[];

  @ApiProperty({
    description: 'Accepted presentation document targets',
    isArray: true,
    enum: PresentationTargetDocument,
    example: [
      PresentationTargetDocument.EMBED,
      PresentationTargetDocument.IFRAME,
    ],
    required: false,
  })
  @IsArray()
  @IsEnum(PresentationTargetDocument, { each: true })
  @Expose({ name: 'accept_presentation_document_targets' })
  acceptPresentationDocumentTargets?: PresentationTargetDocument[];

  @ApiProperty({
    description: 'Accepted media types',
    isArray: true,
    example: ['image/*', 'video/*'],
    required: false,
  })
  @IsOptional()
  @IsString({ each: true })
  @Expose({ name: 'accept_media_types' })
  acceptMediaTypes?: string[];

  @ApiProperty({
    description: 'Whether multiple items can be accepted',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Expose({ name: 'accept_multiple' })
  acceptMultiple?: boolean;

  @ApiProperty({
    description: 'Whether to auto-create the resource',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Expose({ name: 'accept_line_item' })
  acceptLineItem?: boolean;

  @ApiProperty({
    description: 'Whether to auto-create the resource',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Expose({ name: 'auto_create' })
  autoCreate?: boolean;

  @ApiProperty({
    description: 'Title for the deep link selection',
    example: 'Select a Resource',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Text for the deep link selection',
    example: 'Please select a resource to add to your course.',
    required: false,
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({
    description: 'Custom data to be returned with the deep link response',
    example: 'custom-data-value',
    required: false,
  })
  @IsOptional()
  @IsString()
  data?: string;
}
