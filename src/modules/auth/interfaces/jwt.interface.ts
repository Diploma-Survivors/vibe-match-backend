import { JWTPayload as JoseJwtPayload } from 'jose';
import { RoleEnum } from '../../user/enums/role.enum';

export interface JwtPayload extends JoseJwtPayload {
  userId: number;
  courseId?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  roles: RoleEnum[];
  sub?: string;
  iss?: string;
}
