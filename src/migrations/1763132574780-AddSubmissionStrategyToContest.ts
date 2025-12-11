import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubmissionStrategyToContest1763132574780
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type if not exists
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contests_submission_strategy_enum" AS ENUM(
          'SINGLE_SUBMISSION',
          'BEST_SCORE',
          'LATEST_SCORE',
          'AVERAGE_SCORE'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add submission_strategy column to contests table
    await queryRunner.query(`
      ALTER TABLE "contests"
      ADD COLUMN "submission_strategy" "contests_submission_strategy_enum"
      NOT NULL DEFAULT 'BEST_SCORE'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove submission_strategy column
    await queryRunner.query(`
      ALTER TABLE "contests"
      DROP COLUMN "submission_strategy"
    `);

    // Drop enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS "contests_submission_strategy_enum"
    `);
  }
}
