import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { LanguageData } from '../modules/language/interface/LanguageData.interface';

export class InsertLanguages1759590099999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Resolve the path to the JSON file
    const filePath = path.resolve(
      __dirname,
      '../../src/modules/language/database/languages.json',
    );

    const data = JSON.parse(
      fs.readFileSync(filePath, 'utf8'),
    ) as LanguageData[];

    for (const lang of data) {
      if (lang.is_archived) continue;

      await queryRunner.query(
        `INSERT INTO "languages" ("id", "name")
         VALUES ($1, $2)
         ON CONFLICT ("id") DO NOTHING;`,
        [lang.id, lang.name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-read JSON to know what to delete
    const filePath = path.resolve(
      __dirname,
      '../src/modules/language/database/languages.json',
    );
    const data = JSON.parse(
      fs.readFileSync(filePath, 'utf8'),
    ) as LanguageData[];

    const ids = data.map((l: LanguageData) => l.id);
    if (ids.length > 0) {
      await queryRunner.query(`DELETE FROM "languages" WHERE "id" = ANY($1);`, [
        ids,
      ]);
    }
  }
}
