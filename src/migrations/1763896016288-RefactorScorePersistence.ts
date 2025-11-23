import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorScorePersistence1763896016288
  implements MigrationInterface
{
  name = 'RefactorScorePersistence1763896016288';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."contest_problem_result_status_enum" AS ENUM('UNATTEMPTED', 'ATTEMPTED', 'SOLVED', 'UNSOLVED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "contest_problem_result" ("id" SERIAL NOT NULL, "score" double precision NOT NULL DEFAULT '0', "status" "public"."contest_problem_result_status_enum" NOT NULL DEFAULT 'UNATTEMPTED', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "contest_participation_id" integer, "problem_id" integer, CONSTRAINT "UQ_537174186f991dcb02d293d9785" UNIQUE ("contest_participation_id", "problem_id"), CONSTRAINT "PK_9682196d9f9208693663bb47920" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "contest_participation" ADD "finished_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."contests_submission_strategy_enum" AS ENUM('SINGLE_SUBMISSION', 'BEST_SCORE', 'LATEST_SCORE', 'AVERAGE_SCORE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "contests" ADD "submission_strategy" "public"."contests_submission_strategy_enum" NOT NULL DEFAULT 'BEST_SCORE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "contest_participation" DROP CONSTRAINT "FK_65f6ded536b9cf1614b331dff6f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."uq_participation_contest_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contest_participation" DROP COLUMN "end_time"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contest_participation" ADD "end_time" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "contest_participation" ALTER COLUMN "contest_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_participation_contest_user" ON "contest_participation" ("contest_id", "user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "contest_problem_result" ADD CONSTRAINT "FK_846813b19fee0f17776fd5a92ae" FOREIGN KEY ("contest_participation_id") REFERENCES "contest_participation"("contest_participation_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contest_problem_result" ADD CONSTRAINT "FK_d3faa591b56ca52cbddd6bbdc31" FOREIGN KEY ("problem_id") REFERENCES "problems"("problem_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contest_participation" ADD CONSTRAINT "FK_65f6ded536b9cf1614b331dff6f" FOREIGN KEY ("contest_id") REFERENCES "contests"("contest_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contest_participation" DROP CONSTRAINT "FK_65f6ded536b9cf1614b331dff6f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contest_problem_result" DROP CONSTRAINT "FK_d3faa591b56ca52cbddd6bbdc31"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contest_problem_result" DROP CONSTRAINT "FK_846813b19fee0f17776fd5a92ae"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."uq_participation_contest_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contest_participation" ALTER COLUMN "contest_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "contest_participation" DROP COLUMN "end_time"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contest_participation" ADD "end_time" TIME`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_participation_contest_user" ON "contest_participation" ("contest_id", "user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "contest_participation" ADD CONSTRAINT "FK_65f6ded536b9cf1614b331dff6f" FOREIGN KEY ("contest_id") REFERENCES "contests"("contest_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contests" DROP COLUMN "submission_strategy"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."contests_submission_strategy_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contest_participation" DROP COLUMN "finished_at"`,
    );
    await queryRunner.query(`DROP TABLE "contest_problem_result"`);
    await queryRunner.query(
      `DROP TYPE "public"."contest_problem_result_status_enum"`,
    );
  }
}
