import { Problem } from 'src/modules/problems/entities/problem.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Contest } from './contest.entity';

@Entity({ name: 'contest_problems' })
@Index(['contestId', 'problemId'], { unique: true })
export class ContestProblem {
  @PrimaryGeneratedColumn('increment', { name: 'contest_problem_id' })
  id: number;

  @Column('int', { name: 'contest_id' })
  contestId: number;

  @ManyToOne(() => Contest, (contest) => contest.contestProblems)
  @JoinColumn({ name: 'contest_id' })
  contest: Contest;

  @Column('int', { name: 'problem_id' })
  problemId: number;

  @ManyToOne(() => Problem, (problem) => problem.contestProblems)
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column({ type: 'int', nullable: false })
  score: number;
}
