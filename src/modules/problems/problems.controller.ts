import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ProblemsService } from './problems.service';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';

@Controller('problems')
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  @Post()
  async create(@Body() createProblemDto: CreateProblemDto) {
    return await this.problemsService.create(createProblemDto);
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
