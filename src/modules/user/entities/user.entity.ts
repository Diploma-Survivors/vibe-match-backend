import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  OneToMany,
} from 'typeorm';
import { AuthTypeEnum } from '../enums/auth-type.enum';
import { RoleEnum } from '../enums/role.enum';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';

@Entity()
@Unique(['ltiSubjectId', 'ltiPlatformId'])
export class User {
  @ApiProperty({
    description: 'User unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  id: string;

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
    description: 'User roles',
    example: [RoleEnum.STUDENT],
    enum: RoleEnum,
    isArray: true,
  })
  @Column('simple-array', { nullable: true })
  roles: RoleEnum[];

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
    description: 'Refresh tokens associated with this user',
    type: () => [RefreshToken],
    nullable: true,
  })
  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

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
}
