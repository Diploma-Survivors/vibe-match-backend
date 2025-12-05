// NestJS
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Third-party
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';

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
    return (
      this.contestParticipationRepository
        .createQueryBuilder('cp')
        .leftJoinAndSelect('cp.user', 'u')
        .where('cp.contest.id = :contestId', {
          contestId: query.contestId,
        })
        // Exclude admin users - roles is stored as simple-array (comma-separated string)
        .andWhere("(u.roles IS NULL OR u.roles NOT LIKE '%ADMIN%')")
    );
  }

  protected async applyFilters(
    queryBuilder: SelectQueryBuilder<ContestParticipation>,
    query: SubmissionsOverviewCursorQueryDto,
  ): Promise<void> {
    // Apply name filter if provided
    if (query.filters?.name) {
      queryBuilder.andWhere(
        '(u.firstName ILIKE :name OR u.lastName ILIKE :name OR u.email ILIKE :name)',
        { name: `%${query.filters.name}%` },
      );
    }
    await Promise.resolve();
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
      .addSelect("COALESCE(u.email, '')", 'userEmail');
  }

  /**
   * Override to search by user fields
   */
  protected applyKeywordFilter(
    queryBuilder: SelectQueryBuilder<ContestParticipation>,
    keyword: string,
  ): void {
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where('u.firstName ILIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('u.lastName ILIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('u.email ILIKE :keyword', { keyword: `%${keyword}%` });
      }),
    );
  }

  /**
   * Override to provide custom total count for contest-specific query
   */
  protected async getTotalCount(
    query: SubmissionsOverviewCursorQueryDto & { contestId: number },
  ): Promise<number> {
    type CountRaw = { count: string };
    const countQb = this.contestParticipationRepository
      .createQueryBuilder('cp')
      .leftJoin('cp.user', 'u')
      .where('cp.contest.id = :contestId', { contestId: query.contestId })
      // Exclude admin users - roles is stored as simple-array (comma-separated string)
      .andWhere("(u.roles IS NULL OR u.roles NOT LIKE '%ADMIN%')");

    // Apply name filter to count query if provided
    if (query.filters?.name) {
      countQb.andWhere(
        '(u.firstName ILIKE :name OR u.lastName ILIKE :name OR u.email ILIKE :name)',
        { name: `%${query.filters.name}%` },
      );
    }

    const result = await countQb
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
