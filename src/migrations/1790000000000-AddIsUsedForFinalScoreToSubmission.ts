import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsUsedForFinalScoreToSubmission1733280103000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'submission',
      new TableColumn({
        name: 'is_used_for_final_score',
        type: 'boolean',
        default: false,
      }),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // await queryRunner.dropColumn('submission', 'is_used_for_final_score');
  }
}
