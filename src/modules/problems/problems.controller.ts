import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ProblemsService } from './problems.service';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt.interface';

@Controller('problems')
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createProblemDto: CreateProblemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.problemsService.create(createProblemDto, user);
  }

  @Get()
  async findAll() {
    return await this.problemsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.problemsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProblemDto: UpdateProblemDto,
  ) {
    return await this.problemsService.update(id, updateProblemDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.problemsService.remove(id);
  }
}
