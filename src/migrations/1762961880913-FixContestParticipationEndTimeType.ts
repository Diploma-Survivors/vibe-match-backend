import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixContestParticipationEndTimeType1762961880913
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contest_participation" ALTER COLUMN "end_time" TYPE timestamp with time zone USING (CURRENT_DATE + end_time)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contest_participation" ALTER COLUMN "end_time" TYPE time`,
    );
  }
}
