import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { RoleEnum } from '../../user/enums/role.enum';

@Entity()
@Unique(['userId', 'courseId'])
export class UserCourse {
  @ApiProperty({
    description: 'UserCourse unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid', { name: 'user_course_id' })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column()
  userId: string;

  @ApiProperty({
    description: 'Course ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column()
  courseId: string;

  @ApiProperty({
    description: 'Roles of the user in this course',
    enum: RoleEnum,
    isArray: true,
    example: [RoleEnum.STUDENT],
  })
  @Column('simple-array', { nullable: true })
  rolesInCourse: RoleEnum[];

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Course, (course) => course.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @ApiProperty({
    description: 'Enrollment timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @CreateDateColumn()
  enrolledAt: Date;
}
