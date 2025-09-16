import { IsEnum, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { PresentationTargetDocument } from '../enums/presentation-target-document.enum';
import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LtiLaunchPresentationDto {
  @ApiProperty({
    description: 'Presentation target document',
    enum: PresentationTargetDocument,
    example: PresentationTargetDocument.IFRAME,
  })
  @IsNotEmpty()
  @IsEnum(PresentationTargetDocument, {
    message: 'Invalid presentation target document',
  })
  @Expose({ name: 'document_target' })
  documentTarget: PresentationTargetDocument;

  @ApiProperty({
    description: 'Height of the presentation',
    example: 600,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  height: number;

  @ApiProperty({
    description: 'Width of the presentation',
    example: 800,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  width: number;
}
