import { LtiDeployment } from 'src/modules/lti/entities/lti-deployment.entity';
import { LtiLaunchSession } from 'src/modules/lti/entities/lti-launch-session.entity';
import { DataSource, IsNull } from 'typeorm';

export async function updateLtiLaunchSession(dataSource: DataSource) {
  const ltiDeploymentRepos = dataSource.getRepository(LtiDeployment);
  const ltiLaunchSessionRepos = dataSource.getRepository(LtiLaunchSession);

  const ltiDeployment = await ltiDeploymentRepos.findOne({
    where: {
      issuerUrl: process.env.LTI_PLATFORM_ID,
      clientId: process.env.LTI_CLIENT_ID,
      deploymentId: process.env.LTI_DEPLOYMENT_ID,
    },
  });
  if (!ltiDeployment) {
    console.error('Please run lti deployment seed first');
    return;
  }

  await ltiLaunchSessionRepos.update(
    {
      ltiDeploymentId: IsNull(),
    },
    {
      ltiDeployment: ltiDeployment,
    },
  );
}
