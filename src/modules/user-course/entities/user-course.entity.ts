import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { User } from '../../user/entities/user.entity';
import { RoleEnum } from '../../user/enums/role.enum';

@Entity()
@Unique(['userId', 'courseId'])
export class UserCourse {
  @ApiProperty({
    description: 'UserCourse unique identifier',
    example: 1,
  })
  @PrimaryGeneratedColumn('increment', { name: 'user_course_id' })
  id: number;

  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  @Column()
  userId: number;

  @ApiProperty({
    description: 'Course ID',
    example: 1,
  })
  @Column()
  courseId: number;

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
