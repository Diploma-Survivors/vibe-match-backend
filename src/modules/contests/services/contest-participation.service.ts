// NestJS
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Third-party
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

// Relative imports
import { Contest } from '../entities/contest.entity';
import { ContestParticipation } from '../entities/contest-participations.entity';
import { ParticipationStatusDto } from '../dto/participation-status.dto';
import { StartParticipationResponseDto } from '../dto/start-participation-response.dto';

@Injectable()
export class ContestParticipationService {
  constructor(
    @InjectRepository(ContestParticipation)
    private readonly participationRepository: Repository<ContestParticipation>,
  ) {}

  getParticipationStatus(
    participation: ContestParticipation,
    contest: Contest,
  ): ParticipationStatusDto {
    const now = new Date();
    let isActive = false;

    // Cannot be active if already finished
    if (participation.finishedAt) {
      isActive = false;
    } else if (contest.durationMinutes && participation.endTime) {
      const endTime = new Date(participation.endTime);
      isActive = now < endTime && now < contest.endTime;
    } else {
      isActive = now < contest.endTime;
    }

    return {
      participationId: participation.id,
      contestStartTime: contest.startTime,
      contestEndTime: contest.endTime,
      startTime: participation.startTime,
      endTime: participation.endTime,
      durationMinutes: contest.durationMinutes,
      isActive,
      finishedAt: participation.finishedAt,
      finalScore: participation.finalScore,
    };
  }

  @Transactional()
  async startParticipation(
    contest: Contest,
    userId: number,
  ): Promise<StartParticipationResponseDto> {
    const now = new Date();

    if (now < contest.startTime) {
      throw new BadRequestException('Contest has not started yet');
    }

    const deadline = contest.lateDeadline || contest.endTime;

    if (now > deadline) {
      throw new BadRequestException('Contest has already ended');
    }

    const existingParticipation = await this.participationRepository.findOne({
      where: {
        contest: { id: contest.id },
        user: { id: userId },
      },
    });

    if (existingParticipation) {
      throw new BadRequestException(
        'You have already started participating in this contest',
      );
    }

    let endTime: Date | null = null;
    if (contest.durationMinutes) {
      endTime = new Date(now.getTime() + contest.durationMinutes * 60 * 1000);
      if (endTime > contest.endTime) {
        endTime = contest.endTime;
      }
    }

    const participation = this.participationRepository.create({
      contest: { id: contest.id },
      user: { id: userId },
      startTime: now,
      endTime,
    });

    const savedParticipation =
      await this.participationRepository.save(participation);

    return {
      participationId: savedParticipation.id,
      contestId: contest.id,
      contestStartTime: contest.startTime,
      contestEndTime: contest.endTime,
      startTime: savedParticipation.startTime,
      endTime: savedParticipation.endTime,
      durationMinutes: contest.durationMinutes,
    };
  }

  async validateAccess(
    contestId: number,
    userId: number,
  ): Promise<ContestParticipation> {
    const participation = await this.participationRepository.findOne({
      where: {
        contest: { id: contestId },
        user: { id: userId },
      },
    });

    if (!participation) {
      throw new ForbiddenException(
        'You must start participating in the contest first',
      );
    }

    return participation;
  }

  async findOne(contestId: number, userId: number) {
    return this.participationRepository.findOne({
      where: {
        contest: { id: contestId },
        user: { id: userId },
      },
    });
  }

  @Transactional()
  async finishParticipation(
    contestId: number,
    userId: number,
  ): Promise<ContestParticipation> {
    const participation = await this.participationRepository.findOne({
      where: {
        contest: { id: contestId },
        user: { id: userId },
      },
      relations: ['contest'],
    });

    if (!participation) {
      throw new BadRequestException(
        'You have not started participating in this contest',
      );
    }

    if (participation.finishedAt) {
      throw new BadRequestException(
        'You have already finished this contest participation',
      );
    }

    const now = new Date();

    // Check if participation has already expired
    if (participation.endTime && now > participation.endTime) {
      throw new BadRequestException(
        'Your participation time has already expired',
      );
    }

    // Mark as finished
    participation.finishedAt = now;

    return this.participationRepository.save(participation);
  }

  /**
   * Lazily updates expired participations that haven't been marked as finished.
   * This is called when retrieving contest details to ensure finishedAt is set
   * for participations that have passed their endTime.
   */
  @Transactional()
  async lazyUpdateExpiredParticipation(
    contestId: number,
    userId: number,
  ): Promise<void> {
    const participation = await this.participationRepository.findOne({
      where: {
        contest: { id: contestId },
        user: { id: userId },
      },
    });

    if (!participation || participation.finishedAt) {
      // Already finished or doesn't exist
      return;
    }

    const now = new Date();

    // Check if participation has expired (endTime passed)
    if (participation.endTime && now > participation.endTime) {
      participation.finishedAt = participation.endTime;
      await this.participationRepository.save(participation);
    }
  }
}
