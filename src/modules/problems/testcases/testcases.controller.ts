import {
  BadRequestException,
  ClassSerializerInterceptor,
  Controller,
  HttpStatus,
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
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt.interface';
import { RoleEnum } from 'src/modules/user/enums/role.enum';
import {
  TESTCASE_FIELD_NAME,
  TESTCASE_MAX_FILE_SIZE,
} from './constants/testcases.constant';
import { CreateTestcaseResponseDto } from './dto/create-testcase-response.dto';
import { CreateTestcaseDto } from './dto/create-testcase.dto';
import { TestcasesService } from './testcases.service';

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
    FileInterceptor(TESTCASE_FIELD_NAME, {
      limits: { fileSize: TESTCASE_MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (
          file.mimetype === 'text/plain' ||
          file.mimetype === 'text/plain; charset=utf-8'
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Invalid file type. Only plain text files are allowed.',
            ),
            false,
          );
        }
      },
    }),
    ClassSerializerInterceptor,
  )
  async create(
    @UploadedFile()
    file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    const testcase = await this.testcasesService.create(file, user);
    return new CreateTestcaseResponseDto(testcase);
  }
}
