import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  LTI_ROLES,
  LTI_ROLES_ARRAY,
} from '../../modules/lti/constants/lti.constants';
import { IdTokenPayloadDto } from '../lti/dto/id-token-payload.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { AuthTypeEnum } from './enums/auth-type.enum';
import { RoleEnum } from './enums/role.enum';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  create(createUserDto: CreateUserDto) {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  findAll() {
    return this.userRepository.find();
  }

  findOne(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.userRepository.update(id, updateUserDto);
  }

  remove(id: string) {
    return this.userRepository.delete(id);
  }

  public async findOrCreateByLtiClaims(
    claims: IdTokenPayloadDto,
  ): Promise<User> {
    const ltiSubjectId = claims.sub;
    const ltiPlatformId = claims.iss;
    const ltiRoles = claims.roles || [];
    const internalRoles = this.mapLtiRolesToInternalRoles(ltiRoles);

    let user = await this.userRepository.findOne({
      where: {
        ltiSubjectId: ltiSubjectId,
        ltiPlatformId: ltiPlatformId,
      },
    });

    const firstName = claims.givenName || null;
    const lastName = claims.familyName || null;
    const email = claims.email || null;

    if (!user) {
      user = this.userRepository.create({
        ltiSubjectId,
        ltiPlatformId,
        email,
        firstName,
        lastName,

        roles: internalRoles,
        authType: AuthTypeEnum.LTI,
      });
      await this.userRepository.save(user);
      this.logger.log(
        `Created new LTI user: ${user.email || user.ltiSubjectId}`,
      );
    } else {
      let updated = false;
      if (user.firstName !== firstName) {
        user.firstName = firstName;
        updated = true;
      }
      if (user.lastName !== lastName) {
        user.lastName = lastName;
        updated = true;
      }
      if (user.email !== email) {
        user.email = email;
        updated = true;
      }
      if (JSON.stringify(user.roles) !== JSON.stringify(internalRoles)) {
        user.roles = internalRoles;
        updated = true;
      }
      if (updated) {
        await this.userRepository.save(user);
        this.logger.log(`Updated LTI user: ${user.email || user.ltiSubjectId}`);
      }
    }

    return user;
  }

  private mapLtiRolesToInternalRoles(ltiRoles: string[]): RoleEnum[] {
    const ltiRolesInCourse = ltiRoles.filter((role) =>
      LTI_ROLES_ARRAY.includes(role),
    );

    const internalRoles: RoleEnum[] = ltiRolesInCourse
      .map((role) => {
        switch (role) {
          case LTI_ROLES.INSTRUCTOR:
            return RoleEnum.INSTRUCTOR;
          case LTI_ROLES.STUDENT:
            return RoleEnum.STUDENT;
          default:
            this.logger.warn(`Unknown LTI role: ${role}. Skipping.`);
            return null;
        }
      })
      .filter((role) => role !== null);

    return [...new Set(internalRoles)].toSorted((a, b) => a.localeCompare(b));
  }
}
