import { ContestProblem } from 'src/modules/contests/entities/contest-problem.entity';
import { User } from 'src/modules/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DifficultyLevel } from '../enums/difficulty-level.enum';
import { ProblemType } from '../enums/problem-type.enum';
import { TestcaseSample } from '../testcases/entities/testcase-sample.entity';
import { Testcase } from '../testcases/entities/testcase.entity';
import { CourseProblem } from './course-problem.entity';
import { ProblemTag } from './problem-tag.entity';
import { ProblemTopic } from './problem-topic.entity';

@Entity({
  name: 'problems',
})
@Index('idx_problem_created_at', ['createdAt', 'id'])
@Index('idx_problem_title', ['title', 'id'])
export class Problem {
  @PrimaryColumn('uuid', { nullable: false, name: 'problem_id' })
  @Generated('uuid')
  id: string;

  @Index({ unique: false, fulltext: true })
  @Column('varchar')
  title: string;

  @Column('varchar', { name: 'problem_description' })
  description: string;

  @Column('varchar', { name: 'input_description' })
  inputDescription: string;

  @Column('varchar', { name: 'output_description' })
  outputDescription: string;

  @Column('int2', { name: 'max_score' })
  maxScore: number;

  @Column('float', { name: 'time_limit_ms' })
  timeLimitMs: number;

  @Column('float', { name: 'memory_limit_kb' })
  memoryLimitKb: number;

  @Column('enum', {
    name: 'difficulty',
    default: DifficultyLevel.EASY,
    enum: DifficultyLevel,
  })
  difficulty: DifficultyLevel;

  @Column('enum', {
    name: 'type',
    default: ProblemType.STANDALONE,
    enum: ProblemType,
  })
  type: ProblemType;

  @OneToMany(() => CourseProblem, (courseProblem) => courseProblem.problem, {
    cascade: true,
  })
  courseProblems: CourseProblem[];

  @Index({ unique: false })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @OneToMany(() => ProblemTag, (problemTag) => problemTag.problem, {
    cascade: true,
  })
  problemTags: ProblemTag[];

  @OneToMany(() => ProblemTopic, (problemTopic) => problemTopic.problem, {
    cascade: true,
  })
  problemTopics: ProblemTopic[];

  @Index()
  @OneToOne(() => Testcase, (testcase) => testcase.problem, { cascade: true })
  @JoinColumn({ name: 'testcase_id' })
  testcase: Testcase;

  @OneToMany(() => TestcaseSample, (testcaseSample) => testcaseSample.problem, {
    cascade: true,
  })
  testcaseSamples: TestcaseSample[];

  @OneToMany(() => ContestProblem, (contestProblem) => contestProblem.problem, {
    nullable: true,
  })
  contestProblems: ContestProblem[] | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    precision: 3,
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
    precision: 3,
  })
  updatedAt: Date;

  @Column('tsvector', { select: false, nullable: true })
  @Index('IDX_Problems_TSV', { fulltext: true })
  tsv: string;
}
