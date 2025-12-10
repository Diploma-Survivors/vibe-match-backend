import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class RemoveLtiPlatformIdAddTenantId1764844471051
  implements MigrationInterface
{
  name = 'RemoveLtiPlatformIdAddTenantId1764844471051';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop ltiPlatformId column
    await queryRunner.dropColumn('user', 'ltiPlatformId');

    // Add tenantId column
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'tenant_id',
        type: 'int',
        isNullable: true,
      }),
    );

    // Create foreign key constraint
    await queryRunner.createForeignKey(
      'user',
      new TableForeignKey({
        name: 'fk_user_tenant',
        columnNames: ['tenant_id'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['tenant_id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create new unique constraint on [ltiSubjectId, tenantId]
    await queryRunner.createUniqueConstraint(
      'user',
      new TableUnique({
        name: 'uq_user_ltiSubjectId_tenantId',
        columnNames: ['ltiSubjectId', 'tenant_id'],
      }),
    );

    // Add index on tenant_id
    await queryRunner.query(
      `CREATE INDEX "idx_user_tenant_id" ON "user" ("tenant_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_user_tenant_id"`);
    await queryRunner.dropUniqueConstraint(
      'user',
      'uq_user_ltiSubjectId_tenantId',
    );
    await queryRunner.dropForeignKey('user', 'fk_user_tenant');
    await queryRunner.dropColumn('user', 'tenant_id');

    // Re-add ltiPlatformId column
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'ltiPlatformId',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Re-create unique constraint
    await queryRunner.createUniqueConstraint(
      'user',
      new TableUnique({
        name: 'uq_user_ltiSubjectId_ltiPlatformId',
        columnNames: ['ltiSubjectId', 'ltiPlatformId'],
      }),
    );
  }
}
