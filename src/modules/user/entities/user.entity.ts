import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { AuthTypeEnum } from '../enums/auth-type.enum';
import { RoleEnum } from '../enums/role.enum';
import { Tenant } from './tenant.entity';

@Entity()
@Unique(['ltiSubjectId', 'tenantId'])
@Index('idx_user_tenant_id', ['tenantId'])
export class User {
  @ApiProperty({
    description: 'User unique identifier',
    example: 1,
  })
  @PrimaryGeneratedColumn('increment', { name: 'user_id' })
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
    description: 'Tenant ID',
    example: 1,
  })
  @Column({ name: 'tenant_id' })
  tenantId: number;

  @ApiProperty({
    description: 'Tenant associated with the user',
    type: () => Tenant,
    nullable: true,
  })
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

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
  @Column({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Column({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
