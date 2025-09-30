import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFTSIndexProblems1759025592703 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS unaccent;');

    await queryRunner.query(
      'ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "tsv" tsvector;',
    );

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION problems_tsv_trigger() RETURNS trigger AS $$
      BEGIN
        NEW.tsv :=
          to_tsvector(
            'simple',
            unaccent(coalesce(NEW.title, '') || ' ' || coalesce(NEW.problem_description, ''))
          );
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER tsv_update
      BEFORE INSERT OR UPDATE ON "problems"
      FOR EACH ROW
      EXECUTE FUNCTION problems_tsv_trigger();
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_Problems_TSV" ON "problems" USING gin ("tsv");',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_Problems_TSV";');
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS "tsv_update" ON "problems";',
    );
    await queryRunner.query('DROP FUNCTION IF EXISTS "problems_tsv_trigger";');
    await queryRunner.query(
      'ALTER TABLE "problems" DROP COLUMN IF EXISTS "tsv";',
    );
  }
}
