// NestJS
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
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
import { LeaderboardCursorQueryDto } from './dto/leaderboard-cursor-query.dto';
import { SubmissionsOverviewCursorQueryDto } from './dto/submissions-overview-cursor-query.dto';
import {
  ApiContestLeadingDecorator,
  ApiPaginatedContestantDecorator,
} from './decorators/api-contest-leading.decorator';

@Controller('contests')
@ApiTags('Contests')
export class ContestsController {
  constructor(private readonly contestsService: ContestsService) {}

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
      'Retrieve detailed information about a specific contest by ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the contest',
    example: 1,
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contest details retrieved successfully',
    type: () => GetDetailContestResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request.' })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  async getDetailContest(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const contest = await this.contestsService.getDetailContest(+id, user);

    return new GetDetailContestResponseDto(contest);
  }

  @Get(':id/leaderboard')
  @ApiOperation({
    summary: 'Get contest leaderboard with rankings',
    description:
      'Retrieve the ranked list of participants for a contest with pagination support.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the contest',
    example: 1,
  })
  @ApiContestLeadingDecorator()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getLeaderboard(
    @Param('id') id: number,
    @Query() query: LeaderboardCursorQueryDto,
  ) {
    return this.contestsService.getLeaderboard(id, query);
  }

  @Get(':id/submissions/overview')
  @ApiOperation({
    summary: 'Get contest submissions overview (instructor/admin only)',
    description:
      'Retrieve the grid view of best scores for every student on every problem. Only accessible to instructors and admins.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the contest',
    example: 1,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiPaginatedContestantDecorator()
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async getSubmissionsOverview(
    @Param('id') id: string,
    @Query() query: SubmissionsOverviewCursorQueryDto,
  ) {
    return this.contestsService.getSubmissionsOverview(+id, query);
  }
}
