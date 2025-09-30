import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Problem } from '../../entities/problem.entity';

@Entity({ name: 'testcase_samples' })
export class TestcaseSample {
  @PrimaryColumn('uuid', {
    nullable: false,
    name: 'testcase_sample_id',
  })
  @Generated('uuid')
  id: string;

  @ManyToOne(() => Problem, (problem) => problem.testcaseSamples)
  @JoinColumn({ name: 'problem_id' })
  @Index()
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
