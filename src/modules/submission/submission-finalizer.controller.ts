import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { CallbackProcessor } from './callback.processor';

/**
 * Processor for finalizing submissions after all test cases have been processed.
 * This class listens to the 'submission-finalize' queue and processes jobs to
 * aggregate results and send final updates to clients.
 */
@Processor('submission-finalize')
@Injectable()
export class SubmissionFinalizeProcessor extends WorkerHost {
  private readonly logger = new Logger(SubmissionFinalizeProcessor.name);

  constructor(private readonly callbackProcessor: CallbackProcessor) {
    super();
  }

  // BullMQ pattern: single entrypoint for all jobs in this queue
  async process(job: Job<{ submissionId: string }>): Promise<void> {
    switch (job.name) {
      case 'finalize': {
        const { submissionId } = job.data;
        this.logger.log(`Finalizing submission ${submissionId}...`);
        await this.callbackProcessor.finalizer(submissionId);
        this.logger.log(`Finalized submission ${submissionId}.`);
        return;
      }
      default:
        // Make unknown job types fail loudly (so you can spot misrouted jobs)
        throw new Error(`Unsupported job type: ${job.name}`);
    }
  }
}
