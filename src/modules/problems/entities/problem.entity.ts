import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DifficultyLevel } from '../enums/difficulty-level.enum';
import { User } from 'src/modules/user/entities/user.entity';
import { Tag } from '../tags/entities/tag.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Testcase } from '../testcases/entities/testcase.entity';
import { TestcaseSample } from '../testcases/entities/testcase-sample.entity';

@Entity({
  name: 'problems',
})
export class Problem {
  @PrimaryColumn('uuid', { nullable: false, name: 'problem_id' })
  @Generated('uuid')
  id: string;

  @Column('nvarchar')
  title: string;

  @Column('nvarchar', { name: 'problem_description' })
  description: string;

  @Column('nvarchar', { name: 'input_description' })
  inputDescription: string;

  @Column('nvarchar', { name: 'output_description' })
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
  })
  difficulty: DifficultyLevel;

  //   courseId: string;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @ManyToMany(() => Tag, (tag) => tag.id)
  @JoinTable({ name: 'problem_tags' })
  tags: Tag[];

  @ManyToMany(() => Topic, (topic) => topic.id)
  @JoinTable({ name: 'problem_topics' })
  topics: Topic[];

  @OneToOne(() => Testcase, (testcase) => testcase.id)
  @JoinColumn({ name: 'testcase_id' })
  testcase: Testcase;

  @OneToMany(() => TestcaseSample, (testcaseSample) => testcaseSample.id, {
    cascade: true,
  })
  testcaseSamples: TestcaseSample[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
