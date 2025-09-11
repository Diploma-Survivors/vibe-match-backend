import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { LtiClaims } from '../../modules/lti/interfaces/lti.interface';
import { AuthTypeEnum } from './enums/auth-type.enum';
import { RoleEnum } from './enums/role.enum';
import {
  LTI_CLAIMS,
  LTI_ROLES,
  LTI_ROLES_ARRAY,
} from '../../modules/lti/constants/lti.constants';

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

  findOne(id: number) {
    return this.userRepository.findOne({ where: { id } });
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return this.userRepository.update(id, updateUserDto);
  }

  remove(id: number) {
    return this.userRepository.delete(id);
  }

  public async findOrCreateByLtiClaims(claims: LtiClaims): Promise<User> {
    const ltiSubjectId = claims.sub;
    const ltiPlatformId = claims.iss;
    const ltiRoles = (claims[LTI_CLAIMS.ROLES] as string[]) || [];
    const internalRoles = this.mapLtiRolesToInternalRoles(ltiRoles);

    let user = await this.userRepository.findOne({
      where: {
        ltiSubjectId: ltiSubjectId,
        ltiPlatformId: ltiPlatformId,
      },
    });

    const firstName = claims.given_name || null;
    const lastName = claims.family_name || null;
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

    /* deprecated (check and remove if everything works fine)
      // for (const ltiRoleUrl of ltiRoles) {
      // const lastHashIndex = ltiRoleUrl.lastIndexOf('#');
      // if (lastHashIndex !== -1) {
      //   const roleName = ltiRoleUrl.substring(lastHashIndex + 1).toUpperCase();
      //   switch (roleName) {
      //     case 'ADMINISTRATOR':
      //       if (!internalRoles.includes(RoleEnum.ADMIN)) {
      //         internalRoles.push(RoleEnum.ADMIN);
      //       }
      //       break;
      //     case 'INSTRUCTOR':
      //       if (!internalRoles.includes(RoleEnum.INSTRUCTOR)) {
      //         internalRoles.push(RoleEnum.INSTRUCTOR);
      //       }
      //       break;
      //     case 'STUDENT':
      //       if (!internalRoles.includes(RoleEnum.STUDENT)) {
      //         internalRoles.push(RoleEnum.STUDENT);
      //       }
      //       break;
      //     case 'LEARNER':
      //       if (!internalRoles.includes(RoleEnum.LEARNER)) {
      //         internalRoles.push(RoleEnum.LEARNER);
      //       }
      //       break;
      //     // TODO: Add more roles
      //     default:
      //       this.logger.warn(`Unknown LTI role: ${roleName}. Skipping.`);
      //       break;
      //   }
      // }
      // */
    return [...new Set(internalRoles)].toSorted((a, b) => a.localeCompare(b));
  }
}
