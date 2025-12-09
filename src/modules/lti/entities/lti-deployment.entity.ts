import { Tenant } from 'src/modules/user/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'lti_deployments' })
@Index('idx_iss_client_depl', ['issuerUrl', 'clientId', 'deploymentId'], {
  unique: true,
})
@Index('idx_tenant_id', ['tenantId'])
export class LtiDeployment {
  @PrimaryGeneratedColumn('increment', { name: 'lti_deployment_id' })
  id: number;

  @Column()
  name: string;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @ManyToOne(() => Tenant, (tenant) => tenant.ltiDeployments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'issuer_url' })
  issuerUrl: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ name: 'deployment_id' })
  deploymentId: string;

  @Column({ name: 'authentication_url' })
  authenticationUrl: string;

  @Column({ name: 'jwks_url' })
  jwksUrl: string;

  @Column({ name: 'token_url' })
  tokenUrl: string;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;
}
