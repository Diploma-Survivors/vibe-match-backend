import { Course } from 'src/modules/course/entities/course.entity';
import { LtiDeployment } from 'src/modules/lti/entities/lti-deployment.entity';
import { Tenant } from 'src/modules/user/entities/tenant.entity';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import {
  DEFAULT_COURSE_NAME_IN_PLATFORM_TENANT,
  LMS_TENANT_NAME,
  PLATFORM_TENANT_NAME,
} from './constants';

export async function updateCourseSeed(dataSource: DataSource) {
  const tenantRepos = dataSource.getRepository(Tenant);
  const courseRepos = dataSource.getRepository(Course);
  const ltiDeploymentRepos = dataSource.getRepository(LtiDeployment);

  await updateCourseOfPlatformTenant(tenantRepos, courseRepos);
  await updateCourseOfLMSTenant(tenantRepos, courseRepos, ltiDeploymentRepos);
}

export async function updateCourseOfLMSTenant(
  tenantRepos: Repository<Tenant>,
  courseRepos: Repository<Course>,
  ltiDeploymentRepos: Repository<LtiDeployment>,
) {
  const tenant = await tenantRepos.findOne({
    where: { name: LMS_TENANT_NAME },
  });
  if (!tenant) {
    console.warn(`Tenant with name ${LMS_TENANT_NAME} not found.`);
    return;
  }

  const ltiDeployment = await ltiDeploymentRepos.findOne({
    where: {
      tenantId: tenant.id,
      issuerUrl: process.env.LTI_PLATFORM_ID,
      clientId: process.env.LTI_CLIENT_ID,
      deploymentId: process.env.LTI_DEPLOYMENT_ID,
    },
  });
  if (!ltiDeployment) {
    console.warn(`LTI Deployment not found for tenant ${LMS_TENANT_NAME}.`);
    return;
  }

  await courseRepos.update(
    {
      tenantId: IsNull(),
      ltiDeploymentId: IsNull(),
      ltiCourseId: Not(IsNull()),
    },
    {
      tenant,
      ltiDeployment,
    },
  );
}

export async function updateCourseOfPlatformTenant(
  tenantRepos: Repository<Tenant>,
  courseRepos: Repository<Course>,
) {
  const tenant = await tenantRepos.findOne({
    where: { name: PLATFORM_TENANT_NAME },
  });
  if (!tenant) {
    console.warn(`Tenant with name ${PLATFORM_TENANT_NAME} not found.`);
    return;
  }

  const course = await courseRepos.findOne({
    where: {
      title: DEFAULT_COURSE_NAME_IN_PLATFORM_TENANT,
      ltiCourseId: IsNull(),
    },
  });
  if (!course) {
    await courseRepos.insert({
      title: DEFAULT_COURSE_NAME_IN_PLATFORM_TENANT,
      tenant,
    });
  }
}
