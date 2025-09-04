import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class GetBatchResultsDto {
  @ApiProperty({
    description: 'Array of submission tokens to get results for',
    example: ['d85cd024-1548-4165-96c7-7bc88673f194'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  tokens: string[];
}