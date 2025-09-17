import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { PresentationTargetDocument } from '../enums/presentation-target-document.enum';

export class LtiLaunchPresentationDto {
  @ApiProperty({
    description: 'Presentation target document',
    enum: PresentationTargetDocument,
    example: PresentationTargetDocument.IFRAME,
  })
  @Expose({ name: 'document_target' })
  documentTarget: PresentationTargetDocument;

  @ApiProperty({
    description: 'Height of the presentation',
    example: 600,
  })
  height: number;

  @ApiProperty({
    description: 'Width of the presentation',
    example: 800,
  })
  width: number;
}
