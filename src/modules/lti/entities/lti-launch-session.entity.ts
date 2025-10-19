import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Contest } from '../../contests/entities/contest.entity';
import { Problem } from '../../problems/entities/problem.entity';
import { User } from '../../user/entities/user.entity';

@Entity('lti_launch_sessions')
@Index('idx_lti_session_user_problem', ['user', 'problem'])
@Index('idx_lti_session_resource_link', ['resourceLinkId'])
@Index('idx_lti_session_expires', ['expiresAt'])
export class LtiLaunchSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'lti_user_id', type: 'varchar' })
  ltiUserId: string;

  @ManyToOne(() => Problem, { nullable: true })
  @JoinColumn({ name: 'problem_id' })
  problem: Problem | null;

  @ManyToOne(() => Contest, { nullable: true })
  @JoinColumn({ name: 'contest_id' })
  contest: Contest | null;

  @Column({ name: 'resource_link_id', type: 'varchar' })
  resourceLinkId: string;

  @Column({ name: 'context_id', type: 'varchar' })
  contextId: string;

  @Column({ name: 'ags_lineitem_url', type: 'varchar', nullable: true })
  agsLineitemUrl: string | null;

  @Column({ name: 'ags_scopes', type: 'simple-array', nullable: true })
  agsScopes: string[] | null;

  @Column({ name: 'deployment_id', type: 'varchar' })
  deploymentId: string;

  @Column({ name: 'platform_issuer', type: 'varchar' })
  platformIssuer: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt: Date;

  @Column({
    name: 'expires_at',
    type: 'timestamp with time zone',
  })
  expiresAt: Date;
}

