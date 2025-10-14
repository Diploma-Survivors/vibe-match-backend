import { AppDataSource } from '../data-source';
import { seedTags } from './tag.seed';
import { seedTopics } from './topic.seed';

async function runSeeds() {
  const dataSource = await AppDataSource.initialize();

  try {
    await seedTags(dataSource);
    await seedTopics(dataSource);

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Error running seeds:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

void runSeeds();
