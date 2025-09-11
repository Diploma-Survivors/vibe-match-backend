import { JWTPayload as JoseJwtPayload } from 'jose';
import { RoleEnum } from '../../user/enums/role.enum';

export interface JwtPayload extends JoseJwtPayload {
  userId: string;
  courseId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roles: RoleEnum[];
  sub?: string;
  iss?: string;
}
