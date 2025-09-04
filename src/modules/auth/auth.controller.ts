import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthService } from './jwt-auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly jwtAuthService: JwtAuthService,
  ) {}

  @Post('set-cookie-and-redirect')
  @ApiOperation({ summary: 'Sets HTTP-Only cookie and redirects to frontend' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend' })
  public setCookieAndRedirect(
    @Body('token') token: string,
    @Body('redirect') redirect: string,
    @Res() res: Response,
  ): void {
    const accessTokenTtl = this.configService.get<number>(
      'JWT_ACCESS_TOKEN_TTL',
    ) as number;

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: accessTokenTtl * 1000,
    });

    res.redirect(302, redirect);
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
