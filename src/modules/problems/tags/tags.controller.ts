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
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
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
import { CreateTagResponseDto } from './dto/create-tag-response.dto';

@ApiTags('Tags')
@ApiCookieAuth('access_token')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({
    status: 201,
    description: 'The tag has been successfully created.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  @UseInterceptors(ClassSerializerInterceptor)
  async create(@Body() createTagDto: CreateTagDto) {
    const tag = await this.tagsService.create(createTagDto);
    return plainToInstance(CreateTagResponseDto, tag);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tags' })
  @ApiResponse({
    status: 200,
    description: 'List of tags retrieved successfully.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return await this.tagsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.tagsService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return await this.tagsService.update(id, updateTagDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.tagsService.remove(id);
  }
}
