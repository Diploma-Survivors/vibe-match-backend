import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  HttpCode,
  HttpStatus,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { finalize, interval, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubmissionService } from './submission.service';
import { SubmissionsSseService } from './events/submission-sse.service';
import { CallbackProcessor } from './helpers/callback.processor';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionConstants } from './constants/submission.constant';
import * as judge0Interface from '../judge0/judge0.interface';
import { SkipTransformResponse } from '../../common/decorators/skip-transform.decorator';
import { SubmissionEvent } from './enums/submission-event.enum';
import { ConfigService } from '@nestjs/config';
import { SubmissionResultDto } from './dto/submission.result.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt.interface';

@ApiTags('submissions')
@Controller('submissions')
@UseInterceptors(ClassSerializerInterceptor)
export class SubmissionController {
  constructor(
    private readonly submissionService: SubmissionService,
    private readonly submissionsSseService: SubmissionsSseService,
    private readonly submissionCallbackProcessor: CallbackProcessor,
    private readonly configService: ConfigService,
  ) {}

  @Post('run')
  @ApiResponse({
    type: () => SubmissionResultDto,
    status: HttpStatus.OK,
    description: 'Code has been submitted successfully.',
  })
  // @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  // @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async run(
    @Body() dto: CreateSubmissionDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.submissionService.run(dto, file);
  }

  @Post('submit')
  @ApiResponse({
    type: () => SubmissionResultDto,
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
  async submit(
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.submissionService.submit(dto, user, file);
  }

  // @Post('/contest/:contestId/submit')
  // @ApiResponse({
  //   type: () => SubmissionResultDto,
  //   status: HttpStatus.OK,
  //   description: 'Code has been submitted successfully.',
  // })
  // @ApiBearerAuth()
  // @ApiResponse({
  //   status: HttpStatus.UNAUTHORIZED,
  //   description: 'Unauthorized',
  // })
  // @ApiResponse({
  //   status: HttpStatus.FORBIDDEN,
  //   description: 'You are not allowed to submit to this contest.',
  // })
  // @UseGuards(JwtAuthGuard)
  // @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  // async submitToContest(
  //   @Param('contestId') contestId: string,
  //   @Body() dto: CreateSubmissionDto,
  //   @CurrentUser() user: JwtPayload,
  //   @UploadedFile() file?: Express.Multer.File,
  // ) {
  //   return this.submissionService.submitToContest(contestId, dto, user, file);
  // }
  //
  // @Get('/problem/:problemId')
  // @ApiResponse({
  //   type: () => [SubmissionResultDto],
  //   status: HttpStatus.OK,
  //   description: 'List of submissions has been retrieved successfully.',
  // })
  // @ApiBearerAuth()
  // @ApiResponse({
  //   status: HttpStatus.UNAUTHORIZED,
  //   description: 'Unauthorized',
  // })
  // @ApiResponse({
  //   status: HttpStatus.FORBIDDEN,
  //   description: 'You are not allowed to view submissions of this problem.',
  // })
  // @ApiPaginatedSubmissionsResponse()
  // @UseGuards(JwtAuthGuard)
  // async getByProblem(
  //   @Param('problemId') problemId: string,
  //   @Query() query: SubmissionsCursorQueryDto,
  //   @CurrentUser() user: JwtPayload,
  // ) {
  //   return this.submissionService.getListSubmissionOfUserInOneProblem(
  //     problemId,
  //     user,
  //     query,
  //   );
  // }

  // @Get('/contest/:contestId/problem/:problemId')
  // @ApiResponse({
  //   type: () => [SubmissionResultDto],
  //   status: HttpStatus.OK,
  //   description: 'List of submissions has been retrieved successfully.',
  // })
  // @ApiBearerAuth()
  // @ApiResponse({
  //   status: HttpStatus.UNAUTHORIZED,
  //   description: 'Unauthorized',
  // })
  // @ApiResponse({
  //   status: HttpStatus.FORBIDDEN,
  //   description:
  //     'You are not allowed to view submissions of this problem in this contest.',
  // })
  // @UseGuards(JwtAuthGuard)
  // async getByContestAndProblem(
  //   @Param('contestId') contestId: string,
  //   @Param('problemId') problemId: string,
  //   @CurrentUser() user: JwtPayload,
  // ) {
  //   return this.submissionService.getByContestAndProblem(
  //     contestId,
  //     problemId,
  //     user,
  //   );
  // }

  // @Get('/:id')
  // @ApiOperation({
  //   summary: 'Get a submission by ID',
  //   description: 'Retrieve a specific submission by its unique ID.',
  // })
  // @ApiResponse({
  //   type: () => SubmissionResultDto,
  //   status: HttpStatus.OK,
  //   description: 'Get a submission by ID successfully.',
  // })
  // @ApiBearerAuth()
  // @ApiResponse({
  //   status: HttpStatus.UNAUTHORIZED,
  //   description: 'Unauthorized',
  // })
  // @ApiResponse({
  //   status: HttpStatus.FORBIDDEN,
  //   description: 'You are not allowed to view this submission.',
  // })
  // @UseGuards(JwtAuthGuard)
  // async getById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
  //   return this.submissionService.getDetailSubmissionById(id, user);
  // }

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
        /* processor logs errors */
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
