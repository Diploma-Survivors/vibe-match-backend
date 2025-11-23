import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Problem } from '../../problems/entities/problem.entity';
import { ProblemStatus } from '../enums/problem-status.enum';
import { ContestParticipation } from './contest-participations.entity';

@Entity()
@Unique(['contestParticipation', 'problem'])
export class ContestProblemResult {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ManyToOne(
    () => ContestParticipation,
    (participation) => participation.problemResults,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'contest_participation_id' })
  contestParticipation: ContestParticipation;

  @ManyToOne(() => Problem)
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column({ type: 'float', default: 0 })
  score: number;

  @Column({
    type: 'enum',
    enum: ProblemStatus,
    default: ProblemStatus.UNATTEMPTED,
  })
  status: ProblemStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
