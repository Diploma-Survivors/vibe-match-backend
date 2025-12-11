// NestJS
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Third-party
import { Repository, SelectQueryBuilder } from 'typeorm';

// Shared/Common
import { BaseCursorPaginationService } from 'src/common/pagination/services/base-cursor-pagination.service';
import { CursorPaginationService } from 'src/common/pagination/services/cursor-pagination.service';

// Relative imports
import { ContestParticipation } from '../entities/contest-participations.entity';
import { SubmissionsOverviewCursorQueryDto } from '../dto/submissions-overview-cursor-query.dto';

/**
 * Service for submissions overview pagination
 * Returns entities with joined user data for transformation
 */
@Injectable()
export class SubmissionsOverviewPaginationService extends BaseCursorPaginationService<
  ContestParticipation,
  SubmissionsOverviewCursorQueryDto
> {
  constructor(
    @InjectRepository(ContestParticipation)
    private readonly contestParticipationRepository: Repository<ContestParticipation>,
    cursorPaginationService: CursorPaginationService,
  ) {
    super(
      cursorPaginationService,
      new Logger(SubmissionsOverviewPaginationService.name),
    );
  }

  protected getEntityAlias(): string {
    return 'cp';
  }

  protected getSearchableFields(): string[] {
    return []; // No keyword search for submissions overview
  }

  protected buildBaseQuery(
    query: SubmissionsOverviewCursorQueryDto & { contestId: number },
  ): SelectQueryBuilder<ContestParticipation> {
    return this.contestParticipationRepository
      .createQueryBuilder('cp')
      .leftJoinAndSelect('cp.user', 'u')
      .where('cp.contest.id = :contestId', {
        contestId: query.contestId,
      });
  }

  protected async applyFilters(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _queryBuilder: SelectQueryBuilder<ContestParticipation>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _query: SubmissionsOverviewCursorQueryDto,
  ): Promise<void> {
    // No additional filters for submissions overview
  }

  protected selectFields(
    queryBuilder: SelectQueryBuilder<ContestParticipation>,
    sortBy: string,
  ): Promise<void> | void {
    const alias = this.getEntityAlias();
    const defaultSortField = this.getDefaultSortField();

    // Select specific fields with clean aliases
    // This prevents security issues (e.g., fetching user passwords)
    queryBuilder
      .select([
        `${alias}.${defaultSortField} AS "${defaultSortField}"`,
        `${alias}.${sortBy} AS "${sortBy}"`,
        `${alias}.startTime AS "startTime"`,
        `${alias}.endTime AS "endTime"`,
        `${alias}.finalScore AS "finalScore"`,
      ])
      .addSelect('u.id', 'userId')
      .addSelect("COALESCE(u.firstName, '')", 'userFirstName')
      .addSelect("COALESCE(u.lastName, '')", 'userLastName')
      .addSelect("COALESCE(u.email, '')", 'userEmail')
      .orderBy('u.lastName', 'ASC')
      .addOrderBy('u.firstName', 'ASC')
      .addOrderBy(`${alias}.${defaultSortField}`, 'ASC');
  }

  /**
   * Override to provide custom total count for contest-specific query
   */
  protected async getTotalCount(
    query: SubmissionsOverviewCursorQueryDto & { contestId: number },
  ): Promise<number> {
    type CountRaw = { count: string };
    const result = await this.contestParticipationRepository
      .createQueryBuilder('cp')
      .where('cp.contest.id = :contestId', { contestId: query.contestId })
      .select('COUNT(*)', 'count')
      .getRawOne<CountRaw | undefined>();

    return parseInt(result?.count ?? '0', 10);
  }

  /**
   * Maps raw database result to ContestParticipation DTO structure.
   * Extracts fields from flat raw result into nested structure.
   * Uses explicit field selection to avoid fetching sensitive data like passwords.
   */
  private mapRawResultToDto(
    raw: Record<string, unknown>,
  ): ContestParticipation {
    return {
      id: raw['id'] as number,
      startTime: raw['startTime'] as Date,
      endTime: raw['endTime'] as Date | null,
      finalScore: raw['finalScore'] as number | null,
      user: {
        id: raw['userId'] as number,
        firstName: raw['userFirstName'] as string,
        lastName: raw['userLastName'] as string,
        email: raw['userEmail'] as string,
      },
    } as unknown as ContestParticipation;
  }

  /**
   * Get paginated contestants for a specific contest
   * Returns entities with joined user data
   */
  async getContestants(
    contestId: number,
    query: SubmissionsOverviewCursorQueryDto,
  ) {
    const paginatedResult = await this.findWithCursorPagination({
      ...query,
      contestId,
    } as SubmissionsOverviewCursorQueryDto);

    // Map flat raw results to nested structure using dedicated mapper
    const edges = paginatedResult.edges.map((edge) => ({
      ...edge,
      node: this.mapRawResultToDto(
        edge.node as unknown as Record<string, unknown>,
      ),
    }));

    return {
      ...paginatedResult,
      edges,
    };
  }
}
