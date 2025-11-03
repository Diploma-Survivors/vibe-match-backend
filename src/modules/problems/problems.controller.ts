// NestJS
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
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
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

// Shared/Common
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import {
  CursorEdgeDto,
  PaginationCursorResponseDto,
} from 'src/common/pagination/dtos/pagination-cursor-response.dto';

// Relative imports
import type { JwtPayload } from '../auth/interfaces/jwt.interface';
import { RoleEnum } from '../user/enums/role.enum';
import { CreateProblemResponseDto } from './dto/create-problem-response.dto';
import { CreateProblemDto } from './dto/create-problem.dto';
import { GetProblemForInstructorResponseDto } from './dto/get-problem-for-instructor-response.dto';
import { GetDetailProblemResponseDto } from './dto/get-problem-response.dto';
import { GetProblemsResponseDto } from './dto/get-problems-response.dto';
import { ProblemsCursorQueryDto } from './dto/problems-cursor-query.dto';
import { UpdateProblemResponseDto } from './dto/update-problem-response.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { FileInterceptor } from './interceptors/file.interceptor';
import { FileRequiredPipe } from './pipes/file-required.pipe';
import { ProblemsService } from './problems.service';

// Helper function to generate paginated response schema
const getPaginatedProblemsSchema = () => ({
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
});

// Reusable decorators for common API metadata
const ApiPaginatedProblemsResponse = () => {
  return (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    ApiExtraModels(
      PaginationCursorResponseDto,
      CursorEdgeDto,
      GetProblemsResponseDto,
    )(target, propertyKey, descriptor);
    ApiResponse({
      status: HttpStatus.OK,
      description: 'List of problems.',
      schema: getPaginatedProblemsSchema(),
    })(target, propertyKey, descriptor);
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Forbidden.',
    })(target, propertyKey, descriptor);
  };
};

const ApiInstructorAuth = () => {
  return (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    ApiBearerAuth()(target, propertyKey, descriptor);
    UseGuards(JwtAuthGuard)(target, propertyKey, descriptor);
    Roles(RoleEnum.INSTRUCTOR)(target, propertyKey, descriptor);
  };
};

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
  @ApiInstructorAuth()
  @UseInterceptors(FileInterceptor(), ClassSerializerInterceptor)
  async createProblem(
    @Body() createProblemDto: CreateProblemDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile(FileRequiredPipe) testcaseFile: Express.Multer.File,
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
  @ApiPaginatedProblemsResponse()
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
  @ApiPaginatedProblemsResponse()
  @ApiInstructorAuth()
  async findSelectableForContest(
    @Query() query: ProblemsCursorQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.problemsService.findProblemsForContestCreation(
      query,
      user,
    );
  }

  @Get(':id/detail')
  @ApiOperation({ summary: 'Get detailed problem by ID (Instructor only)' })
  @ApiParam({ name: 'id', type: 'string', description: 'Problem ID' })
  @ApiResponse({
    type: () => GetProblemForInstructorResponseDto,
    status: HttpStatus.OK,
    description: 'The problem has been found.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Problem not found.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiInstructorAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async findDetailedProblemById(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const problem = await this.problemsService.getDetailProblemForInstructor(
      +id,
      currentUser,
    );
    return new GetProblemForInstructorResponseDto(problem);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a problem by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Problem ID' })
  @ApiResponse({
    type: () => GetDetailProblemResponseDto,
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
  @UseInterceptors(ClassSerializerInterceptor)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const problem = await this.problemsService.findDetailProblemById(
      +id,
      currentUser,
    );

    return new GetDetailProblemResponseDto(problem);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a problem (Instructor only)' })
  @ApiParam({ name: 'id', type: 'string', description: 'Problem ID' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    type: () => UpdateProblemResponseDto,
    status: HttpStatus.OK,
    description: 'The problem has been updated.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Problem not found.',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @UseInterceptors(FileInterceptor())
  @ApiInstructorAuth()
  async update(
    @Param('id') id: string,
    @Body() updateProblemDto: UpdateProblemDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() testcaseFile?: Express.Multer.File,
  ) {
    await this.problemsService.updateById(
      +id,
      updateProblemDto,
      user,
      testcaseFile,
    );

    return {
      message: 'Problem updated successfully',
    };
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
  @ApiInstructorAuth()
  async remove(@Param('id') id: string) {
    return await this.problemsService.remove(id);
  }
}
