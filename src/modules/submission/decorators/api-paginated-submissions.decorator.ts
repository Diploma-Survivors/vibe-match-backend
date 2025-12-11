import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import {
  CursorEdgeDto,
  PaginationCursorResponseDto,
} from '../../../common/pagination/dtos/pagination-cursor-response.dto';
import {
  SubmissionInListDto,
  ContestSubmissionDto,
} from '../dto/get-submissions-response.dto';

export const ApiPaginatedSubmissionsResponse = () => {
  return applyDecorators(
    ApiExtraModels(
      PaginationCursorResponseDto,
      CursorEdgeDto,
      SubmissionInListDto,
    ),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'A paginated list of submissions.',
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginationCursorResponseDto) },
          {
            properties: {
              edges: {
                type: 'array',
                items: {
                  allOf: [
                    { $ref: getSchemaPath(CursorEdgeDto) },
                    {
                      properties: {
                        node: { $ref: getSchemaPath(SubmissionInListDto) },
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Unauthorized',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'You are not allowed to view this submission list.',
    }),
  );
};

export const ApiPaginatedContestSubmissionsResponse = () => {
  return applyDecorators(
    ApiExtraModels(
      PaginationCursorResponseDto,
      CursorEdgeDto,
      ContestSubmissionDto,
    ),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'A paginated list of contest submissions.',
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginationCursorResponseDto) },
          {
            properties: {
              edges: {
                type: 'array',
                items: {
                  allOf: [
                    { $ref: getSchemaPath(CursorEdgeDto) },
                    {
                      properties: {
                        node: { $ref: getSchemaPath(ContestSubmissionDto) },
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Unauthorized',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'You are not allowed to view this submission list.',
    }),
  );
};
