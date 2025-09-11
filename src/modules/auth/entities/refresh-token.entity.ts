import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity()
export class RefreshToken {
  @ApiProperty({
    description: 'Refresh Token unique identifier',
    example: 1,
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'The hashed refresh token string',
    example: 'hashed-token-string',
  })
  @Column({ type: 'varchar', length: 500, unique: true })
  token: string;

  @ApiProperty({
    description: 'User ID associated with this refresh token',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({
    description: 'Refresh token expiration timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @ApiProperty({
    description: 'Timestamp when the refresh token was revoked, if any',
    example: '2024-01-01T00:00:00.000Z',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @ApiProperty({
    description: 'Refresh token creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ApiProperty({
    description: 'Refresh token last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
