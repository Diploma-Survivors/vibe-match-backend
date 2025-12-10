// NestJS
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

// Third-party
import { plainToInstance } from 'class-transformer';
import * as jose from 'jose';

// Shared/Common
import { RedisService } from 'src/shared/redis/redis.service';

// Relative imports
import { InjectRepository } from '@nestjs/typeorm';
import { JwtPayload } from 'src/modules/auth/interfaces/jwt.interface';
import { JwtAuthService } from 'src/modules/auth/jwt-auth.service';
import { Course } from 'src/modules/course/entities/course.entity';
import { CourseService } from 'src/modules/course/services/course.service';
import { UserCourseService } from 'src/modules/user-course/services/user-course.service';
import { User } from 'src/modules/user/entities/user.entity';
import { UserService } from 'src/modules/user/user.service';
import { Repository } from 'typeorm';
import { LTI_CLAIMS, LTI_VERSIONS } from './constants/lti.constants';
import { LTI_STATE_PREFIX } from './constants/redis.constants';
import { IdTokenPayloadDto } from './dto/id-token-payload.dto';
import { LtiDeployment } from './entities/lti-deployment.entity';
import { LtiMessageType } from './enums/lti-message-type.enum';
import {
  LtiClaims,
  LtiStatePayload,
  TokenResponse,
} from './interfaces/lti.interface';

@Injectable()
export class LtiUtilService {
  private readonly logger = new Logger(LtiUtilService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly userService: UserService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly courseService: CourseService,
    private readonly userCourseService: UserCourseService,
    @InjectRepository(LtiDeployment)
    private readonly ltiDeploymentRepository: Repository<LtiDeployment>,
  ) {}

  public async validateAndGetNonceFromState(state: string): Promise<string> {
    const parsedState = await this.getStateFromRedis(state);
    return parsedState.nonce;
  }

  public async getStateFromRedis(state: string): Promise<LtiStatePayload> {
    const storedStateString = await this.redisService.get(
      `${LTI_STATE_PREFIX}${state}`,
    );

    if (!storedStateString) {
      throw new UnauthorizedException(
        'Invalid or expired state parameter (CSRF protection failed)',
      );
    }
    const parsedState = JSON.parse(storedStateString) as LtiStatePayload;
    await this.redisService.del(`${LTI_STATE_PREFIX}${state}`);
    this.logger.log(
      `Retrieved state '${state}' from Redis: ${JSON.stringify(parsedState)}`,
    );

    return parsedState;
  }

  public async getAndValidateClaims(
    idToken: string,
    expectedMessageType: LtiMessageType,
    nonce: string,
  ): Promise<IdTokenPayloadDto> {
    const decodedJwt = await this.verifyJwtFromPlatform(idToken);

    const claims = this.transformIdTokenPayload(
      decodedJwt.payload as LtiClaims,
    );

    if (claims.version !== LTI_VERSIONS.V1_3) {
      throw new BadRequestException('Unsupported LTI version');
    }

    if (claims.messageType !== expectedMessageType) {
      throw new BadRequestException('Unsupported LTI message type');
    }

    if (claims.nonce !== nonce) {
      throw new UnauthorizedException('Invalid nonce');
    }

    return claims;
  }

  public async verifyJwtFromPlatform(
    idToken: string,
  ): Promise<jose.JWTVerifyResult> {
    try {
      const decodedJwt = jose.decodeJwt(idToken);
      const clientId = Array.isArray(decodedJwt.aud)
        ? decodedJwt.aud?.[0]
        : decodedJwt.aud;
      const platformId = decodedJwt.iss;
      const deploymentId = decodedJwt?.[LTI_CLAIMS.DEPLOYMENT_ID] as string;

      const ltiDeployment = await this.ltiDeploymentRepository.findOne({
        where: {
          issuerUrl: platformId,
          clientId,
          deploymentId,
        },
      });
      if (!ltiDeployment) {
        throw new UnauthorizedException(
          'LTI Deployment not found for the given issuer, client ID, and deployment ID',
        );
      }

      const JWKS = jose.createRemoteJWKSet(new URL(ltiDeployment.jwksUrl));
      const verifiedJwt = await jose.jwtVerify(idToken, JWKS, {
        audience: clientId,
        issuer: platformId,
        clockTolerance: 5,
      });

      return verifiedJwt;
    } catch (error) {
      this.logger.error(`JWT verification failed: ${(error as Error).message}`);
      throw new UnauthorizedException(
        `JWT verification failed: ${(error as Error).message}`,
      );
    }
  }

  public transformIdTokenPayload(payload: LtiClaims): IdTokenPayloadDto {
    const claims = plainToInstance(IdTokenPayloadDto, payload);
    return claims;
  }

  public async upsertUserFromClaims(
    claims: IdTokenPayloadDto,
    ltiDeployment: LtiDeployment,
  ): Promise<User> {
    const user = await this.userService.findOrCreateByLtiClaims(
      claims,
      ltiDeployment,
    );
    this.logger.log(
      `LTI Launch: User processed in DB: ID ${user.id}, Email ${user.email}`,
    );
    return user;
  }

  public async processCourseAndEnrollUser(
    claims: IdTokenPayloadDto,
    user: User,
    ltiDeployment: LtiDeployment,
  ): Promise<Course | null> {
    if (!claims.context) {
      return null;
    }

    try {
      const course = await this.courseService.findOrCreateByLtiContextClaims(
        claims,
        ltiDeployment,
      );
      this.logger.log(
        `LTI Launch: Course processed in DB: ID ${course.id}, Title ${course.title}`,
      );

      await this.userCourseService.enrollUserInCourse(user, course, user.roles);
      this.logger.log(
        `LTI Launch: User ${user.id} enrolled in course ${
          course.id
        } with roles: ${user.roles.join(', ')}`,
      );

      return course;
    } catch (error) {
      this.logger.error(
        `Failed to process LTI course or enroll user: ${
          (error as Error).message
        }`,
      );
      return null;
    }
  }

  public issueTokens(
    user: User,
    claims: IdTokenPayloadDto,
    course?: Course | null,
    ltiSessionId?: string,
  ): Promise<TokenResponse> {
    return this.generateTokensForUser({
      userId: user.id,
      courseId: course?.id || undefined,
      email: user.email || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      roles: user.roles,
      sub: claims.sub,
      iss: claims.iss,
      ltiSessionId: ltiSessionId || undefined,
    });
  }

  public async generateTokensForUser(
    payload: JwtPayload,
  ): Promise<TokenResponse> {
    const accessToken = await this.jwtAuthService.generateAccessToken(payload);
    this.logger.log('LTI Launch: Generated Access Token.');

    const deviceId = await this.jwtAuthService.generateDeviceId();
    const refreshToken = await this.jwtAuthService.generateRefreshToken(
      payload,
      deviceId,
    );
    this.logger.log('LTI Launch: Generated Refresh Token and stored in DB.');

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
      deviceId: deviceId,
    };
  }
}
