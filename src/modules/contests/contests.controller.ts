// NestJS
import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
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
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

// Third-party
import { memoryStorage } from 'multer';

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
import { CreateSubmissionDto } from '../submission/dto/create-submission.dto';
import { SubmissionsCursorQueryDto } from '../submission/dto/submission-cursor-query.dto';
import { SubmissionService } from '../submission/submission.service';
import { RoleEnum } from '../user/enums/role.enum';
import { ContestsService } from './contests.service';
import { ContestsCursorQueryDto } from './dto/contests-cursor-query.dto';
import { CreateContestResponseDto } from './dto/create-contest-response.dto';
import { CreateContestDto } from './dto/create-contest.dto';
import { GetContestsResponseDto } from './dto/get-contests-response.dto';
import { GetDetailContestResponseDto } from './dto/get-detail-contest-response.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { AddProblemToContestDto } from './dto/add-problem-to-contest.dto';
import { UpdateContestProblemDto } from './dto/update-contest-problem.dto';
import { StartParticipationResponseDto } from './dto/start-participation-response.dto';
import { GetContestProblemsResponseDto } from './dto/get-contest-problems-response.dto';
import { GetContestProblemDetailResponseDto } from './dto/get-contest-problem-detail-response.dto';
import { GetParticipantsResponseDto } from './dto/get-participants-response.dto';
import { GetContestOverviewResponseDto } from './dto/get-contest-overview-response.dto';
import { FinishParticipationResponseDto } from './dto/finish-participation-response.dto';
import { ContestParticipationService } from './services/contest-participation.service';
import { ContestProblemsService } from './services/contest-problems.service';

@Controller('contests')
@ApiTags('Contests')
export class ContestsController {
  constructor(
    private readonly contestsService: ContestsService,
    private readonly contestParticipationService: ContestParticipationService,
    private readonly contestProblemsService: ContestProblemsService,
    private readonly submissionService: SubmissionService,
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

  @Get(':id/overview')
  @ApiOperation({
    summary: 'Get contest overview information',
    description:
      'Retrieve basic contest information without problem list. Accessible to all users in the course without requiring participation.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the contest',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contest overview retrieved successfully',
    type: () => GetContestOverviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contest not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have access to this contest',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR)
  async getContestOverview(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.contestsService.getContestOverview(+id, user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get detailed information about a specific contest',
    description:
      'Retrieve detailed information about a specific contest by ID including problem list. User must have started participation to access.',
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

  @Post(':id/finish')
  @ApiOperation({
    summary: 'Finish participation in a contest',
    description:
      'Allows a student to manually finish their contest participation before their allocated time expires. Once finished, no further submissions are allowed. Cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the contest',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Participation finished successfully',
    type: () => FinishParticipationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Contest not found, participation not started, already finished, or participation time already expired',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have access to this contest',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR)
  async finishParticipation(
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

    const participation =
      await this.contestParticipationService.finishParticipation(
        +id,
        user.userId,
      );

    return {
      participationId: participation.id,
      contestId: participation.contest.id,
      startTime: participation.startTime,
      finishedAt: participation.finishedAt,
      endTime: participation.endTime,
      finalScore: participation.finalScore,
      message: 'Contest participation finished successfully',
    };
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

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a contest',
    description:
      'Partially update contest details such as name, description, start/end time. Only the contest author can update it.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the contest',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contest updated successfully',
    type: () => CreateContestResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contest not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the contest author can update it',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Roles(RoleEnum.INSTRUCTOR)
  async updateContest(
    @Param('id') id: string,
    @Body() updateContestDto: UpdateContestDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const contest = await this.contestsService.updateContest(
      +id,
      updateContestDto,
      currentUser,
    );
    return new CreateContestResponseDto(contest);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a contest',
    description: 'Delete a contest. Only the contest author can delete it.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the contest',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Contest deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contest not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the contest author can delete it',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async deleteContest(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    await this.contestsService.deleteContest(+id, currentUser);
  }

  @Post(':id/problems')
  @ApiOperation({
    summary: 'Add a problem to a contest',
    description:
      'Link an existing problem to a contest with a specific score. Only the contest author can add problems.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the contest',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Problem added to contest successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Problem already exists in contest or problem not accessible',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contest not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the contest author can add problems',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async addProblemToContest(
    @Param('id') id: string,
    @Body() addProblemDto: AddProblemToContestDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.contestsService.addProblemToContest(
      +id,
      addProblemDto,
      currentUser,
    );
  }

  @Patch(':id/problems/:problemId')
  @ApiOperation({
    summary: 'Update a problem in a contest',
    description:
      'Update the score of a problem in a contest. Only the contest author can update problems.',
  })
  @ApiParam({
    name: 'id',
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
    description: 'Problem updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contest or problem not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the contest author can update problems',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async updateContestProblem(
    @Param('id') id: string,
    @Param('problemId') problemId: string,
    @Body() updateDto: UpdateContestProblemDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.contestsService.updateContestProblem(
      +id,
      +problemId,
      updateDto,
      currentUser,
    );
  }

  @Delete(':id/problems/:problemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a problem from a contest',
    description:
      'Remove a problem from a contest. Only the contest author can remove problems.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the contest',
    example: 1,
  })
  @ApiParam({
    name: 'problemId',
    description: 'The unique identifier of the problem',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Problem removed from contest successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contest or problem not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the contest author can remove problems',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async removeProblemFromContest(
    @Param('id') id: string,
    @Param('problemId') problemId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    await this.contestsService.removeProblemFromContest(
      +id,
      +problemId,
      currentUser,
    );
  }

  @Get(':id/participants')
  @ApiOperation({
    summary: 'Get list of participants in a contest',
    description:
      'Retrieve all users who have started participating in the contest. Only the contest author can view participants.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the contest',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Participants list retrieved successfully',
    type: () => GetParticipantsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contest not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the contest author can view participants',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async getContestParticipants(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.contestsService.getContestParticipants(+id, currentUser);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post(':id/submit')
  @ApiOperation({
    summary: 'Submit a solution to a problem within a contest',
    description:
      "Submit code for grading to a specific problem in a contest. The contest participation is automatically determined from the authenticated user and contest ID - do NOT send contestParticipationId in the request body. Automatically calculates aggregated contest score and syncs with Moodle via LTI. Deadline enforcement follows the contest's deadlineEnforcement strategy: STRICT (hard deadline at contest.endTime) or FLEXIBLE (allows late submissions until lateDeadline for untimed contests, or participation.startTime + durationMinutes for timed contests).",
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the contest',
    example: 1,
  })
  @ApiResponse({
    type: () => String,
    status: HttpStatus.OK,
    description:
      'Code has been submitted successfully. Returns a submission ID for tracking via SSE.',
    schema: {
      example: {
        submissionId: '550e8400-e29b-41d4-a716-446655440000',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Contest not started yet, deadline has passed (based on enforcement strategy), participation time ended, late deadline passed, or problem not in contest. Deadline enforcement: STRICT (always contest.endTime or participation.endTime) or FLEXIBLE (participation.startTime + durationMinutes for timed contests, or lateDeadline for untimed contests)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description:
      'You have not started participation in this contest. Please join the contest first.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You are not allowed to submit to this contest.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async submitToContest(
    @Param('id') contestId: string,
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.submissionService.submitToContest(+contestId, dto, user, file);
  }

  @Get(':id/submissions')
  @ApiOperation({
    summary: 'Get all submissions for a contest',
    description:
      'Retrieve all submissions made by the authenticated user in this contest. Supports pagination and optional filtering by problem.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the contest',
    example: 1,
  })
  @ApiQuery({
    name: 'problemId',
    description: 'Optional: Filter submissions by specific problem ID',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Submissions retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'You have not started participation in this contest',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have access to this contest',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR)
  async getContestSubmissions(
    @Param('id') contestId: string,
    @Query() query: SubmissionsCursorQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const problemId = (query as any).problemId
      ? +(query as any).problemId
      : undefined;
    return this.submissionService.getByContest(
      +contestId,
      query,
      user,
      problemId,
    );
  }
}
