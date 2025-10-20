import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { CallbackProcessor } from '../helpers/callback.processor';
import { SubmissionJob, SubmissionQueue } from '../enums/submission-event.enum';

@Processor(SubmissionQueue.FINALIZE)
export class SubmissionFinalizeProcessor extends WorkerHost {
  private readonly logger = new Logger(SubmissionFinalizeProcessor.name);

  constructor(private readonly callbackProcessor: CallbackProcessor) {
    super();
  }

  // BullMQ pattern: single entrypoint for all jobs in this queue
  async process(job: Job<{ submissionId: string }>): Promise<void> {
    this.logger.log(`Processing job ${job.id}`);
    if (job.name === (SubmissionJob.FINALIZE_RUN as string)) {
      const { submissionId } = job.data;
      await this.callbackProcessor.finalizer(submissionId, false);
      this.logger.log(`Finalized submission ${submissionId}.`);
    } else if (job.name === (SubmissionJob.FINALIZE_SUBMIT as string)) {
      const { submissionId } = job.data;
      await this.callbackProcessor.finalizer(submissionId, true);
      this.logger.log(`Finalized submission ${submissionId}.`);
    } else {
      // Make unknown job types fail loudly (so you can spot misrouted jobs)
      throw new Error(`Unsupported job type: ${job.name}`);
    }
  }
}
