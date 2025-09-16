import {
  ClassSerializerInterceptor,
  Controller,
  FileTypeValidator,
  HttpStatus,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt.interface';
import { RoleEnum } from 'src/modules/user/enums/role.enum';
import {
  TESTCASE_FIELD_NAME,
  TESTCASE_FILE_MIME_TYPE,
  TESTCASE_MAX_FILE_SIZE,
} from './constants/testcases.constant';
import { CreateTestcaseResponseDto } from './dto/create-testcase-response.dto';
import { TestcasesService } from './testcases.service';
import { CreateTestcaseDto } from './dto/create-testcase.dto';

@ApiTags('Testcases')
@ApiCookieAuth('access_token')
@Controller('testcases')
export class TestcasesController {
  constructor(private readonly testcasesService: TestcasesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a testcase by uploading a text file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: () => CreateTestcaseDto,
    description: 'Upload a text file containing the testcase data',
  })
  @ApiResponse({
    type: () => CreateTestcaseResponseDto,
    status: HttpStatus.CREATED,
    description: 'The testcase has been created.',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request.' })
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  @UseInterceptors(
    FileInterceptor(TESTCASE_FIELD_NAME),
    ClassSerializerInterceptor,
  )
  create(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: TESTCASE_MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: TESTCASE_FILE_MIME_TYPE }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    const testcase = this.testcasesService.create(file, user);
    return plainToInstance(CreateTestcaseResponseDto, testcase);
  }
}
