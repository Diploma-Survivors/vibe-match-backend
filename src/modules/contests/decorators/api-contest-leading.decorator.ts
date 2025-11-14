import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import {
  CursorEdgeDto,
  PaginationCursorResponseDto,
} from '../../../common/pagination/dtos/pagination-cursor-response.dto';
import { BaseProblemResponseDto } from '../../problems/dto/base-problem-response.dto';
import { LeaderboardRankingDto } from '../dto/leaderboard-response.dto';
import { ContestParticipationDto } from '../dto/contest-participation.dto';

export const ApiContestLeadingDecorator = () => {
  return applyDecorators(
    ApiExtraModels(
      PaginationCursorResponseDto,
      CursorEdgeDto,
      LeaderboardRankingDto,
      BaseProblemResponseDto,
    ),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Contest leaderboard retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          problems: {
            type: 'array',
            items: { $ref: getSchemaPath(BaseProblemResponseDto) },
          },
          rankings: {
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
                            node: {
                              $ref: getSchemaPath(LeaderboardRankingDto),
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Unauthorized',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'You are not allowed to view this leaderboard.',
    }),
  );
};

export const ApiPaginatedContestantDecorator = () => {
  return applyDecorators(
    ApiExtraModels(
      PaginationCursorResponseDto,
      CursorEdgeDto,
      ContestParticipationDto,
    ),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Contest leaderboard retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          contestants: {
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
                            node: {
                              $ref: getSchemaPath(ContestParticipationDto),
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Unauthorized',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'You are not allowed to view this leaderboard.',
    }),
  );
};
