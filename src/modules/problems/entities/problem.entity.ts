import { Course } from 'src/modules/course/entities/course.entity';
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
import { TestcaseSample } from '../testcases/entities/testcase-sample.entity';
import { Testcase } from '../testcases/entities/testcase.entity';
import { ProblemTag } from './problem-tag.entity';
import { ProblemTopic } from './problem-topic.entity';

@Entity({
  name: 'problems',
})
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

  @Index()
  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Index()
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
