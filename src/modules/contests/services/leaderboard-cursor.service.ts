import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { SortOrder } from '../../../common/pagination/enums/sort-order.enum';
import { CursorPaginated } from '../../../common/pagination/interfaces/cursor-paginated.interface';
import {
  decodeCursor,
  encodeCursor,
} from '../../../common/utils/cursor-query.util';
import { LeaderboardRankingDto } from '../dto/leaderboard-response.dto';
import { LeaderboardCursorFieldsDto } from '../dto/leaderboard-cursor-query.dto';
import { LeaderboardCursorQueryDto } from '../dto/leaderboard-cursor-query.dto';

@Injectable()
export class LeaderboardCursorService {
  private readonly MAX_PAGE_SIZE = 100;

  async paginateLeaderboard(
    rankings: LeaderboardRankingDto[],
    query: LeaderboardCursorQueryDto,
  ): Promise<CursorPaginated<LeaderboardRankingDto>> {
    const { limit, isBackward } = this.validateAndGetPagination(query);

    // Apply cursor pagination to the already sorted rankings array
    const paginatedRankings = this.applyCursorPagination(rankings, query, isBackward, limit);

    return this.buildPaginatedResult(paginatedRankings, limit, isBackward, query, rankings.length);
  }

  private validateAndGetPagination(query: LeaderboardCursorQueryDto) {
    const isBackward = !!query?.before && !query?.after;
    const limit = isBackward ? query?.last : query?.first;

    if (!limit || limit < 1 || limit > this.MAX_PAGE_SIZE) {
      throw new Error(`Limit must be between 1 and ${this.MAX_PAGE_SIZE}`);
    }

    if (query.after && query.before) {
      throw new Error('Cannot use both "after" and "before" cursors');
    }

    if ((query.after || query.before) && !(query.first || query.last)) {
      throw new Error('Cursor pagination requires "first" or "last" parameter');
    }

    return { limit, isBackward };
  }

  private applyCursorPagination(
    rankings: LeaderboardRankingDto[],
    query: LeaderboardCursorQueryDto,
    isBackward: boolean,
    limit: number,
  ): LeaderboardRankingDto[] {
    let filteredRankings = rankings;

    // Apply user filter if provided
    if (query.userId) {
      filteredRankings = filteredRankings.filter(r => r.user.userId === query.userId);
    }

    // Apply cursor-based pagination
    if (query.after) {
      const afterCursor = decodeCursor(query.after) as LeaderboardCursorFieldsDto;
      const afterIndex = filteredRankings.findIndex(
        r => r.rank === afterCursor.rank && r.user.userId === afterCursor.id
      );
      filteredRankings = filteredRankings.slice(afterIndex + 1);
    } else if (query.before) {
      const beforeCursor = decodeCursor(query.before) as LeaderboardCursorFieldsDto;
      const beforeIndex = filteredRankings.findIndex(
        r => r.rank === beforeCursor.rank && r.user.userId === beforeCursor.id
      );
      filteredRankings = filteredRankings.slice(0, beforeIndex);
    }

    // Apply limit + 1 to check if there are more items
    return filteredRankings.slice(0, limit + 1);
  }

  private buildPaginatedResult(
    items: LeaderboardRankingDto[],
    limit: number,
    isBackward: boolean,
    query: LeaderboardCursorQueryDto,
    totalCount: number,
  ): CursorPaginated<LeaderboardRankingDto> {
    const hasMore = items.length > limit;
    const actualItems = hasMore ? items.slice(0, limit) : items;

    // Reverse items if backward pagination
    const finalItems = isBackward ? actualItems.reverse() : actualItems;

    // Generate edges with cursors
    const edges = finalItems.map(item => ({
      node: item,
      cursor: encodeCursor({
        rank: item.rank,
        totalScore: item.totalScore,
        id: item.user.userId,
      }),
    }));

    // Determine pagination info
    const hasNextPage = !isBackward && hasMore;
    const hasPreviousPage = isBackward && hasMore;

    const startCursor = edges.length > 0 ? edges[0].cursor : null;
    const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;

    return {
      edges,
      pageInfos: {
        hasNextPage,
        hasPreviousPage,
        startCursor,
        endCursor,
      },
      totalCount,
    };
  }
}