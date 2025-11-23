import { Controller, Get, Param } from '@nestjs/common';
import { LanguageService } from './language.service';
import { ApiResponse } from '@nestjs/swagger';
import { LanguageDto } from './dto/language.dto';

@Controller('languages')
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  // TODO: Add caching to this endpoint
  @Get()
  @ApiResponse({
    status: 200,
    description: 'List of all programming languages',
    example: [
      {
        id: 1,
        name: 'Python',
      },
    ],
    type: [LanguageDto],
  })
  findAll() {
    return this.languageService.findAll();
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Details of a specific programming language',
    type: LanguageDto,
  })
  findOne(@Param('id') id: string) {
    return this.languageService.findOne(+id);
  }
}
