import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSubmissionStrategyToProblem1730000003000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add submission_strategy column
    await queryRunner.addColumn(
      'problems',
      new TableColumn({
        name: 'submission_strategy',
        type: 'varchar',
        length: '50',
        default: "'BEST_SCORE'",
        isNullable: false,
      }),
    );

    // Add max_attempts column
    await queryRunner.addColumn(
      'problems',
      new TableColumn({
        name: 'max_attempts',
        type: 'int',
        isNullable: true,
      }),
    );

    // Add show_submission_count column
    await queryRunner.addColumn(
      'problems',
      new TableColumn({
        name: 'show_submission_count',
        type: 'boolean',
        default: true,
        isNullable: false,
      }),
    );

    // Create index on submission_strategy
    await queryRunner.query(`
      CREATE INDEX idx_problem_strategy 
      ON problems(submission_strategy)
    `);

    // Add check constraint for submission_strategy
    await queryRunner.query(`
      ALTER TABLE problems
      ADD CONSTRAINT chk_submission_strategy
      CHECK (submission_strategy IN (
        'SINGLE_SUBMISSION',
        'BEST_SCORE',
        'LATEST_SCORE',
        'AVERAGE_SCORE'
      ))
    `);

    // Add check constraint for max_attempts
    await queryRunner.query(`
      ALTER TABLE problems
      ADD CONSTRAINT chk_max_attempts
      CHECK (max_attempts IS NULL OR max_attempts >= 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop constraints
    await queryRunner.query(`
      ALTER TABLE problems DROP CONSTRAINT IF EXISTS chk_max_attempts
    `);

    await queryRunner.query(`
      ALTER TABLE problems DROP CONSTRAINT IF EXISTS chk_submission_strategy
    `);

    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS idx_problem_strategy`);

    // Drop columns
    await queryRunner.dropColumn('problems', 'show_submission_count');
    await queryRunner.dropColumn('problems', 'max_attempts');
    await queryRunner.dropColumn('problems', 'submission_strategy');
  }
}
