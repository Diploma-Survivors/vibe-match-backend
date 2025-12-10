import { AppDataSource } from '../data-source';
import { seedLtiDeployments } from './lti-deployment.seed';
import { seedProblems } from './problem.seed';
import { seedTags } from './tag.seed';
import { seedTopics } from './topic.seed';
import { updateCourseSeed } from './update-course.seed';
import { updateLtiLaunchSession } from './update-lti-launch-session.seed';
import { updateUserSeed } from './update-user.seed';

async function runSeeds() {
  const dataSource = await AppDataSource.initialize();

  try {
    await seedTags(dataSource);
    await seedTopics(dataSource);
    await seedProblems(dataSource);
    await seedLtiDeployments(dataSource);
    await updateUserSeed(dataSource);
    await updateCourseSeed(dataSource);
    await updateLtiLaunchSession(dataSource);

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Error running seeds:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

void runSeeds();
