import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Level } from '../enums/level.enum';
import { Submission } from '../../submission/entities/submission.entity';
import { ProblemProperties } from './problem-properties.entity';
import { TestCase } from '../../testcase/entities/testcase.entity';

@Entity()
export class Problem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('text')
  inputDescription: string;

  @Column('text')
  outputDescription: string;

  @Column('text')
  examples: string;

  // @ManyToOne(() => ProblemType, (problem) => problem.id)
  // problem: ProblemType;

  @OneToOne(() => User, (user) => user.problems)
  user: User;

  @Column({
    type: 'enum',
    enum: Level,
  })
  level: Level;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Submission, (submission) => submission.problem)
  submissions: Submission[];

  @OneToMany(() => TestCase, (testCase) => testCase.problem, {
    cascade: true,
    onDelete: 'CASCADE', // DB enforces cascade delete if done outside TypeORM
    orphanedRowAction: 'delete',
  })
  testCases: TestCase[];

  @OneToOne(
    () => ProblemProperties,
    (problemProperties) => problemProperties.problem,
    {
      cascade: true,
      onDelete: 'CASCADE',
      orphanedRowAction: 'delete',
    },
  )
  problemProperties: ProblemProperties;

  @Column({ type: 'boolean', default: false })
  isPrivate: boolean;
}
