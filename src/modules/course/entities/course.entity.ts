import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity()
@Unique(['ltiCourseId', 'ltiPlatformId'])
export class Course {
  @ApiProperty({
    description: 'Course unique identifier',
    example: 1,
  })
  @PrimaryGeneratedColumn()
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
    description: 'Course creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ApiProperty({
    description: 'Course last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
