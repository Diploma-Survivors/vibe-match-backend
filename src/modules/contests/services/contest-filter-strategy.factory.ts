import { ForbiddenException, Injectable } from '@nestjs/common';
import { StudentContestListStrategy } from '../strategies/student-contest-list.strategy';
import { TeacherContestListStrategy } from '../strategies/teacher-contest-list.strategy';
import { RoleEnum } from 'src/modules/user/enums/role.enum';
import { ContestsPaginationService } from './contests-pagination.service';

@Injectable()
export class ContestFilterStrategyFactory {
  constructor(
    private readonly studentContestListStrategy: StudentContestListStrategy,
    private readonly teacherContestListStrategy: TeacherContestListStrategy,
  ) {}

  getStrategy(roles: RoleEnum[]): ContestsPaginationService {
    const strategies = [
      this.studentContestListStrategy,
      this.teacherContestListStrategy,
    ];

    for (const strategy of strategies) {
      if (strategy.supports(roles)) {
        return strategy;
      }
    }

    throw new ForbiddenException(
      'You do not have permission to access contests.',
    );
  }
}
