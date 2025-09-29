import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { CallbackProcessor } from '../helpers/callback.processor';
import {
  QUEUE_FINALIZE_RUN_JOB,
  QUEUE_FINALIZE_SUBMIT_JOB,
} from '../../../common/constants/submission.constant';

@Processor('submission-finalize')
@Injectable()
export class SubmissionFinalizeProcessor extends WorkerHost {
  private readonly logger = new Logger(SubmissionFinalizeProcessor.name);

  constructor(private readonly callbackProcessor: CallbackProcessor) {
    super();
  }

  // BullMQ pattern: single entrypoint for all jobs in this queue
  async process(job: Job<{ submissionId: string }>): Promise<void> {
    if (job.name === QUEUE_FINALIZE_RUN_JOB) {
      const { submissionId } = job.data;
      await this.callbackProcessor.finalizer(submissionId, false);
      this.logger.log(`Finalized submission ${submissionId}.`);
    } else if (job.name === QUEUE_FINALIZE_SUBMIT_JOB) {
      const { submissionId } = job.data;
      await this.callbackProcessor.finalizer(submissionId, true);
      this.logger.log(`Finalized submission ${submissionId}.`);
    } else {
      // Make unknown job types fail loudly (so you can spot misrouted jobs)
      throw new Error(`Unsupported job type: ${job.name}`);
    }
  }
}
