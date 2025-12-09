import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class UpdateLtiLaunchSessionAddDeployment1764864961905
  implements MigrationInterface
{
  name = 'UpdateLtiLaunchSessionAddDeployment1764864961905';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop columns platform_issuer and deployment_id
    await queryRunner.dropColumn('lti_launch_sessions', 'deployment_id');
    await queryRunner.dropColumn('lti_launch_sessions', 'platform_issuer');

    // Add lti_deployment_id column
    await queryRunner.addColumn(
      'lti_launch_sessions',
      new TableColumn({
        name: 'lti_deployment_id',
        type: 'int',
        isNullable: true,
      }),
    );

    // Create foreign key to lti_deployments table
    await queryRunner.createForeignKey(
      'lti_launch_sessions',
      new TableForeignKey({
        name: 'FK_lti_launch_sessions_lti_deployment',
        columnNames: ['lti_deployment_id'],
        referencedTableName: 'lti_deployments',
        referencedColumnNames: ['lti_deployment_id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey(
      'lti_launch_sessions',
      'FK_lti_launch_sessions_lti_deployment',
    );

    // Drop lti_deployment_id column
    await queryRunner.dropColumn('lti_launch_sessions', 'lti_deployment_id');

    // Re-add deploymentId column
    await queryRunner.addColumn(
      'lti_launch_sessions',
      new TableColumn({
        name: 'deployment_id',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Re-add platformIssuer column
    await queryRunner.addColumn(
      'lti_launch_sessions',
      new TableColumn({
        name: 'platform_issuer',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }
}
