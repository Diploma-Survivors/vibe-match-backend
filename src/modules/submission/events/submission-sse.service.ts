import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  MessageEvent,
} from '@nestjs/common';
import { Observable, ReplaySubject } from 'rxjs';
import { Redis } from 'ioredis';
import { REDIS } from '../../../shared/redis/redis.module';
import {
  SUBMISSION_CLEANUP_STREAM_TIME,
  SUBMISSION_EVENT_REDIS_CHANNEL,
  SUBMISSION_REPLAY_SUBJECT_BUFFER,
  SUBMISSION_RESULT_EVENT,
} from '../../../common/constants/submission.constant';

@Injectable()
export class SubmissionsSseService implements OnModuleInit {
  private readonly logger = new Logger(SubmissionsSseService.name);
  private sub: Redis;

  private readonly streams = new Map<string, ReplaySubject<MessageEvent>>();
  // fallback to cleanup if client disconnects wrongly (no proper SSE close - currently we not support Fastify onClose, only Express)
  private readonly cleanupTimers = new Map<string, NodeJS.Timeout>();
  private readonly cleanupMs = SUBMISSION_CLEANUP_STREAM_TIME;

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onModuleInit(): Promise<void> {
    this.sub = this.redis.duplicate();

    await this.sub.subscribe(SUBMISSION_EVENT_REDIS_CHANNEL);
    this.sub.on('message', (_channel, message) => {
      try {
        const { submissionId, payload } = JSON.parse(message) as {
          submissionId: string;
          payload: object;
        };
        this.forwardEvent(submissionId, payload);
      } catch (err) {
        this.logger.error('Invalid pubsub message', err);
      }
    });
  }

  connect(submissionId: string): Observable<MessageEvent> {
    let stream = this.streams.get(submissionId);
    if (!stream) {
      stream = new ReplaySubject<MessageEvent>(
        SUBMISSION_REPLAY_SUBJECT_BUFFER,
      );
      this.streams.set(submissionId, stream);
    }

    // cancel any pending cleanup fallback
    const t = this.cleanupTimers.get(submissionId);
    if (t) {
      clearTimeout(t);
      this.cleanupTimers.delete(submissionId);
    }

    return stream.asObservable();
  }

  forwardEvent(submissionId: string, data: object) {
    let stream = this.streams.get(submissionId);
    if (!stream) {
      stream = new ReplaySubject<MessageEvent>(
        SUBMISSION_REPLAY_SUBJECT_BUFFER,
      );
      this.streams.set(submissionId, stream);
    }

    const event: MessageEvent = {
      type: SUBMISSION_RESULT_EVENT,
      data: data,
    };
    stream.next(event);

    if (!this.cleanupTimers.has(submissionId)) {
      const t = setTimeout(() => this.cleanup(submissionId), this.cleanupMs);
      this.cleanupTimers.set(submissionId, t);
    }
  }

  cleanup(submissionId: string) {
    const stream = this.streams.get(submissionId);
    if (stream) {
      stream.complete();
      this.streams.delete(submissionId);
    }
    const t = this.cleanupTimers.get(submissionId);
    if (t) {
      clearTimeout(t);
      this.cleanupTimers.delete(submissionId);
    }
  }
}
