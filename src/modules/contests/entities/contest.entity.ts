import { Course } from 'src/modules/course/entities/course.entity';
import { User } from 'src/modules/user/entities/user.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
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

  @Column('timestamp', { name: 'start_time' })
  startTime: Date;

  @Column('timestamp', { name: 'end_time' })
  endTime: Date;

  @Column('int', { name: 'duration_minutes' })
  durationMinutes: number;

  @Column('enum', {
    enum: ContestStatus,
    default: ContestStatus.PRIVATE,
  })
  status: ContestStatus;

  @Index()
  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Index()
  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @OneToMany(() => ContestProblem, (contestProblem) => contestProblem.contest, {
    cascade: true,
  })
  contestProblems: ContestProblem[];
}
