import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/modules/user/enums/role.enum';
import { plainToInstance } from 'class-transformer';
import { CreateTopicResponseDto } from './dto/create-topic-response.dto';

@ApiTags('Topics')
@ApiCookieAuth('access_token')
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
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async create(@Body() createTopicDto: CreateTopicDto) {
    const topic = await this.topicsService.create(createTopicDto);

    return plainToInstance(CreateTopicResponseDto, topic);
  }

  @Get()
  @ApiOperation({ summary: 'Get all topics' })
  @ApiResponse({
    type: () => [CreateTopicResponseDto],
    status: HttpStatus.OK,
    description: 'List of topics.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.topicsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a topic by ID' })
  @ApiResponse({
    type: () => CreateTopicResponseDto,
    status: HttpStatus.OK,
    description: 'The topic has been found.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Topic not found.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.topicsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a topic' })
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
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.ADMIN)
  update(@Param('id') id: string, @Body() updateTopicDto: UpdateTopicDto) {
    return this.topicsService.update(id, updateTopicDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a topic' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The topic has been deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Topic not found.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.ADMIN)
  remove(@Param('id') id: string) {
    return this.topicsService.remove(id);
  }
}
