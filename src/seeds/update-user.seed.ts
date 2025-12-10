import { Tenant } from 'src/modules/user/entities/tenant.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { AuthTypeEnum } from 'src/modules/user/enums/auth-type.enum';
import { DataSource, IsNull } from 'typeorm';
import { LMS_TENANT_NAME } from './constants';

export async function updateUserSeed(dataSource: DataSource) {
  const userRepo = dataSource.getRepository(User);
  const tenantRepo = dataSource.getRepository(Tenant);

  const tenant = await tenantRepo.findOne({
    where: {
      name: LMS_TENANT_NAME,
    },
  });
  if (!tenant) {
    console.error('Please run seed for tenant first!');
    return;
  }

  await userRepo.update(
    { authType: AuthTypeEnum.LTI, tenantId: IsNull() },
    { tenant },
  );
}
