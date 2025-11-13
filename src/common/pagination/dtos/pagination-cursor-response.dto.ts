import { ApiProperty } from '@nestjs/swagger';

export class CursorEdgeDto<T> {
  @ApiProperty({
    description: 'The data node',
  })
  node: T;

  @ApiProperty({
    description: 'Cursor for the item',
    example: 'eyJpZCI6IjI5ZjllODYxLWQxMWUtNGI...',
  })
  cursor: string;
}

export class PaginationInfoDto {
  @ApiProperty({
    description: 'Indicates if there is a next page',
    example: true,
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Indicates if there is a previous page',
    example: false,
  })
  hasPreviousPage: boolean;

  @ApiProperty({
    description: 'Cursor for the start of the page',
    example: 'eyJpZCI6IjI5ZjllODYxLWQxMWUtNGI...',
  })
  startCursor: string | null;

  @ApiProperty({
    description: 'Cursor for the end of the page',
    example: 'eyJpZCI6IjI5ZjllODYxLWQxMWUtNGI...',
  })
  endCursor: string | null;
}

export class PaginationCursorResponseDto<T> {
  @ApiProperty({
    description: 'List of edges',
    isArray: true,
  })
  edges: CursorEdgeDto<T>[];

  @ApiProperty({
    description: 'Pagination information',
  })
  pageInfos: PaginationInfoDto;

  @ApiProperty({ description: 'Total number of items', example: 100 })
  totalCount: number;
}
