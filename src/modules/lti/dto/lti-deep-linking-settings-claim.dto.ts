import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ContentItemType } from '../enums/content-item-type.enum';
import { PresentationTargetDocument } from '../enums/presentation-target-document.enum';

export class LtiDeepLinkingSettingsClaimDto {
  @ApiProperty({
    description: 'URL to return the deep link response',
    example: 'https://example.com/deep-link-return',
  })
  @Expose({ name: 'deep_link_return_url' })
  deepLinkReturnUrl: string;

  @ApiProperty({
    description: 'Accepted content item types',
    isArray: true,
    enum: ContentItemType,
    example: [ContentItemType.LINK, ContentItemType.FILE],
  })
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
  @Expose({ name: 'accept_presentation_document_targets' })
  acceptPresentationDocumentTargets?: PresentationTargetDocument[];

  @ApiProperty({
    description: 'Accepted media types',
    isArray: true,
    example: ['image/*', 'video/*'],
    required: false,
  })
  @Expose({ name: 'accept_media_types' })
  acceptMediaTypes?: string[];

  @ApiProperty({
    description: 'Whether multiple items can be accepted',
    example: false,
    required: false,
  })
  @Expose({ name: 'accept_multiple' })
  acceptMultiple?: boolean;

  @ApiProperty({
    description: 'Whether to auto-create the resource',
    example: true,
    required: false,
  })
  @Expose({ name: 'accept_line_item' })
  acceptLineItem?: boolean;

  @ApiProperty({
    description: 'Whether to auto-create the resource',
    example: true,
    required: false,
  })
  @Expose({ name: 'auto_create' })
  autoCreate?: boolean;

  @ApiProperty({
    description: 'Title for the deep link selection',
    example: 'Select a Resource',
    required: false,
  })
  title?: string;

  @ApiProperty({
    description: 'Text for the deep link selection',
    example: 'Please select a resource to add to your course.',
    required: false,
  })
  text?: string;

  @ApiProperty({
    description: 'Custom data to be returned with the deep link response',
    example: 'custom-data-value',
    required: false,
  })
  data?: string;
}
