import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class UpdateCourseRemovePlatformAddTenantDeployment1764856574241
  implements MigrationInterface
{
  name = 'UpdateCourseRemovePlatformAddTenantDeployment1764856574241';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop column
    await queryRunner.dropColumn('course', 'ltiPlatformId');

    // Add tenant_id column
    await queryRunner.addColumn(
      'course',
      new TableColumn({
        name: 'tenant_id',
        type: 'int',
        isNullable: true,
      }),
    );

    // Add lti_deployment_id column
    await queryRunner.addColumn(
      'course',
      new TableColumn({
        name: 'lti_deployment_id',
        type: 'int',
        isNullable: true,
      }),
    );

    // Create foreign key to tenants table
    await queryRunner.createForeignKey(
      'course',
      new TableForeignKey({
        name: 'FK_course_tenant',
        columnNames: ['tenant_id'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['tenant_id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign key to lti_deployments table
    await queryRunner.createForeignKey(
      'course',
      new TableForeignKey({
        name: 'FK_course_lti_deployment',
        columnNames: ['lti_deployment_id'],
        referencedTableName: 'lti_deployments',
        referencedColumnNames: ['lti_deployment_id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create new unique constraint on [ltiCourseId, ltiDeploymentId]
    await queryRunner.createUniqueConstraint(
      'course',
      new TableUnique({
        name: 'UQ_course_ltiCourseId_ltiDeploymentId',
        columnNames: ['ltiCourseId', 'lti_deployment_id'],
      }),
    );

    // Add indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_course_tenant_id" ON course (tenant_id)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_course_lti_deployment_id" ON course (lti_deployment_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_course_lti_deployment_id"`);
    await queryRunner.query(`DROP INDEX "IDX_course_tenant_id"`);

    // Drop unique constraint
    await queryRunner.dropUniqueConstraint(
      'course',
      'UQ_course_ltiCourseId_ltiDeploymentId',
    );

    // Drop foreign keys
    await queryRunner.dropForeignKey('course', 'FK_course_lti_deployment');
    await queryRunner.dropForeignKey('course', 'FK_course_tenant');

    // Drop columns
    await queryRunner.dropColumn('course', 'lti_deployment_id');
    await queryRunner.dropColumn('course', 'tenant_id');

    // Re-add ltiPlatformId column
    await queryRunner.addColumn(
      'course',
      new TableColumn({
        name: 'ltiPlatformId',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Re-create old unique constraint
    await queryRunner.createUniqueConstraint(
      'course',
      new TableUnique({
        name: 'UQ_course_ltiCourseId_ltiPlatformId',
        columnNames: ['ltiCourseId', 'ltiPlatformId'],
      }),
    );
  }
}
