import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  UseGuards,
  FileTypeValidator,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { TestcasesService } from './testcases.service';
import { UpdateTestcaseDto } from './dto/update-testcase.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt.interface';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/modules/user/enums/role.enum';
import { plainToInstance } from 'class-transformer';
import { CreateTestcaseResponseDto } from './dto/create-testcase-response.dto';

@ApiTags('Testcases')
@ApiCookieAuth('access_token')
@Controller('testcases')
export class TestcasesController {
  constructor(private readonly testcasesService: TestcasesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a testcase by uploading a text file' })
  @ApiResponse({ status: 201, description: 'The testcase has been created.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  @UseInterceptors(FileInterceptor('file'), ClassSerializerInterceptor)
  create(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'text/plain' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    const testcase = this.testcasesService.create(file, user);
    return plainToInstance(CreateTestcaseResponseDto, testcase, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  findAll() {
    return this.testcasesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.testcasesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTestcaseDto: UpdateTestcaseDto,
  ) {
    return this.testcasesService.update(id, updateTestcaseDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.testcasesService.remove(id);
  }
}
