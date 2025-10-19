import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateLtiLaunchSessions1730000001000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'lti_launch_sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'lti_user_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'problem_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'contest_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'resource_link_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'context_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'ags_lineitem_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'ags_scopes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'deployment_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'platform_issuer',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'expires_at',
            type: 'timestamp with time zone',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'user',
            referencedColumnNames: ['user_id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['problem_id'],
            referencedTableName: 'problems',
            referencedColumnNames: ['problem_id'],
            onDelete: 'CASCADE',
          },
          // Note: contest_id foreign key omitted because contest table may not exist yet
          // This can be added later via a separate migration when contest feature is fully implemented
        ],
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'lti_launch_sessions',
      new TableIndex({
        name: 'idx_lti_session_user_problem',
        columnNames: ['user_id', 'problem_id'],
      }),
    );

    await queryRunner.createIndex(
      'lti_launch_sessions',
      new TableIndex({
        name: 'idx_lti_session_resource_link',
        columnNames: ['resource_link_id'],
      }),
    );

    await queryRunner.createIndex(
      'lti_launch_sessions',
      new TableIndex({
        name: 'idx_lti_session_expires',
        columnNames: ['expires_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('lti_launch_sessions');
  }
}

