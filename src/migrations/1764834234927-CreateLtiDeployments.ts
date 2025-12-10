import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateLtiDeployments1764834234927 implements MigrationInterface {
  name = 'CreateLtiDeployments1764834234927';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'lti_deployments',
        columns: [
          {
            name: 'lti_deployment_id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'tenant_id',
            type: 'int',
          },
          {
            name: 'issuer_url',
            type: 'varchar',
          },
          {
            name: 'client_id',
            type: 'varchar',
          },
          {
            name: 'deployment_id',
            type: 'varchar',
          },
          {
            name: 'authentication_url',
            type: 'varchar',
          },
          {
            name: 'jwks_url',
            type: 'varchar',
          },
          {
            name: 'token_url',
            type: 'varchar',
          },
          {
            name: 'is_active',
            type: 'boolean',
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create unique composite index
    await queryRunner.createIndex(
      'lti_deployments',
      new TableIndex({
        name: 'idx_iss_client_depl',
        columnNames: ['issuer_url', 'client_id', 'deployment_id'],
        isUnique: true,
      }),
    );

    // Create index on tenant_id
    await queryRunner.createIndex(
      'lti_deployments',
      new TableIndex({
        name: 'idx_tenant_id',
        columnNames: ['tenant_id'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'lti_deployments',
      new TableForeignKey({
        name: 'fk_lti_deployments_tenant',
        columnNames: ['tenant_id'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['tenant_id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key first
    await queryRunner.dropForeignKey(
      'lti_deployments',
      'FK_lti_deployments_tenant',
    );

    // Drop indexes
    await queryRunner.dropIndex(
      'lti_deployments',
      'IDX_lti_deployments_tenant_id',
    );
    await queryRunner.dropIndex(
      'lti_deployments',
      'IDX_lti_deployments_issuer_client_deployment',
    );

    // Drop table
    await queryRunner.dropTable('lti_deployments');
  }
}
