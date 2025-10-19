import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SortOrder } from '../../../common/pagination/enums/sort-order.enum';
import { CursorPaginated } from '../../../common/pagination/interfaces/cursor-paginated.interface';
import {
  decodeCursor,
  encodeCursor,
} from '../../../common/utils/cursor-query.util';
import { Submission } from '../entities/submission.entity';
import { SubmissionCursorFieldsDto } from '../dto/submission-cursor-fields.dto';
import { SubmissionsCursorQueryDto } from '../dto/submission-cursor-query.dto';
import { SubmissionInListDto } from '../dto/get-submissions-response.dto';
import { CountSubmissionField } from '../interfaces/count-submission-field';

@Injectable()
export class SubmissionCursorService {
  private readonly MAX_PAGE_SIZE = 100;

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
  ) {}

  async paginateSubmissions(
    queryBuilder: SelectQueryBuilder<Submission>,
    query: SubmissionsCursorQueryDto,
    countSubmissionsField: CountSubmissionField,
  ): Promise<CursorPaginated<SubmissionInListDto>> {
    const { limit, isBackward } = this.validateAndGetPagination(query);

    await this.applyCursorPagination(queryBuilder, query, isBackward);

    queryBuilder.take(limit + 1);

    const items = await queryBuilder.getMany();
    return this.buildPaginatedResult(
      items,
      limit,
      isBackward,
      query,
      countSubmissionsField,
    );
  }

  private validateAndGetPagination(query: SubmissionsCursorQueryDto) {
    const isBackward = !!query?.before && !query?.after;
    const limit = isBackward ? query?.last : query?.first;

    if (!limit || limit > this.MAX_PAGE_SIZE) {
      throw new BadRequestException(
        `Limit must be between 1 and ${this.MAX_PAGE_SIZE}`,
      );
    }

    return { limit, isBackward };
  }

  private async applyCursorPagination(
    queryBuilder: SelectQueryBuilder<Submission>,
    query: SubmissionsCursorQueryDto,
    isBackward: boolean,
  ) {
    const sortBy = query?.sortBy || 'createdAt';
    const naturalOrder = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

    let operator: '>' | '<' = '>';
    if (query?.after) {
      operator = naturalOrder === 'ASC' ? '>' : '<';
    } else if (query?.before) {
      operator = naturalOrder === 'ASC' ? '<' : '>';
    }

    let effectiveOrder: 'ASC' | 'DESC';
    if (isBackward) {
      effectiveOrder = naturalOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      effectiveOrder = naturalOrder;
    }

    if (query?.after || query?.before) {
      const cursor = await this.getAndValidateCursorPayload(
        query?.after ?? (query?.before as string),
      );

      queryBuilder.andWhere(
        `(submission.${query.sortBy}, submission.id) ${operator} (:cursorValue, :cursorId)`,
        {
          cursorValue: cursor[sortBy],
          cursorId: cursor.id,
        },
      );
    }

    queryBuilder
      .orderBy(`submission.${sortBy}`, effectiveOrder)
      .addOrderBy('submission.id', effectiveOrder);
  }

  private async getAndValidateCursorPayload(
    payload: string,
  ): Promise<SubmissionCursorFieldsDto> {
    const cursorRaw = decodeCursor(payload) as Record<string, any>;
    const cursor = plainToInstance(SubmissionCursorFieldsDto, cursorRaw);
    const errors = await validate(cursor);
    if (errors.length > 0) {
      throw new BadRequestException('Invalid cursor');
    }

    return cursor;
  }

  private async buildPaginatedResult(
    items: Submission[],
    limit: number,
    isBackward: boolean,
    query: SubmissionsCursorQueryDto,
    countSubmissionsField: CountSubmissionField,
  ): Promise<CursorPaginated<SubmissionInListDto>> {
    const hasMore = items.length > limit;
    if (hasMore) {
      items.pop();
    }

    if (isBackward) {
      items.reverse();
    }

    const edges = items.map((item) => ({
      node: plainToInstance(SubmissionInListDto, item, {
        excludeExtraneousValues: true,
      }),
      cursor: encodeCursor({
        id: item.id,
        [query.sortBy || 'createdAt']: item[query.sortBy || 'createdAt'],
      }),
    }));

    const startCursor = edges.length > 0 ? edges[0].cursor : null;
    const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;

    const hasNextPage = isBackward ? !!query.before : hasMore;
    const hasPreviousPage = isBackward ? hasMore : !!query.after;

    return {
      edges,
      pageInfos: {
        hasNextPage,
        hasPreviousPage,
        startCursor,
        endCursor,
      },
      totalCount: await this.getSubmissionCount(countSubmissionsField),
    };
  }

  private async getSubmissionCount(
    countSubmissionsField: CountSubmissionField,
  ): Promise<number> {
    const qb = this.submissionRepository.createQueryBuilder('submission');

    if (countSubmissionsField.problemId) {
      qb.andWhere('submission.problem_id = :problemId', {
        problemId: countSubmissionsField.problemId,
      });
    }

    if (countSubmissionsField.userId) {
      qb.andWhere('submission.user_id = :userId', {
        userId: countSubmissionsField.userId,
      });
    }

    if (countSubmissionsField.contestParticipationId) {
      qb.andWhere(
        'submission.contest_participation_id = :contestParticipationId',
        {
          contestParticipationId: countSubmissionsField.contestParticipationId,
        },
      );
    }

    if (countSubmissionsField.status) {
      qb.andWhere('submission.status = :status', {
        status: countSubmissionsField.status,
      });
    }

    return qb.getCount();
  }
}
