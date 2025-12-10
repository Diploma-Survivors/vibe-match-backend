import { LtiDeployment } from 'src/modules/lti/entities/lti-deployment.entity';
import { Tenant } from 'src/modules/user/entities/tenant.entity';
import { TenantType } from 'src/modules/user/enums/tenant-type.enum';
import { DataSource, DeepPartial, Equal, Repository } from 'typeorm';
import { LMS_TENANT_NAME, PLATFORM_TENANT_NAME } from './constants';

export async function seedLtiDeployments(dataSource: DataSource) {
  const ltiDeploymentRepository = dataSource.getRepository(LtiDeployment);
  const tenantRepository = dataSource.getRepository(Tenant);

  await Promise.all([
    createLtiDeploymentIfNotExists(
      ltiDeploymentRepository,
      tenantRepository,
      {
        name: LMS_TENANT_NAME,
        type: TenantType.LMS,
      },
      {
        name: 'Moodle - VibeMatch Deployment',
        issuerUrl: process.env.LTI_PLATFORM_ID!,
        clientId: process.env.LTI_CLIENT_ID!,
        deploymentId: process.env.LTI_DEPLOYMENT_ID!,
        authenticationUrl: process.env.LTI_AUTHENTICATION_REQUEST_URL!,
        jwksUrl: process.env.LTI_PUBLIC_KEYSET_URL!,
        tokenUrl: process.env.LTI_ACCESS_TOKEN_URL!,
      },
    ),
    createLtiDeploymentIfNotExists(ltiDeploymentRepository, tenantRepository, {
      name: PLATFORM_TENANT_NAME,
      type: TenantType.PLATFORM,
    }),
  ]);
}

async function createLtiDeploymentIfNotExists(
  ltiRepos: Repository<LtiDeployment>,
  tenantRepos: Repository<Tenant>,
  tenant: DeepPartial<Tenant>,
  deploymentData?: DeepPartial<LtiDeployment>,
) {
  let existingTenant = await tenantRepos.findOne({
    where: { name: Equal(tenant.name as string) },
  });
  existingTenant ??= await tenantRepos.save(tenant);

  if (!deploymentData) return;

  let existingDeployment = await ltiRepos.findOne({
    where: {
      tenantId: existingTenant.id,
      name: deploymentData.name,
    },
  });
  existingDeployment ??= await ltiRepos.save({
    ...deploymentData,
    tenant: existingTenant,
  });
}
