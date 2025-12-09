import { ApiProperty } from '@nestjs/swagger';
import { LtiDeployment } from 'src/modules/lti/entities/lti-deployment.entity';
import { CourseProblem } from 'src/modules/problems/entities/course-problem.entity';
import { Tenant } from 'src/modules/user/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@Unique(['ltiCourseId', 'ltiDeploymentId'])
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
  @Column({ type: 'varchar', nullable: true })
  ltiCourseId: string | null;

  @ApiProperty({
    description: 'Tenant ID',
    example: 1,
  })
  @Column({ name: 'tenant_id' })
  tenantId: number;

  @ApiProperty({
    description: 'Tenant associated with the course',
    type: () => Tenant,
    nullable: true,
  })
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ApiProperty({
    description: 'LTI Deployment ID associated with the course',
    example: 1,
    nullable: true,
  })
  @Column({ name: 'lti_deployment_id', nullable: true })
  ltiDeploymentId: number | null;

  @ApiProperty({
    description: 'LTI Deployment associated with the course',
    type: () => LtiDeployment,
    nullable: true,
  })
  @ManyToOne(() => LtiDeployment, { nullable: true })
  @JoinColumn({ name: 'lti_deployment_id' })
  ltiDeployment: LtiDeployment | null;

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
