import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTestcaseCountColumn1764250184748 implements MigrationInterface {
  name = 'AddTestcaseCountColumn1764250184748';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'testcases',
      new TableColumn({
        name: 'testcase_count',
        type: 'int',
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('testcases', 'testcase_count');
  }
}
