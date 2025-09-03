import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
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

  @ManyToOne(() => Problem, (problem) => problem.id)
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column('text')
  input: string;

  @Column('text')
  output: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
