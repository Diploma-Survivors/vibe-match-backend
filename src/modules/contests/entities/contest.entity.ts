// Third-party
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Relative imports
import { Course } from 'src/modules/course/entities/course.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { DeadlineEnforcement } from '../enums/deadline-enforcement.enum';
import { ContestParticipation } from './contest-participations.entity';
import { ContestProblem } from './contest-problem.entity';

@Entity({
  name: 'contests',
})
@Index('idx_contest_created_at_id', ['createdAt', 'id'])
@Index('idx_contest_name_id', ['name', 'id'])
@Index('idx_contest_start_time_id', ['startTime', 'id'])
@Index('idx_contest_end_time_id', ['endTime', 'id'])
export class Contest {
  @PrimaryGeneratedColumn('increment', { name: 'contest_id' })
  id: number;

  @Column('varchar')
  name: string;

  @Column('varchar')
  description: string;

  @Column('timestamp with time zone', { name: 'start_time', precision: 3 })
  startTime: Date;

  @Column('timestamp with time zone', { name: 'end_time', precision: 3 })
  endTime: Date;

  // null means no late submission allowed (if limited duration it must be null)
  @Column('timestamp with time zone', {
    name: 'late_deadline',
    precision: 3,
    nullable: true,
  })
  lateDeadline: Date | null;

  // null means unlimited
  @Column('int', { name: 'duration_minutes', nullable: true })
  durationMinutes: number | null;

  /**
   * Submission rules:
   * - With durationMinutes:
   *   - STRICT: deadline = endTime
   *   - FLEXIBLE: submissions allowed until startTime (join contest) + durationMinutes
   * - Without durationMinutes:
   *   - STRICT: deadline = endTime
   *   - FLEXIBLE: submissions allowed until lateDeadline (marked late if after endTime)
   */
  @Column('enum', {
    name: 'deadline_enforcement',
    enum: DeadlineEnforcement,
    default: DeadlineEnforcement.STRICT,
  })
  deadlineEnforcement: DeadlineEnforcement;

  @Index('idx_contest_course_id', { unique: false })
  @Column('int', { name: 'course_id' })
  courseId: number;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Index('idx_contest_author_id', { unique: false })
  @Column('int', { name: 'author_id' })
  authorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @OneToMany(() => ContestProblem, (contestProblem) => contestProblem.contest, {
    cascade: true,
  })
  contestProblems: ContestProblem[];

  @OneToMany(
    () => ContestParticipation,
    (participation) => participation.contest,
    {
      cascade: true,
    },
  )
  contestParticipation: ContestParticipation[];

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
  @Index('IDX_Contests_TSV', { synchronize: false })
  tsv: string;
}
