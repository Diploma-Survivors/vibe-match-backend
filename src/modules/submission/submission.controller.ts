import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  HttpCode,
  MessageEvent,
  Param,
  Post,
  Put,
  Query,
  Sse,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { finalize, interval, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiTags } from '@nestjs/swagger';
import { SubmissionService } from './submission.service';
import { SubmissionsSseService } from './events/submission-sse.service';
import { CallbackProcessor } from './helpers/callback.processor';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  SUBMISSION_PING_DATA,
  SUBMISSION_PING_EVENT,
  SUBMISSION_PING_TIME,
} from '../../common/constants/submission.constant';
import * as judge0Interface from '../judge0/judge0.interface';
import type { JwtPayload } from '../auth/interfaces/jwt.interface';
import { SkipTransformResponse } from '../../common/decorators/skip-transform.decorator';

@ApiTags('submissions')
@Controller('submissions')
@UseInterceptors(ClassSerializerInterceptor)
export class SubmissionController {
  constructor(
    private readonly submissionService: SubmissionService,
    private readonly submissionsSseService: SubmissionsSseService,
    private readonly submissionCallbackProcessor: CallbackProcessor,
  ) {}

  @Post('run')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async run(
    @Body() dto: CreateSubmissionDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.submissionService.run(dto, file);
  }

  @Post('submit')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async submit(
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.submissionService.submit(dto, user, file);
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

  @Sse(':id/stream')
  @SkipTransformResponse()
  @Sse(':id/stream')
  streamResults(@Param('id') submissionId: string): Observable<MessageEvent> {
    const ping$ = interval(SUBMISSION_PING_TIME).pipe(
      map(() => ({ type: SUBMISSION_PING_EVENT, data: SUBMISSION_PING_DATA })),
    );

    return merge(this.submissionsSseService.connect(submissionId), ping$).pipe(
      finalize(() => this.submissionsSseService.cleanup(submissionId)),
    );
  }
}
