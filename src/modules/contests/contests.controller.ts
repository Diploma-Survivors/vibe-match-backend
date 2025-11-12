// NestJS
import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { type JwtPayload } from '../auth/interfaces/jwt.interface';
import { RoleEnum } from '../user/enums/role.enum';
import { ContestsService } from './contests.service';
import { ContestsCursorQueryDto } from './dto/contests-cursor-query.dto';
import { CreateContestResponseDto } from './dto/create-contest-response.dto';
import { CreateContestDto } from './dto/create-contest.dto';
import { GetContestsResponseDto } from './dto/get-contests-response.dto';
import { GetDetailContestResponseDto } from './dto/get-detail-contest-response.dto';
import { StartParticipationResponseDto } from './dto/start-participation-response.dto';
import { GetContestProblemsResponseDto } from './dto/get-contest-problems-response.dto';
import { GetContestProblemDetailResponseDto } from './dto/get-contest-problem-detail-response.dto';
import { ContestParticipationService } from './services/contest-participation.service';
import { ContestProblemsService } from './services/contest-problems.service';

@Controller('contests')
@ApiTags('Contests')
export class ContestsController {
  constructor(
    private readonly contestsService: ContestsService,
    private readonly contestParticipationService: ContestParticipationService,
    private readonly contestProblemsService: ContestProblemsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new contest',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Contest created successfully',
    type: () => CreateContestResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Roles(RoleEnum.INSTRUCTOR)
  async createContest(
    @Body() createContestDto: CreateContestDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const contest = await this.contestsService.createContest(
      createContestDto,
      currentUser,
    );
    return new CreateContestResponseDto(contest);
  }

  @Get()
  @ApiOperation({
    summary: 'Get a list of contests with cursor-based pagination',
    description:
      'Retrieve a list of contests with support for cursor-based pagination, filtering, and sorting.',
  })
  @ApiExtraModels(
    PaginationCursorResponseDto,
    CursorEdgeDto,
    GetContestsResponseDto,
  )
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of contests retrieved successfully',
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
                      node: { $ref: getSchemaPath(GetContestsResponseDto) },
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
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR)
  async findContests(
    @Query() contestsCursorQueryDto: ContestsCursorQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.contestsService.findContests(
      contestsCursorQueryDto,
      currentUser,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get detailed information about a specific contest',
    description:
      'Retrieve detailed information about a specific contest by ID. User must have started participation to access.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the contest',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contest details retrieved successfully',
    type: () => GetDetailContestResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Contest not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description:
      'User does not have access to this contest or has not started participation',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR)
  async getDetailContest(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const contest = await this.contestsService.getDetailContest(+id, user);

    return new GetDetailContestResponseDto(contest);
  }

  @Post(':id/participate')
  @ApiOperation({
    summary: 'Start participation in a contest',
    description:
      'Start participating in a contest. Creates a participation record and calculates end time based on duration.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the contest',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Participation started successfully',
    type: () => StartParticipationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Contest not started yet, already ended, or user already participating',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have access to this contest',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR)
  async startParticipation(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const contest = await this.contestsService.findOne({ id: +id });
    if (!contest) {
      throw new BadRequestException('Contest not found');
    }

    if (contest.courseId !== user.courseId) {
      throw new ForbiddenException('You do not have access to this contest');
    }

    return this.contestParticipationService.startParticipation(
      contest,
      user.userId,
    );
  }

  @Get(':id/problems')
  @ApiOperation({
    summary: 'Get list of problems in a contest',
    description:
      'Retrieve all problems belonging to the contest with their maximum scores. User must have started participation to access.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the contest',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contest problems retrieved successfully',
    type: () => GetContestProblemsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Contest not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description:
      'User does not have access to this contest or has not started participation',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR)
  async getContestProblems(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const contest = await this.contestsService.findOne({ id: +id });
    if (!contest) {
      throw new BadRequestException('Contest not found');
    }

    if (contest.courseId !== user.courseId) {
      throw new ForbiddenException('You do not have access to this contest');
    }

    await this.contestParticipationService.validateAccess(+id, user.userId);

    return this.contestProblemsService.getContestProblems(+id);
  }

  @Get(':contestId/problems/:problemId')
  @ApiOperation({
    summary: 'Get detailed information about a specific problem in a contest',
    description:
      'Retrieve full problem details including description, constraints, and sample test cases. User must have started participation to access.',
  })
  @ApiParam({
    name: 'contestId',
    description: 'The unique identifier of the contest',
    example: 1,
  })
  @ApiParam({
    name: 'problemId',
    description: 'The unique identifier of the problem',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Problem details retrieved successfully',
    type: () => GetContestProblemDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Contest not found',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Problem not found in this contest',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description:
      'User does not have access to this contest or has not started participation',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR)
  async getContestProblemDetail(
    @Param('contestId') contestId: string,
    @Param('problemId') problemId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const contest = await this.contestsService.findOne({ id: +contestId });
    if (!contest) {
      throw new BadRequestException('Contest not found');
    }

    if (contest.courseId !== user.courseId) {
      throw new ForbiddenException('You do not have access to this contest');
    }

    await this.contestParticipationService.validateAccess(
      +contestId,
      user.userId,
    );

    return this.contestProblemsService.getContestProblemDetail(
      +contestId,
      +problemId,
    );
  }
}
