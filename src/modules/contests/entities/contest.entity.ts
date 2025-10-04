import { Course } from 'src/modules/course/entities/course.entity';
import { User } from 'src/modules/user/entities/user.entity';
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
import { ContestStatus } from '../enums/contest-status.enum';
import { ContestProblem } from './contest-problem.entity';

@Entity({
  name: 'contests',
})
export class Contest {
  @PrimaryGeneratedColumn('uuid', { name: 'contest_id' })
  id: string;

  @Column('varchar')
  name: string;

  @Column('varchar')
  description: string;

  @Column('timestamp with time zone', { name: 'start_time', precision: 3 })
  startTime: Date;

  @Column('timestamp with time zone', { name: 'end_time', precision: 3 })
  endTime: Date;

  @Column('int', { name: 'duration_minutes', nullable: true })
  durationMinutes: number;

  @Column('enum', {
    enum: ContestStatus,
    default: ContestStatus.PRIVATE,
  })
  status: ContestStatus;

  @Index({ unique: false })
  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Index({ unique: false })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @OneToMany(() => ContestProblem, (contestProblem) => contestProblem.contest, {
    cascade: true,
  })
  contestProblems: ContestProblem[];

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
}
