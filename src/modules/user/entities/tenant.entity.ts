import { LtiDeployment } from 'src/modules/lti/entities/lti-deployment.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantType } from '../enums/tenant-type.enum';

@Entity({ name: 'tenants' })
export class Tenant {
  @PrimaryGeneratedColumn('increment', { name: 'tenant_id' })
  id: number;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'enum', enum: TenantType, default: TenantType.LMS })
  type: TenantType;

  @OneToMany(() => LtiDeployment, (ltiDeployment) => ltiDeployment.tenant, {
    cascade: true,
  })
  ltiDeployments: LtiDeployment[];

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;
}
