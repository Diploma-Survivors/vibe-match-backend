// Third-party
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Relative imports
import { Problem } from '../../entities/problem.entity';

@Entity({ name: 'testcase_samples' })
export class TestcaseSample {
  @PrimaryGeneratedColumn('increment', { name: 'testcase_sample_id' })
  id: number;

  @Index('idx_testcase_sample_problem_id')
  @Column('int', { name: 'problem_id' })
  problemId: number;

  @ManyToOne(() => Problem, (problem) => problem.testcaseSamples)
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column('text')
  input: string;

  @Column('text')
  output: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
