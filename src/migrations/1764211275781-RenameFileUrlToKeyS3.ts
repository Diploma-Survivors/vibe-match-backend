import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameFileUrlToKeyS31764211275781 implements MigrationInterface {
  name = 'RenameFileUrlToKeyS31764211275781';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameColumn('testcases', 'fileUrl', 'key_s3');

    await queryRunner.query(`
      ALTER TABLE "testcases"
      ALTER COLUMN "key_s3" TYPE character varying
      USING "key_s3"::character varying
    `);

    await queryRunner.query(`
      UPDATE "testcases"
      SET "key_s3" = ''
      WHERE "key_s3" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "testcases"
      ALTER COLUMN "key_s3" TYPE text
      USING "key_s3"::text
    `);

    await queryRunner.renameColumn('testcases', 'key_s3', 'fileUrl');
  }
}
