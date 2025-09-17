import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class LtiToolPlatformDto {
  @ApiProperty({
    description: 'Email contact of the platform support',
    example: 'support@example.com',
    required: false,
  })
  @Expose({ name: 'contact_email' })
  contactEmail?: string;

  @ApiProperty({
    description: 'An example platform description',
    example: 'Example Platform',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Name of the platform',
    example: 'Example Platform',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'URL of the platform',
    example: 'https://example.org',
    required: false,
  })
  url?: string;

  @ApiProperty({
    description: 'Product family code of the platform',
    example: 'example.org',
    required: false,
  })
  @Expose({ name: 'product_family_code' })
  productFamilyCode?: string;

  @ApiProperty({
    description: 'Version of the platform',
    example: '1.0.0',
    required: false,
  })
  version: string;
}
