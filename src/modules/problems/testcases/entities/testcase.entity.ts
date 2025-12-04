// Third-party
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Relative imports
import { Problem } from '../../entities/problem.entity';

@Entity({ name: 'testcases' })
export class Testcase {
  @PrimaryGeneratedColumn('increment', { name: 'testcase_id' })
  id: number;

  @Column({ name: 'key_s3' })
  keyS3: string;

  @Column({ name: 'testcase_count', default: 0 })
  testcaseCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @Index('idx_testcase_problem_id', { unique: true })
  @Column('int', { name: 'problem_id' })
  problemId: number;

  @OneToOne(() => Problem, (problem) => problem.testcase)
  problem: Problem;
}
