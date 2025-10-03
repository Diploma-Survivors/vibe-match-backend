import { ApiProperty } from '@nestjs/swagger';

export class JwksDto {
  @ApiProperty({
    example: 'RSA',
    description: 'Key Type',
  })
  kty: string;

  @ApiProperty({
    example: 'AQAB',
    description: 'Exponent',
  })
  e: string;

  @ApiProperty({
    example: 'sig',
    description: 'Public Key Use',
  })
  use: string;

  @ApiProperty({
    example: 'example-key-id',
    description: 'Key ID',
  })
  kid: string;

  @ApiProperty({
    example: 'example-modulus',
    description: 'Modulus',
  })
  n: string;
}

export class GetJwksResponseDto {
  @ApiProperty({
    type: () => [JwksDto],
  })
  keys: JwksDto[];
}
