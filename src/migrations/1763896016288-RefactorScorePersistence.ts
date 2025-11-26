import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorScorePersistence1763896016288
  implements MigrationInterface
{
  name = 'RefactorScorePersistence1763896016288';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the enum type for contest problem result status
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."contest_problem_result_status_enum" AS ENUM(
          'UNATTEMPTED',
          'ATTEMPTED',
          'SOLVED',
          'UNSOLVED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create the contest_problem_result table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contest_problem_result" (
        "id" SERIAL NOT NULL,
        "score" double precision NOT NULL DEFAULT '0',
        "status" "public"."contest_problem_result_status_enum" NOT NULL DEFAULT 'UNATTEMPTED',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "contest_participation_id" integer,
        "problem_id" integer,
        CONSTRAINT "UQ_537174186f991dcb02d293d9785" UNIQUE ("contest_participation_id", "problem_id"),
        CONSTRAINT "PK_9682196d9f9208693663bb47920" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key to contest_participation
    await queryRunner.query(`
      ALTER TABLE "contest_problem_result"
      ADD CONSTRAINT "FK_846813b19fee0f17776fd5a92ae"
      FOREIGN KEY ("contest_participation_id")
      REFERENCES "contest_participation"("contest_participation_id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    // Add foreign key to problems
    await queryRunner.query(`
      ALTER TABLE "contest_problem_result"
      ADD CONSTRAINT "FK_d3faa591b56ca52cbddd6bbdc31"
      FOREIGN KEY ("problem_id")
      REFERENCES "problems"("problem_id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "contest_problem_result"
      DROP CONSTRAINT IF EXISTS "FK_d3faa591b56ca52cbddd6bbdc31"
    `);

    await queryRunner.query(`
      ALTER TABLE "contest_problem_result"
      DROP CONSTRAINT IF EXISTS "FK_846813b19fee0f17776fd5a92ae"
    `);

    // Drop the table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "contest_problem_result"
    `);

    // Drop the enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."contest_problem_result_status_enum"
    `);
  }
}
