import { Injectable } from '@nestjs/common';
import { CursorPaginated } from '../../../common/pagination/interfaces/cursor-paginated.interface';
import {
  decodeCursor,
  encodeCursor,
} from '../../../common/utils/cursor-query.util';
import { ParticipantResultDto } from '../dto/submissions-overview-response.dto';
import { SubmissionsOverviewCursorFieldsDto } from '../dto/submissions-overview-cursor-query.dto';
import { SubmissionsOverviewCursorQueryDto } from '../dto/submissions-overview-cursor-query.dto';

@Injectable()
export class SubmissionsOverviewCursorService {
  private readonly MAX_PAGE_SIZE = 100;

  async paginateSubmissionsOverview(
    participantResults: ParticipantResultDto[],
    query: SubmissionsOverviewCursorQueryDto,
  ): Promise<CursorPaginated<ParticipantResultDto>> {
    const { limit, isBackward } = this.validateAndGetPagination(query);

    // Apply cursor pagination to the already sorted participant results array
    const paginatedResults = this.applyCursorPagination(participantResults, query, isBackward, limit);

    return this.buildPaginatedResult(paginatedResults, limit, isBackward, query, participantResults.length);
  }

  private validateAndGetPagination(query: SubmissionsOverviewCursorQueryDto) {
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
    participantResults: ParticipantResultDto[],
    query: SubmissionsOverviewCursorQueryDto,
    isBackward: boolean,
    limit: number,
  ): ParticipantResultDto[] {
    let filteredResults = participantResults;

    // Apply user filter if provided
    if (query.userId) {
      filteredResults = filteredResults.filter(r => r.user.userId === query.userId);
    }

    // Apply cursor-based pagination
    if (query.after) {
      const afterCursor = decodeCursor(query.after) as SubmissionsOverviewCursorFieldsDto;
      const afterIndex = filteredResults.findIndex(
        r => r.totalScore === afterCursor.totalScore && r.participationId === afterCursor.participationId
      );
      filteredResults = filteredResults.slice(afterIndex + 1);
    } else if (query.before) {
      const beforeCursor = decodeCursor(query.before) as SubmissionsOverviewCursorFieldsDto;
      const beforeIndex = filteredResults.findIndex(
        r => r.totalScore === beforeCursor.totalScore && r.participationId === beforeCursor.participationId
      );
      filteredResults = filteredResults.slice(0, beforeIndex);
    }

    // Apply limit + 1 to check if there are more items
    return filteredResults.slice(0, limit + 1);
  }

  private buildPaginatedResult(
    items: ParticipantResultDto[],
    limit: number,
    isBackward: boolean,
    query: SubmissionsOverviewCursorQueryDto,
    totalCount: number,
  ): CursorPaginated<ParticipantResultDto> {
    const hasMore = items.length > limit;
    const actualItems = hasMore ? items.slice(0, limit) : items;

    // Reverse items if backward pagination
    const finalItems = isBackward ? actualItems.reverse() : actualItems;

    // Generate edges with cursors
    const edges = finalItems.map(item => ({
      node: item,
      cursor: encodeCursor({
        totalScore: item.totalScore,
        participationId: item.participationId,
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