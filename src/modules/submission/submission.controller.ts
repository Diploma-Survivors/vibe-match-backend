import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Res,
  Sse,
  UseInterceptors,
  MessageEvent,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionService } from './submission.service';
import * as judge0Interface from '../judge0/judge0.interface';
import { CallbackProcessor } from './helpers/callback.processor';
import { interval, map, merge, Observable } from 'rxjs';
import {
  SUBMISSION_PING_DATA,
  SUBMISSION_PING_EVENT,
  SUBMISSION_PING_TIME,
} from '../../common/constants/submission.constant';
import { SubmissionsSseService } from './events/submission-sse.service';
import { ServerResponse } from 'node:http';
import { SkipDataResponse } from '../../common/interceptors/skip-data-response.interceptor';

@ApiTags('submissions')
@Controller('submissions')
@UseInterceptors(ClassSerializerInterceptor)
export class SubmissionController {
  constructor(
    private readonly submissionService: SubmissionService,
    private readonly submissionsSseService: SubmissionsSseService,
    private readonly submissionCallbackProcessor: CallbackProcessor,
  ) {}

  @Post('/run')
  @ApiOperation({ summary: 'Submit code for execution' })
  @ApiResponse({
    status: 201,
    description: 'Code submitted successfully',
    type: String,
  })
  async run(
    @Body() dto: CreateSubmissionDto,
  ): Promise<{ submissionId: string }> {
    return this.submissionService.run(dto);
  }

  // Called by Redis to get final result
  @Put('judge0/callback')
  @ApiOperation({ summary: 'Judge0 callback endpoint' })
  @ApiResponse({
    status: 204,
    description: 'Returned callback endpoint successfully',
  })
  @HttpCode(204)
  handleCallback(
    @Query('sid') submissionId: string,
    @Query('tcid') testCaseId: number,
    @Body() result: judge0Interface.Judge0Response,
  ) {
    // fire and forget
    this.submissionCallbackProcessor.handleCallback(
      submissionId,
      testCaseId,
      result,
    );
  }

  @Sse(':id/stream')
  @ApiOperation({ summary: 'Stream submission results' })
  @SkipDataResponse()
  streamResults(
    @Param('id') submissionId: string,
    @Res() res: Response,
  ): Observable<MessageEvent> {
    // heartbeat ping
    const ping$: Observable<MessageEvent> = interval(SUBMISSION_PING_TIME).pipe(
      map(() => ({
        type: SUBMISSION_PING_EVENT,
        data: SUBMISSION_PING_DATA,
      })),
    );

    const rawRes = res as unknown as ServerResponse; // workaround for Fastify

    // Setup cleanup on connection close
    const onClose = () => {
      this.submissionsSseService.cleanup(submissionId);
      rawRes.removeListener('close', onClose);
    };

    rawRes.on('close', onClose);

    // connect returns Observable that forwards events (ReplaySubject backed)
    const data$ = this.submissionsSseService.connect(submissionId);

    return merge(data$, ping$);
  }
}
