// NestJS
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Third-party
import { Repository } from 'typeorm';

// Shared/Common
import { LogicalOperator } from 'src/common/pagination/enums/logical-operator.enum';
import { MatchMode } from 'src/common/pagination/enums/match-mode.enum';
import { QueryFilter } from 'src/common/pagination/filters/query-filter.interface';
import { CursorPaginationService } from 'src/common/pagination/services/cursor-pagination.service';

// Relative imports
import { RoleEnum } from 'src/modules/user/enums/role.enum';
import { Contest } from '../entities/contest.entity';
import { AuthorFilter } from '../filters/author.filter';
import { CompositeFilter } from '../filters/composite.filter';
import { CourseFilter } from '../filters/course.filter';
import { DurationFilter } from '../filters/duration.filter';
import { StatusFilter } from '../filters/status.filter';
import { FilterContext } from '../interfaces/filter-context.interface';
import { ContestsPaginationService } from '../services/contests-pagination.service';

export class TeacherContestListStrategy extends ContestsPaginationService {
  constructor(
    @InjectRepository(Contest) contestsRepository: Repository<Contest>,
    cursorPagination: CursorPaginationService,
  ) {
    super(
      contestsRepository,
      cursorPagination,
      new Logger(TeacherContestListStrategy.name),
    );
  }

  supports(roles: RoleEnum[]): boolean {
    return roles.includes(RoleEnum.INSTRUCTOR);
  }

  protected buildFilterChain(
    matchMode: MatchMode,
  ): QueryFilter<FilterContext> | null {
    const alias = this.getEntityAlias();

    const permissionFilter = new CompositeFilter(LogicalOperator.OR).addFilters(
      new CourseFilter(alias),
      new AuthorFilter(alias),
    );

    const groupOperator =
      matchMode === MatchMode.ALL ? LogicalOperator.AND : LogicalOperator.OR;
    const matchFilter = new CompositeFilter(groupOperator).addFilters(
      new DurationFilter(alias),
      new StatusFilter(alias),
    );

    permissionFilter.setNext(matchFilter);
    return permissionFilter;
  }
}
