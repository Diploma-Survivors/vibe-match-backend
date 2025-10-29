import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContestParticipation } from '../../contests/entities/contest-participations.entity';
import { Language } from '../../language/entities/language.entity';
import { Problem } from '../../problems/entities/problem.entity';
import { User } from '../../user/entities/user.entity';
import { SubmissionStatus } from '../enums/submission-status.enum';
import { ResultDescription } from '../dto/result-description.dto';
import { LtiLaunchSession } from '../../lti/entities/lti-launch-session.entity';

@Entity()
@Index('idx_submission_user', ['user']) // search submissions by user
@Index('idx_submission_contest_problem', ['contestParticipation', 'problem']) // search submisisons of 1 user in a contest participation by problem
export class Submission {
  @PrimaryGeneratedColumn('increment', { name: 'submission_id' })
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Problem)
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @ManyToOne(
    () => ContestParticipation,
    (contestParticipation) => contestParticipation.submissions,
    { nullable: true },
  )
  @JoinColumn({ name: 'contest_participation_id' })
  contestParticipation: ContestParticipation | null;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.PENDING,
  })
  status: SubmissionStatus;

  @Column({ type: 'float', nullable: true })
  score: number;

  @Column({ type: 'float', nullable: true })
  runtime: number;

  @Column({ type: 'float', nullable: true })
  memory: number;

  @ManyToOne(() => Language)
  @JoinColumn({ name: 'language_id' })
  language: Language;

  @Column({ name: 'source_code', type: 'text', nullable: true })
  sourceCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'file_url', type: 'varchar', nullable: true })
  fileUrl: string | null;

  @Column({ name: 'total_tests', type: 'int', nullable: true })
  totalTests: number;

  @Column({ name: 'passed_tests', type: 'int', nullable: true })
  passedTests: number;

  @Column({ nullable: true })
  note: string;

  @Column({
    name: 'result_description',
    type: 'json',
    nullable: true,
  })
  resultDescription: ResultDescription;

  @ManyToOne(() => LtiLaunchSession, { nullable: true })
  @JoinColumn({ name: 'lti_launch_session_id' })
  ltiLaunchSession: LtiLaunchSession | null;

  @Column({ name: 'ags_grade_sent', type: 'boolean', default: false })
  agsGradeSent: boolean;

  @Column({ name: 'ags_grade_sent_at', type: 'timestamp', nullable: true })
  agsGradeSentAt: Date | null;

  @Column({ name: 'ags_error', type: 'text', nullable: true })
  agsError: string | null;
}
