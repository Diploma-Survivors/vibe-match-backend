import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Problem } from '../../entities/problem.entity';

@Entity({ name: 'testcases' })
export class Testcase {
  @PrimaryColumn('uuid', {
    nullable: false,
    name: 'testcase_id',
  })
  @Generated('uuid')
  id: string;

  @Column('text', { nullable: false })
  fileUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Problem, (problem) => problem.testcase)
  problem: Problem;
}
