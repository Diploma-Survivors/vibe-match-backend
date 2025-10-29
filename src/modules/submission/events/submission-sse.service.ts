import {
  Inject,
  Injectable,
  Logger,
  MessageEvent,
  OnModuleInit,
} from '@nestjs/common';
import { Observable, ReplaySubject } from 'rxjs';
import { Redis } from 'ioredis';
import { REDIS } from '../../../shared/redis/redis.module';
import { ConfigService } from '@nestjs/config';
import { SubmissionConstants } from '../constants/submission.constant';
import { SubmissionEvent } from '../enums/submission-event.enum';

@Injectable()
export class SubmissionsSseService implements OnModuleInit {
  private readonly logger = new Logger(SubmissionsSseService.name);
  private sub: Redis;

  private readonly streams = new Map<string, ReplaySubject<MessageEvent>>();

  private readonly cleanupTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.sub = this.redis.duplicate();

    await this.sub.subscribe(SubmissionConstants.EVENT_REDIS_CHANNEL);
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
        SubmissionConstants.REPLAY_SUBJECT_BUFFER,
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
        SubmissionConstants.REPLAY_SUBJECT_BUFFER,
      );
      this.streams.set(submissionId, stream);
    }

    const event: MessageEvent = {
      type: SubmissionEvent.RESULT,
      data: data,
    };
    stream.next(event);

    if (!this.cleanupTimers.has(submissionId)) {
      const cleanupMs = this.configService.get<number>(
        'submission.streamCleanupMs',
      );
      const t = setTimeout(() => this.cleanup(submissionId), cleanupMs);
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
