import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt.interface';
import { RoleEnum } from '../user/enums/role.enum';
import { CreateProblemResponseDto } from './dto/create-problem-response.dto';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { ProblemsService } from './problems.service';

@ApiTags('Problems')
@ApiCookieAuth('access_token')
@Controller('problems')
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a problem (Instructor only)' })
  @ApiResponse({
    type: CreateProblemResponseDto,
    status: HttpStatus.CREATED,
    description: 'The problem has been created.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  @UseInterceptors(ClassSerializerInterceptor)
  async create(
    @Body() createProblemDto: CreateProblemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const problem = await this.problemsService.create(createProblemDto, user);
    return plainToInstance(CreateProblemResponseDto, problem);
  }

  @Get()
  @ApiOperation({ summary: 'Get all problems' })
  @ApiResponse({
    type: [CreateProblemResponseDto],
    status: HttpStatus.OK,
    description: 'List of problems.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return await this.problemsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a problem by ID' })
  @ApiResponse({
    type: CreateProblemResponseDto,
    status: HttpStatus.OK,
    description: 'The problem has been found.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Problem not found.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return await this.problemsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a problem (Instructor only)' })
  @ApiResponse({
    type: CreateProblemResponseDto,
    status: HttpStatus.OK,
    description: 'The problem has been updated.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Problem not found.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async update(
    @Param('id') id: string,
    @Body() updateProblemDto: UpdateProblemDto,
  ) {
    return await this.problemsService.update(id, updateProblemDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a problem (Instructor only)' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The problem has been deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Problem not found.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async remove(@Param('id') id: string) {
    return await this.problemsService.remove(id);
  }
}
