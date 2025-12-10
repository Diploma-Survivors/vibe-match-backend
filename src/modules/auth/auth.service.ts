import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { compare, hash } from 'bcrypt';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

import { Course } from '../course/entities/course.entity';
import { UserCourse } from '../user-course/entities/user-course.entity';
import { Tenant } from '../user/entities/tenant.entity';
import { AuthTypeEnum } from '../user/enums/auth-type.enum';
import { RoleEnum } from '../user/enums/role.enum';
import { TenantType } from '../user/enums/tenant-type.enum';
import { UserService } from '../user/user.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { Auth } from './entities/auth.entity';
import { JwtPayload } from './interfaces/jwt.interface';
import { JwtAuthService } from './jwt-auth.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(UserCourse)
    private readonly userCourseRepository: Repository<UserCourse>,
    private readonly userService: UserService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Transactional()
  async signUp(dto: SignUpDto): Promise<void> {
    const existingUser = await this.userService.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Get platform tenant for LOCAL auth users (managed by admin)
    const platformTenant = await this.tenantRepository.findOne({
      where: { type: TenantType.PLATFORM },
    });
    if (!platformTenant) {
      throw new BadRequestException(
        'Platform tenant not found. Please contact administrator.',
      );
    }

    // Get course for LOCAL auth users (managed by admin)
    const course = await this.courseRepository.findOne({
      where: { tenantId: platformTenant.id },
    });
    if (!course) {
      throw new BadRequestException('Course not found');
    }

    const hashedPassword = await hash(dto.password, 12);

    // Create user
    const user = await this.userService.create({
      ...dto,
      password: hashedPassword,
      roles: [RoleEnum.STUDENT],
      authType: AuthTypeEnum.LOCAL,
      tenantId: platformTenant.id,
    });

    await this.userCourseRepository.save({
      user,
      course,
      rolesInCourse: [RoleEnum.STUDENT],
    });
  }

  async signIn(dto: SignInDto): Promise<AuthResponseDto> {
    const { email, password } = dto;

    const user = await this.userService.findOne({
      where: { email },
    });
    if (user?.authType !== AuthTypeEnum.LOCAL || !user.password) {
      throw new BadRequestException('Invalid email or password');
    }

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email or password');
    }

    const tenant = await this.tenantRepository.findOne({
      where: {
        type: TenantType.PLATFORM,
      },
    });
    if (!tenant) {
      throw new NotFoundException(
        'Platform tenant not found. Please contact administrator.',
      );
    }
    const course = await this.courseRepository.findOne({
      where: {
        tenantId: tenant.id,
      },
    });
    if (!course) {
      throw new NotFoundException(
        'Platform course not found. Please contact administrator.',
      );
    }

    // Generate device ID
    const deviceId = await this.jwtAuthService.generateDeviceId();

    // Create JWT payload
    const payload: JwtPayload = {
      userId: user.id,
      courseId: course.id,
      email: user.email!,
      firstName: user.firstName!,
      lastName: user.lastName!,
      roles: user.roles,
      iss: this.configService.get<string>('appConfig.url'),
    };

    // Generate tokens
    const accessToken = await this.jwtAuthService.generateAccessToken(payload);
    const refreshToken = await this.jwtAuthService.generateRefreshToken(
      payload,
      deviceId,
    );

    return {
      accessToken,
      refreshToken,
      deviceId,
    };
  }

  findAll() {
    return this.authRepository.find();
  }

  findOne(id: number) {
    return this.authRepository.findOne({ where: { id } });
  }

  remove(id: number) {
    return this.authRepository.delete(id);
  }
}
