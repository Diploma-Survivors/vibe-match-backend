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
import { EnvGuard } from 'src/common/decorators/env.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Environment } from 'src/common/enums/environment.enum';
import { EnvironmentGuard } from 'src/common/guards/environment.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RoleEnum } from 'src/modules/user/enums/role.enum';
import { CreateTopicBulkDto } from './dto/create-topic-bulk.dto';
import { CreateTopicResponseDto } from './dto/create-topic-response.dto';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { TopicsService } from './topics.service';

@ApiTags('Topics')
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a topic' })
  @ApiResponse({
    type: () => CreateTopicResponseDto,
    status: HttpStatus.CREATED,
    description: 'The topic has been created.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Roles(RoleEnum.INSTRUCTOR)
  async create(@Body() createTopicDto: CreateTopicDto) {
    const topic = await this.topicsService.create(createTopicDto);
    return new CreateTopicResponseDto(topic);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create topics in bulk (development only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The topics have been created.',
    type: () => CreateTopicResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, EnvironmentGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Roles(RoleEnum.INSTRUCTOR)
  @EnvGuard(Environment.DEVELOPMENT)
  async createBulk(@Body() createTopicBulkDto: CreateTopicBulkDto) {
    return this.topicsService.createBulk(createTopicBulkDto.topics);
  }

  @Get()
  @ApiOperation({ summary: 'Get all topics' })
  @ApiResponse({
    type: () => CreateTopicResponseDto,
    isArray: true,
    status: HttpStatus.OK,
    description: 'List of topics.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  findAll() {
    return this.topicsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a topic by ID' })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiResponse({
    type: () => CreateTopicResponseDto,
    status: HttpStatus.OK,
    description: 'The topic has been found.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Topic not found.',
  })
  findOne(@Param('id') id: string) {
    return this.topicsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a topic' })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiResponse({
    type: () => CreateTopicResponseDto,
    status: HttpStatus.OK,
    description: 'The topic has been updated.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Topic not found.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.ADMIN)
  update(@Param('id') id: string, @Body() updateTopicDto: UpdateTopicDto) {
    return this.topicsService.update(id, updateTopicDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a topic' })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The topic has been deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Topic not found.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.ADMIN)
  remove(@Param('id') id: string) {
    return this.topicsService.remove(id);
  }
}
