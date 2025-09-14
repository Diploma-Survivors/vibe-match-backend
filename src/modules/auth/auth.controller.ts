import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Cookies } from 'src/common/decorators/cookies.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtRefreshGuard } from 'src/common/guards/jwt-refresh.guard';
import { JwtConfig } from '../../config/auth.config';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import type { JwtPayload } from './interfaces/jwt.interface';
import { JwtAuthService } from './jwt-auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly logger: Logger,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly jwtAuthService: JwtAuthService,
  ) {}

  @Post('set-cookies-and-redirect')
  @ApiOperation({
    summary:
      'Sets HTTP-Only cookies (access and refresh) and redirects to frontend',
  })
  @ApiResponse({ status: 302, description: 'Redirects to frontend' })
  public setCookiesAndRedirect(
    @Body('accessToken') accessToken: string,
    @Body('refreshToken') refreshToken: string,
    @Body('deviceId') deviceId: string,
    @Body('redirect') redirect: string,
    @Res() res: Response,
  ): void {
    const jwtConfig = this.configService.get<{
      jwt: JwtConfig;
    }>('auth')?.jwt;

    if (!jwtConfig) {
      this.logger.error('JWT configuration not found.');
      throw new UnauthorizedException('Server configuration error');
    }

    const accessTokenTtl = jwtConfig.accessTokenTtl;
    const refreshTokenTtl = jwtConfig.refreshTokenTtl;

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: accessTokenTtl * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: refreshTokenTtl * 1000,
      path: '/auth',
    });

    res.cookie('device_id', deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: refreshTokenTtl * 1000,
      path: '/auth',
    });

    res.redirect(302, redirect);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refreshes access and refresh tokens' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid refresh token',
  })
  @UseGuards(JwtRefreshGuard)
  public async refreshTokens(
    @Res() res: Response,
    @Cookies('device_id') deviceId: string,
    @CurrentUser() jwtPayload: JwtPayload,
  ): Promise<void> {
    try {
      const newAccessToken =
        this.jwtAuthService.generateAccessToken(jwtPayload);
      const newRefreshToken = await this.jwtAuthService.generateRefreshToken(
        jwtPayload,
        deviceId,
      );

      const jwtConfig = this.configService.get<{
        jwt: JwtConfig;
      }>('auth')?.jwt;

      if (!jwtConfig) {
        this.logger.error('JWT configuration not found during token refresh.');
        throw new UnauthorizedException('Server configuration error');
      }

      const accessTokenTtl = jwtConfig.accessTokenTtl;
      const refreshTokenTtl = jwtConfig.refreshTokenTtl;

      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: accessTokenTtl * 1000,
      });

      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: refreshTokenTtl * 1000,
        path: '/auth',
      });

      res.cookie('device_id', deviceId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: refreshTokenTtl * 1000,
        path: '/auth',
      });

      res.status(200).send({ message: 'Tokens refreshed successfully' });
    } catch (error) {
      this.clearTokens(res);
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
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @UseGuards(JwtRefreshGuard)
  public logout(@Res() res: Response) {
    this.clearTokens(res);
    res.status(200).send({ message: 'Logged out successfully' });
  }

  private clearTokens(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.clearCookie('device_id');
  }

  @Post()
  @ApiOperation({ summary: 'Create authentication record' })
  @ApiResponse({
    status: 201,
    description: 'Authentication record created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid auth data',
  })
  create(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.create(createAuthDto);
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

  @Patch(':id')
  @ApiOperation({ summary: 'Update authentication record by ID' })
  @ApiResponse({
    status: 200,
    description: 'Auth record updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Auth record not found',
  })
  update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(+id, updateAuthDto);
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
