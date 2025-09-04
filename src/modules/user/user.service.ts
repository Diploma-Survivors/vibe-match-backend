import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { LtiClaims } from '../../modules/lti/interfaces/lti.interface';
import { AuthTypeEnum } from './enums/auth-type.enum';

@Injectable()
export class UserService {
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

    let user = await this.userRepository.findOne({
      where: {
        ltiSubjectId: ltiSubjectId,
        ltiPlatformId: ltiPlatformId,
      },
    });

    if (!user) {
      user = this.userRepository.create({
        ltiSubjectId: ltiSubjectId,
        ltiPlatformId: ltiPlatformId,
        email: claims.email || null,
        firstName: claims.given_name || null,
        lastName: claims.family_name || null,
        authType: AuthTypeEnum.LTI,
      });
      await this.userRepository.save(user);
    } else {
      user.firstName = claims.given_name || user.firstName;
      user.lastName = claims.family_name || user.lastName;
      await this.userRepository.save(user);
    }

    return user;
  }
}
