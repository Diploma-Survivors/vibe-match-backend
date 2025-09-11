import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { RoleEnum } from '../../user/enums/role.enum';

@Entity()
@Unique(['userId', 'courseId'])
export class UserCourse {
  @ApiProperty({
    description: 'UserCourse unique identifier',
    example: 'uuid-v4-string',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: 'uuid-v4-string',
  })
  @Column()
  userId: string;

  @ApiProperty({
    description: 'Course ID',
    example: 'uuid-v4-string',
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
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  enrolledAt: Date;
}
