import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
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
import { type JwtPayload } from '../auth/interfaces/jwt.interface';
import { RoleEnum } from '../user/enums/role.enum';
import { ContestsService } from './contests.service';
import { ContestsCursorQueryDto } from './dto/contests-cursor-query.dto';
import { CreateContestDto } from './dto/create-contest.dto';
import { GetContestsResponseDto } from './dto/get-contests-response.dto';

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
    type: CreateContestDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async createContest(
    @Body() createContestDto: CreateContestDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.contestsService.createContest(createContestDto, currentUser);
  }

  @Get()
  @ApiOperation({
    summary: 'Get a list of contests with cursor-based pagination',
    description:
      'Retrieve a list of contests with support for cursor-based pagination, filtering, and sorting.',
  })
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
  @Roles(RoleEnum.STUDENT)
  async findContests(
    @Query() contestsCursorQueryDto: ContestsCursorQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.contestsService.findContests(
      contestsCursorQueryDto,
      currentUser,
    );
  }
}
