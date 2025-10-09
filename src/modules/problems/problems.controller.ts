import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import {
  CursorEdgeDto,
  PaginationCursorResponseDto,
} from 'src/common/pagination/dtos/pagination-cursor-response.dto';
import type { JwtPayload } from '../auth/interfaces/jwt.interface';
import { RoleEnum } from '../user/enums/role.enum';
import {
  TESTCASE_FILE_FIELD_NAME,
  TESTCASE_FILE_MIME_TYPE,
  TESTCASE_MAX_FILE_SIZE,
} from './constants/testcase.constant';
import { CreateProblemResponseDto } from './dto/create-problem-response.dto';
import { CreateProblemDto } from './dto/create-problem.dto';
import { GetProblemResponseDto } from './dto/get-problem-response.dto';
import { GetProblemsResponseDto } from './dto/get-problems-response.dto';
import { ProblemsCursorQueryDto } from './dto/problems-cursor-query.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { ProblemsService } from './problems.service';

@ApiTags('Problems')
@Controller('problems')
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a problem (Instructor only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The problem has been created.',
    type: () => CreateProblemResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor(TESTCASE_FILE_FIELD_NAME, {
      limits: { fileSize: TESTCASE_MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== TESTCASE_FILE_MIME_TYPE) {
          return cb(
            new BadRequestException(
              'Invalid file type. File must be a text/plain file.',
            ),
            false,
          );
        }

        return cb(null, true);
      },
    }),
    ClassSerializerInterceptor,
  )
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async createProblem(
    @Body() createProblemDto: CreateProblemDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() testcaseFile: Express.Multer.File,
  ) {
    const problem = await this.problemsService.create(
      createProblemDto,
      user,
      testcaseFile,
    );
    return new CreateProblemResponseDto(problem);
  }

  @Get('training')
  @ApiOperation({
    summary: 'Get list problems for training',
    description: 'Get list problems that students can practice on',
  })
  @ApiExtraModels(
    PaginationCursorResponseDto,
    CursorEdgeDto,
    GetProblemsResponseDto,
  )
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of problems.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginationCursorResponseDto) },
        {
          properties: {
            edges: {
              type: 'array',
              items: {
                allOf: [
                  {
                    $ref: getSchemaPath(CursorEdgeDto),
                  },
                  {
                    properties: {
                      node: { $ref: getSchemaPath(GetProblemsResponseDto) },
                    },
                  },
                ],
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.STUDENT)
  async findTrainableProblems(
    @Query() query: ProblemsCursorQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.problemsService.findProblemsByStudent(query, user);
  }

  @Get('selectable-for-contest')
  @ApiOperation({
    summary: 'Get list problems for contest creation',
    description:
      'Get list problems that instructors can select to add to a contest',
  })
  @ApiExtraModels(
    PaginationCursorResponseDto,
    CursorEdgeDto,
    GetProblemsResponseDto,
  )
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of problems.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginationCursorResponseDto) },
        {
          properties: {
            edges: {
              type: 'array',
              items: {
                allOf: [
                  {
                    $ref: getSchemaPath(CursorEdgeDto),
                  },
                  {
                    properties: {
                      node: { $ref: getSchemaPath(GetProblemsResponseDto) },
                    },
                  },
                ],
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async findSelectableForContest(
    @Query() query: ProblemsCursorQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.problemsService.findProblemsForContestCreation(
      query,
      user,
    );
  }

  @Get('selectable-for-assignment')
  @ApiOperation({
    summary: 'Get list problems for assignment creation',
    description:
      'Get list problems that instructors can select to add to an assignment',
  })
  @ApiExtraModels(
    PaginationCursorResponseDto,
    CursorEdgeDto,
    GetProblemsResponseDto,
  )
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of problems.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginationCursorResponseDto) },
        {
          properties: {
            edges: {
              type: 'array',
              items: {
                allOf: [
                  {
                    $ref: getSchemaPath(CursorEdgeDto),
                  },
                  {
                    properties: {
                      node: { $ref: getSchemaPath(GetProblemsResponseDto) },
                    },
                  },
                ],
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async findSelectableForAssignment(@Query() query: ProblemsCursorQueryDto) {
    return await this.problemsService.findProblemsForAssignmentCreation(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a problem by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Problem ID' })
  @ApiResponse({
    type: () => GetProblemResponseDto,
    status: HttpStatus.OK,
    description: 'The problem has been found.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Problem not found.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.problemsService.findDetailProblemById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a problem (Instructor only)' })
  @ApiParam({ name: 'id', type: 'string', description: 'Problem ID' })
  @ApiResponse({
    type: () => CreateProblemResponseDto,
    status: HttpStatus.OK,
    description: 'The problem has been updated.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Problem not found.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async update(
    @Param('id') id: string,
    @Body() updateProblemDto: UpdateProblemDto,
  ) {
    return await this.problemsService.update(id, updateProblemDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a problem (Instructor only)' })
  @ApiParam({ name: 'id', type: 'string', description: 'Problem ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The problem has been deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Problem not found.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async remove(@Param('id') id: string) {
    return await this.problemsService.remove(id);
  }
}
