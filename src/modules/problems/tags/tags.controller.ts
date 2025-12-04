// NestJS
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
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

// Shared/Common
import { EnvGuard } from 'src/common/decorators/env.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Environment } from 'src/common/enums/environment.enum';
import { EnvironmentGuard } from 'src/common/guards/environment.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

// Relative imports
import { RoleEnum } from 'src/modules/user/enums/role.enum';
import { CreateTagBulkDto } from './dto/create-tag-bulk.dto';
import { CreateTagResponseDto } from './dto/create-tag-response.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagsService } from './tags.service';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({
    type: () => CreateTagResponseDto,
    status: HttpStatus.CREATED,
    description: 'The tag has been successfully created.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Roles(RoleEnum.INSTRUCTOR)
  async create(@Body() createTagDto: CreateTagDto) {
    const tag = await this.tagsService.create(createTagDto);
    return new CreateTagResponseDto(tag);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Create multiple tags in bulk ',
  })
  @ApiResponse({
    type: () => CreateTagResponseDto,
    isArray: true,
    status: HttpStatus.CREATED,
    description: 'The tags have been successfully created.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, EnvironmentGuard, RolesGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  @EnvGuard(Environment.DEVELOPMENT)
  async createBulk(@Body() createTagBulkDto: CreateTagBulkDto) {
    return this.tagsService.createBulk(createTagBulkDto.tags);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tags' })
  @ApiResponse({
    type: () => CreateTagResponseDto,
    isArray: true,
    status: HttpStatus.OK,
    description: 'List of tags retrieved successfully.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async findAll() {
    return await this.tagsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tag by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Tag ID' })
  @ApiResponse({
    type: () => CreateTagResponseDto,
    status: HttpStatus.OK,
    description: 'The tag has been successfully retrieved.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tag not found.' })
  async findOne(@Param('id') id: string) {
    return await this.tagsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tag by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Tag ID' })
  @ApiResponse({
    type: () => CreateTagResponseDto,
    status: HttpStatus.OK,
    description: 'The tag has been successfully updated.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tag not found.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return await this.tagsService.update(+id, updateTagDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tag by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Tag ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The tag has been successfully deleted.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tag not found.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async remove(@Param('id') id: string) {
    return await this.tagsService.remove(+id);
  }
}
