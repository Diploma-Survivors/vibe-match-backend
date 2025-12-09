// Built-in
import type { Response } from 'express';

// NestJS
import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

// Shared/Common
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtRefreshGuard } from 'src/common/guards/jwt-refresh.guard';

// Relative Imports
import { JwtConfig } from '../../config/auth.config';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RefreshTokenResponseDto } from './dto/refresh-token.response.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpResponseDto } from './dto/sign-up-response.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { JwtAuthService } from './jwt-auth.service';

// Types Imports
import type { JwtPayload } from './interfaces/jwt.interface';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly logger: Logger,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly jwtAuthService: JwtAuthService,
  ) {}

  /**
   * Refreshes access and refresh tokens
   * Rate limited to 5 requests per minute per user
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('refresh')
  @ApiOperation({
    summary: 'Refreshes access and refresh tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    type: () => RefreshTokenResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid refresh token',
  })
  @ApiBearerAuth()
  @UseGuards(JwtRefreshGuard)
  public async refreshTokens(
    @Res() res: Response,
    @Body() refreshTokenDto: RefreshTokenDto,
    @CurrentUser() jwtPayload: JwtPayload,
  ) {
    try {
      const newAccessToken =
        await this.jwtAuthService.generateAccessToken(jwtPayload);
      const newRefreshToken = await this.jwtAuthService.generateRefreshToken(
        jwtPayload,
        refreshTokenDto.deviceId,
      );

      const jwtConfig = this.configService.get<{
        jwt: JwtConfig;
      }>('auth')?.jwt;

      if (!jwtConfig) {
        this.logger.error('JWT configuration not found during token refresh.');
        throw new UnauthorizedException('Server configuration error');
      }

      res.status(200).send({
        message: 'Tokens refreshed successfully',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      this.logger.error(`Error refreshing tokens: ${(error as Error).message}`);
      if (error instanceof UnauthorizedException) {
        throw error;
      } else {
        throw new UnauthorizedException('Invalid refresh token');
      }
    }
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Logs out the user by revoking refresh token and clearing cookies',
  })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    type: () => LogoutResponseDto,
  })
  @ApiBearerAuth()
  @UseGuards(JwtRefreshGuard)
  public logout(@Res() res: Response) {
    res.status(200).send({ message: 'Logged out successfully' });
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('sign-up')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: () => SignUpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - user already exists or invalid data',
  })
  async signUp(@Body() dto: SignUpDto): Promise<SignUpResponseDto> {
    await this.authService.signUp(dto);
    return {
      message: 'User registered successfully',
    };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('sign-in')
  @ApiOperation({ summary: 'Sign in to user account' })
  @ApiResponse({
    status: 200,
    description: 'Sign in successful',
    type: () => AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid credentials',
  })
  async signIn(@Body() dto: SignInDto): Promise<AuthResponseDto> {
    return this.authService.signIn(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all authentication records' })
  @ApiResponse({
    status: 200,
    description: 'List of auth records retrieved successfully',
  })
  findAll() {
    return this.authService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get authentication record by ID' })
  @ApiResponse({
    status: 200,
    description: 'Auth record found successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Auth record not found',
  })
  findOne(@Param('id') id: string) {
    return this.authService.findOne(+id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete authentication record by ID' })
  @ApiResponse({
    status: 200,
    description: 'Auth record deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Auth record not found',
  })
  remove(@Param('id') id: string) {
    return this.authService.remove(+id);
  }
}
