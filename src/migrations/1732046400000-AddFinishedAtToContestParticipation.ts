import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFinishedAtToContestParticipation1732046400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'contest_participation',
      new TableColumn({
        name: 'finished_at',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('contest_participation', 'finished_at');
  }
}
