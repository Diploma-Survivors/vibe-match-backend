import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionService } from './submission.service';
import { Observable } from 'rxjs';
import * as judge0Interface from '../judge0/judge0.interface';
import { CallbackProcessor } from './callback.processor';
import {
  SseEvent,
  SubmissionsSseService,
} from './events/submission-events.gateway';

@ApiTags('submissions')
@Controller('submissions')
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
  @Post('callback')
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
  streamResults(@Param('id') submissionId: string): Observable<SseEvent> {
    return this.submissionsSseService.connect(submissionId);
  }
}
