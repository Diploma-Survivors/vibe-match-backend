import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ProblemsService } from './problems.service';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt.interface';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from '../user/enums/role.enum';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateProblemResponseDto } from './dto/create-problem-response.dto';
import { plainToInstance } from 'class-transformer';

@ApiTags('Problems')
@ApiCookieAuth('access_token')
@Controller('problems')
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a problem (Instructor only)' })
  @ApiResponse({
    type: CreateProblemResponseDto,
    status: 201,
    description: 'The problem has been created.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  @UseInterceptors(ClassSerializerInterceptor)
  async create(
    @Body() createProblemDto: CreateProblemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const problem = await this.problemsService.create(createProblemDto, user);
    return plainToInstance(CreateProblemResponseDto, problem, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all problems' })
  @ApiResponse({ status: 200, description: 'List of problems.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return await this.problemsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a problem by ID' })
  @ApiResponse({ status: 200, description: 'The problem has been found.' })
  @ApiResponse({ status: 404, description: 'Problem not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return await this.problemsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a problem (Instructor only)' })
  @ApiResponse({ status: 200, description: 'The problem has been updated.' })
  @ApiResponse({ status: 404, description: 'Problem not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
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
  @ApiResponse({ status: 200, description: 'The problem has been deleted.' })
  @ApiResponse({ status: 404, description: 'Problem not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async remove(@Param('id') id: string) {
    return await this.problemsService.remove(id);
  }
}
