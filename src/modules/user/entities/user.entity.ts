import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { AuthTypeEnum } from '../enums/auth-type.enum';

@Entity()
@Unique(['ltiSubjectId', 'ltiPlatformId'])
export class User {
  @ApiProperty({
    description: 'User unique identifier',
    example: 1,
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    nullable: true,
  })
  @Column({ type: 'varchar', unique: false, nullable: true })
  email: string | null;

  @ApiProperty({
    description: 'User password (hashed)',
    example: 'hashedPassword123',
    nullable: true,
  })
  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    nullable: true,
  })
  @Column({ type: 'varchar', nullable: true })
  firstName: string | null;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    nullable: true,
  })
  @Column({ type: 'varchar', nullable: true })
  lastName: string | null;

  @ApiProperty({
    description: 'Authentication type (local or lti)',
    enum: AuthTypeEnum,
    example: AuthTypeEnum.LTI,
  })
  @Column({ type: 'enum', enum: AuthTypeEnum, default: AuthTypeEnum.LTI })
  authType: AuthTypeEnum;

  @ApiProperty({
    description: 'LTI Subject ID from the LTI Platform (unique per platform)',
    example: 'some-unique-sub-id',
    nullable: true,
  })
  @Column({ type: 'varchar', nullable: true })
  ltiSubjectId: string | null;

  @ApiProperty({
    description: 'LTI Platform ID (issuer URL)',
    example: 'http://localhost:8888',
    nullable: true,
  })
  @Column({ type: 'varchar', nullable: true })
  ltiPlatformId: string | null;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ApiProperty({
    description: 'User last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  // TODO: CONSIDER ABOUT PERFORMANCE
  @OneToMany(() => Submission, (submission) => submission.user)
  submissions: Submission[];

  // TODO: CONSIDER ABOUT PERFORMANCE
  @OneToMany(() => Problem, (problem) => problem.user)
  problems: Problem[];
}
