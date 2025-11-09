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
import { ProblemTag } from '../entities/problem-tag.entity';
import { ProblemTopic } from '../entities/problem-topic.entity';
import { Problem } from '../entities/problem.entity';
import { CanAccessFilter } from '../filters/can-access.filter';
import { CompositeFilter } from '../filters/composite.filter';
import { DifficultyFilter } from '../filters/difficulty.filter';
import { TagsFilter } from '../filters/tags.filter';
import { TopicsFilter } from '../filters/topics.filter';
import { TypeFilter } from '../filters/type.filter';
import { FilterContext } from '../interfaces/filter-context.interface';
import { ProblemsPaginationService } from '../services/problems-pagination.service';

export class StudentProblemFilterStrategy extends ProblemsPaginationService {
  constructor(
    @InjectRepository(Problem) problemRepository: Repository<Problem>,
    @InjectRepository(ProblemTag) problemTagRepository: Repository<ProblemTag>,
    @InjectRepository(ProblemTopic)
    problemTopicRepository: Repository<ProblemTopic>,
    cursorPaginationService: CursorPaginationService,
  ) {
    super(
      problemRepository,
      problemTagRepository,
      problemTopicRepository,
      cursorPaginationService,
      new Logger(StudentProblemFilterStrategy.name),
    );
  }

  protected buildFilterChain(
    matchMode: MatchMode,
  ): QueryFilter<FilterContext> | null {
    const alias = this.getEntityAlias();
    const permissionFilter = new TypeFilter(alias).setNext(
      new CanAccessFilter(alias),
    );

    const logicalOperator =
      matchMode === MatchMode.ALL ? LogicalOperator.AND : LogicalOperator.OR;
    const matchFilter = new CompositeFilter(logicalOperator).addFilters(
      new DifficultyFilter(alias),
      new TagsFilter(alias),
      new TopicsFilter(alias),
    );

    permissionFilter.setNext(matchFilter);
    return permissionFilter;
  }
}
