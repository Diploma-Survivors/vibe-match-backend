import { Course } from 'src/modules/course/entities/course.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Problem } from './problem.entity';

@Entity({ name: 'course_problems' })
@Index(['courseId', 'problemId'], { unique: true })
export class CourseProblem {
  @PrimaryGeneratedColumn('increment', { name: 'course_problem_id' })
  id: number;

  @Column('int', { name: 'course_id' })
  courseId: number;

  @ManyToOne(() => Course, (course) => course.courseProblems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column('int', { name: 'problem_id' })
  problemId: number;

  @ManyToOne(() => Problem, (problem) => problem.courseProblems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;
}
