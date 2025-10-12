import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFTSIndexContest1759590069809 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS unaccent;');

    await queryRunner.query(
      'ALTER TABLE "contests" ADD COLUMN IF NOT EXISTS "tsv" tsvector;',
    );

    await queryRunner.query(`
        CREATE OR REPLACE FUNCTION contests_tsv_trigger() RETURNS trigger AS $$
        BEGIN
            NEW.tsv :=
                to_tsvector(
                    'simple',
                    unaccent(coalesce(NEW.name, '') || ' ' || coalesce(NEW.description, ''))
                );
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
        DROP TRIGGER IF EXISTS contests_tsv_update ON "contests";
        CREATE TRIGGER contests_tsv_update
        BEFORE INSERT OR UPDATE ON "contests"
        FOR EACH ROW
        EXECUTE FUNCTION contests_tsv_trigger();
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_Contests_TSV" ON "contests" USING gin ("tsv");',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_Contests_TSV";');
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS "contests_tsv_update" ON "contests";',
    );
    await queryRunner.query('DROP FUNCTION IF EXISTS "contests_tsv_trigger";');
    await queryRunner.query(
      'ALTER TABLE "contests" DROP COLUMN IF EXISTS "tsv";',
    );
  }
}
