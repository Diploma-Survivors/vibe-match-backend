import { AppDataSource } from '../data-source';
import { seedProblems } from './problem.seed';
import { seedTags } from './tag.seed';
import { seedTopics } from './topic.seed';

async function runSeeds() {
  const dataSource = await AppDataSource.initialize();

  try {
    await seedTags(dataSource);
    await seedTopics(dataSource);
    await seedProblems(dataSource);

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Error running seeds:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

void runSeeds();
