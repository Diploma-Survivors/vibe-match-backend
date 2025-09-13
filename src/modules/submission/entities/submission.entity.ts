import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Problem } from '../../problems/entities/problem.entity';
import { SubmissionStatus } from '../enums/submission.enum';
import { Language } from '../language/language.entity';
import { User } from '../../user/entities/user.entity';

// TODO: missing contest participant id
@Entity()
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { nullable: true })
  sourceCode: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @ManyToOne(() => Problem)
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column({ name: 'problem_id' })
  problemId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  score: number;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.PENDING,
  })
  status: SubmissionStatus;

  @Column('jsonb', { nullable: true })
  results: any[];

  @Column({ nullable: true })
  ltiContextId: string;

  @Column({ nullable: true })
  resourceLinkId: string;

  @Column({ type: 'float', nullable: true })
  runtime: number;

  @Column({ nullable: true })
  memoryUsed: number;

  @CreateDateColumn()
  submittedAt: Date;

  @OneToOne(() => Language, (language) => language.id)
  language: Language;

  @Column()
  fileUrl: string;
}
