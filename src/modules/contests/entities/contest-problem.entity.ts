import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Contest } from './contest.entity';
import { Problem } from 'src/modules/problems/entities/problem.entity';

@Entity({ name: 'contest_problems' })
export class ContestProblem {
  @PrimaryGeneratedColumn('uuid', { name: 'contest_problem_id' })
  id: string;

  @ManyToOne(() => Contest, (contest) => contest.contestProblems)
  @JoinColumn({ name: 'contest_id' })
  contest: Contest;

  @ManyToOne(() => Problem, (problem) => problem.contestProblems)
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column({ type: 'int', nullable: false })
  score: number;
}
