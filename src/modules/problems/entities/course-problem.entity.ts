import { Course } from 'src/modules/course/entities/course.entity';
import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Problem } from './problem.entity';

@Entity({ name: 'course_problems' })
@Index(['course', 'problem'], { unique: true })
export class CourseProblem {
  @PrimaryGeneratedColumn('uuid', { name: 'course_problem_id' })
  id: string;

  @ManyToOne(() => Course, (course) => course.courseProblems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => Problem, (problem) => problem.courseProblems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;
}
