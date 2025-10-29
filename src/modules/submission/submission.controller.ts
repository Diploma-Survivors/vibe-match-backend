// Built-in
import { finalize, interval, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// NestJS
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  MessageEvent,
  Param,
  Post,
  Put,
  Query,
  Sse,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

// Third-party
import { string } from 'joi';
import { memoryStorage } from 'multer';

// Shared/Common
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipTransformResponse } from '../../common/decorators/skip-transform.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// Relative imports
import * as judge0Interface from '../judge0/judge0.interface';
import { SubmissionConstants } from './constants/submission.constant';
import { ApiPaginatedSubmissionsResponse } from './decorators/api-paginated-submissions.decorator';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionDetailDto } from './dto/detail-submission.dto';
import { QuerySubmissionsFilterDto } from './dto/query-submission-filter.dto';
import { SubmissionsCursorQueryDto } from './dto/submission-cursor-query.dto';
import { SubmissionEvent } from './enums/submission-event.enum';
import { SubmissionsSseService } from './events/submission-sse.service';
import { CallbackProcessor } from './helpers/callback.processor';
import { SubmissionService } from './submission.service';

// Type imports
import type { JwtPayload } from '../auth/interfaces/jwt.interface';

@ApiTags('submissions')
@Controller('submissions')
@UseInterceptors(ClassSerializerInterceptor)
export class SubmissionController {
  logger = new Logger(SubmissionController.name);
  constructor(
    private readonly submissionService: SubmissionService,
    private readonly submissionsSseService: SubmissionsSseService,
    private readonly submissionCallbackProcessor: CallbackProcessor,
    private readonly configService: ConfigService,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('run')
  @ApiResponse({
    type: () => string,
    status: HttpStatus.OK,
    description: 'Code has been submitted successfully.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async run(
    @Body() dto: CreateSubmissionDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.submissionService.executeTestRun(dto, file);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('submit')
  @ApiResponse({
    type: () => string,
    status: HttpStatus.OK,
    description: 'Code has been submitted successfully.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async submitForGrading(
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.submissionService.submitForGrading(dto, user, file);
  }

  @Post('/contest-participation/:contestId/submit')
  @ApiResponse({
    type: () => string,
    status: HttpStatus.OK,
    description: 'Code has been submitted successfully.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You are not allowed to submit to this contest.',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async submitToContest(
    @Param('contestId') contestId: number,
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.submissionService.submitToContest(contestId, dto, user, file);
  }

  @Get('/problem/:problemId')
  @ApiBearerAuth()
  @ApiPaginatedSubmissionsResponse()
  @UseGuards(JwtAuthGuard)
  @ApiQuery({
    name: 'filters',
    required: false,
    style: 'deepObject',
    explode: true,
    schema: { $ref: getSchemaPath(QuerySubmissionsFilterDto) },
  })
  async getByProblem(
    @Param('problemId') problemId: number,
    @Query() query: SubmissionsCursorQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.submissionService.getListSubmissionOfUserInOneProblem(
      problemId,
      user,
      query,
    );
  }

  @Get('/contest-participation/:contestParticipationId/problem/:problemId')
  @ApiBearerAuth()
  @ApiPaginatedSubmissionsResponse()
  @UseGuards(JwtAuthGuard)
  async getByContestAndProblem(
    @Param('contestParticipationId') contestParticipationId: number,
    @Param('problemId') problemId: number,
    @Query() query: SubmissionsCursorQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.submissionService.getByContestParticipationAndProblem(
      contestParticipationId,
      problemId,
      query,
      user,
    );
  }

  @Get('/:id')
  @ApiOperation({
    summary: 'Get a submission by ID',
    description: 'Retrieve a specific submission by its unique ID.',
  })
  @ApiResponse({
    type: () => SubmissionDetailDto,
    status: HttpStatus.OK,
    description: 'Get a submission by ID successfully.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You are not allowed to view this submission.',
  })
  @UseGuards(JwtAuthGuard)
  async getById(@Param('id') id: number, @CurrentUser() user: JwtPayload) {
    return this.submissionService.getDetailSubmissionById(id, user);
  }

  @Put('judge0/callback/run')
  @HttpCode(204)
  handleRunCallback(
    @Query('sid') submissionId: string,
    @Query('tcid') tcid: number,
    @Body() result: judge0Interface.Judge0Response,
  ) {
    // fire-and-forget - controller should return 204 immediately
    this.submissionCallbackProcessor
      .handleCallback(submissionId, Number(tcid), result, false)
      .catch(() => {
        this.logger.error(
          'Failed to process run callback for submission ' + submissionId,
        );
      });
  }

  @Put('judge0/callback/submit')
  @HttpCode(204)
  handleSubmitCallback(
    @Query('sid') submissionId: string,
    @Query('tcid') tcid: number,
    @Body() result: judge0Interface.Judge0Response,
  ) {
    this.submissionCallbackProcessor
      .handleCallback(submissionId, Number(tcid), result, true)
      .catch(() => {});
  }

  @SkipTransformResponse()
  @Sse(':id/stream')
  streamResults(@Param('id') submissionId: string): Observable<MessageEvent> {
    const ping$ = interval(
      this.configService.get<number>('submission.pingTime'),
    ).pipe(
      map(() => ({
        type: SubmissionEvent.PING,
        data: SubmissionConstants.PING_DATA,
      })),
    );

    return merge(this.submissionsSseService.connect(submissionId), ping$).pipe(
      finalize(() => this.submissionsSseService.cleanup(submissionId)),
    );
  }
}
