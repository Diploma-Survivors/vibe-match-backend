import { ApiProperty } from '@nestjs/swagger';
import { CourseProblem } from 'src/modules/problems/entities/course-problem.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@Unique(['ltiCourseId', 'ltiPlatformId'])
export class Course {
  @ApiProperty({
    description: 'Course unique identifier',
    example: 1,
  })
  @PrimaryGeneratedColumn('increment', { name: 'course_id' })
  id: number;

  @ApiProperty({
    description: 'LTI Course ID from the LTI Platform',
    example: 'some-unique-course-id',
  })
  @Column({ type: 'varchar' })
  ltiCourseId: string;

  @ApiProperty({
    description: 'LTI Platform ID (issuer URL)',
    example: 'http://localhost:8888',
  })
  @Column({ type: 'varchar' })
  ltiPlatformId: string;

  @ApiProperty({
    description: 'Course title',
    example: 'Data Structures and Algorithms',
    nullable: true,
  })
  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @ApiProperty({
    description: 'Course description',
    example: 'An in-depth course on data structures and algorithms.',
    nullable: true,
  })
  @OneToMany(() => CourseProblem, (courseProblem) => courseProblem.course, {
    cascade: true,
    nullable: true,
  })
  courseProblems: CourseProblem[];

  @ApiProperty({
    description: 'Course creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @ApiProperty({
    description: 'Course last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
