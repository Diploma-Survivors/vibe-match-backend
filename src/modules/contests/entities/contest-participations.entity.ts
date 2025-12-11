import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Submission } from '../../submission/entities/submission.entity';
import { User } from '../../user/entities/user.entity';
import { Contest } from './contest.entity';
import { ContestProblemResult } from './contest-problem-result.entity';

@Entity()
@Index('uq_participation_contest_user', ['contest', 'user'], { unique: true }) // search participation by contest and user
export class ContestParticipation {
  @PrimaryGeneratedColumn('increment', { name: 'contest_participation_id' })
  id: number;

  @Column({ name: 'contest_id' })
  contestId: number;

  @ManyToOne(() => Contest, (contest) => contest.contestParticipation)
  @JoinColumn({ name: 'contest_id' })
  contest: Contest;

  @ManyToOne(() => User) // unidirectional relationship
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'start_time' })
  startTime: Date;

  @Column({
    type: 'timestamp with time zone',
    name: 'end_time',
    nullable: true,
  })
  endTime: Date | null;

  @Column({
    type: 'timestamp with time zone',
    name: 'finished_at',
    nullable: true,
  })
  finishedAt: Date | null;

  @Column({ name: 'final_score', type: 'float', nullable: true })
  finalScore: number;

  @OneToMany(() => Submission, (submission) => submission.contestParticipation)
  submissions: Submission[];

  @OneToMany(
    () => ContestProblemResult,
    (result) => result.contestParticipation,
  )
  problemResults: ContestProblemResult[];
}
