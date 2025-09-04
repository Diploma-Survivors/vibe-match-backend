import {
  Column,
  CreateDateColumn,
  Entity,
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
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  sourceCode: string;

  @ManyToOne(() => User, (user) => user.submissions)
  user: User;

  @ManyToOne(() => Problem, (problem) => problem.submissions)
  problem: Problem;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.PENDING,
  })
  status: SubmissionStatus;

  @Column({ type: 'float', nullable: true })
  runtime: number;

  @Column({ nullable: true })
  memoryUsed: number;

  @CreateDateColumn()
  submittedAt: Date;

  @OneToOne(() => Language, (language) => language.id)
  language: Language;

  @Column('text')
  sourceCode: string;

  @Column()
  fileUrl: string;
}
