import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare } from 'bcrypt';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
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
    private readonly userService: UserService,
    private readonly jwtAuthService: JwtAuthService,
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

    // Create user
    await this.userService.create({
      ...dto,
      roles: [RoleEnum.STUDENT],
      authType: AuthTypeEnum.LOCAL,
      tenantId: platformTenant.id,
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

    // Generate device ID
    const deviceId = await this.jwtAuthService.generateDeviceId();

    // Create JWT payload
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email!,
      firstName: user.firstName!,
      lastName: user.lastName!,
      roles: user.roles,
    };

    // Generate tokens
    const accessToken = await this.jwtAuthService.generateAccessToken(payload);
    const refreshToken = await this.jwtAuthService.generateRefreshToken(
      payload,
      deviceId,
    );

    return {
      message: 'Sign in successful',
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
