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
 * Extends base cursor pagination for ContestParticipation entities
 */
@Injectable()
export class SubmissionsOverviewPaginationService extends BaseCursorPaginationService<
  ContestParticipation,
  SubmissionsOverviewCursorQueryDto
> {
  private contestId: number;
  protected readonly logger = new Logger(
    SubmissionsOverviewPaginationService.name,
  );

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    query: SubmissionsOverviewCursorQueryDto,
  ): SelectQueryBuilder<ContestParticipation> {
    return this.contestParticipationRepository
      .createQueryBuilder('cp')
      .leftJoinAndSelect('cp.user', 'u')
      .where('cp.contestId = :contestId', { contestId: this.contestId });
  }

  protected async applyFilters(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    queryBuilder: SelectQueryBuilder<ContestParticipation>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    query: SubmissionsOverviewCursorQueryDto,
  ): Promise<void> {
    // No additional filters for submissions overview
  }

  protected selectFields(
    queryBuilder: SelectQueryBuilder<ContestParticipation>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sortBy: string,
  ): Promise<void> {
    queryBuilder
      .select([
        'cp.id',
        'cp.startTime',
        'cp.endTime',
        'cp.finalScore',
        'u.id',
        'u.firstName',
        'u.lastName',
        'u.email',
      ])
      .orderBy('u.lastName', 'ASC')
      .addOrderBy('u.firstName', 'ASC');

    return Promise.resolve();
  }

  /**
   * Override to provide custom total count for contest-specific query
   */
  protected async getTotalCount(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    query: SubmissionsOverviewCursorQueryDto,
  ): Promise<number> {
    type CountRaw = { count: string };
    const result = await this.contestParticipationRepository
      .createQueryBuilder('cp')
      .where('cp.contestId = :contestId', { contestId: this.contestId })
      .select('COUNT(*)', 'count')
      .getRawOne<CountRaw | undefined>();

    return parseInt(result?.count ?? '0', 10);
  }

  /**
   * Get paginated contestants for a specific contest
   */
  async getContestants(
    contestId: number,
    query: SubmissionsOverviewCursorQueryDto,
  ) {
    this.contestId = contestId;
    return this.findWithCursorPagination(query);
  }
}
