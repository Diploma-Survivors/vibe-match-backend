import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveHybridProblem1761834798853 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        UPDATE problems
        SET type = 'standalone'
        WHERE type = 'hybrid';
    `);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async down(): Promise<void> {
    console.log(
      'Down migration not implemented for RemoveHybridProblem1761834798853',
    );
  }
}
