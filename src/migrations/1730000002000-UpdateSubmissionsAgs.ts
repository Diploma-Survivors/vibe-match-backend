import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class UpdateSubmissionsAgs1730000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add lti_launch_session_id column
    await queryRunner.addColumn(
      'submission',
      new TableColumn({
        name: 'lti_launch_session_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add foreign key for lti_launch_session_id
    await queryRunner.createForeignKey(
      'submission',
      new TableForeignKey({
        columnNames: ['lti_launch_session_id'],
        referencedTableName: 'lti_launch_sessions',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Add ags_grade_sent column
    await queryRunner.addColumn(
      'submission',
      new TableColumn({
        name: 'ags_grade_sent',
        type: 'boolean',
        default: false,
      }),
    );

    // Add ags_grade_sent_at column
    await queryRunner.addColumn(
      'submission',
      new TableColumn({
        name: 'ags_grade_sent_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Add ags_error column
    await queryRunner.addColumn(
      'submission',
      new TableColumn({
        name: 'ags_error',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key first
    const table = await queryRunner.getTable('submission');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('lti_launch_session_id') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('submission', foreignKey);
    }

    // Drop columns
    await queryRunner.dropColumn('submission', 'ags_error');
    await queryRunner.dropColumn('submission', 'ags_grade_sent_at');
    await queryRunner.dropColumn('submission', 'ags_grade_sent');
    await queryRunner.dropColumn('submission', 'lti_launch_session_id');
  }
}

