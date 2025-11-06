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
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtRefreshGuard } from 'src/common/guards/jwt-refresh.guard';
import { JwtConfig } from '../../config/auth.config';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RefreshTokenResponseDto } from './dto/refresh-token.response.dto';
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
