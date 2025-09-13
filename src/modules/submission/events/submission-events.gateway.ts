import { Injectable } from '@nestjs/common';
import { Observable, ReplaySubject } from 'rxjs';

export interface SseEvent<T = any> {
  data: T;
  event?: string; // 'result'
  id?: string;
  retry?: number;
}

@Injectable()
export class SubmissionsSseService {
  private streams = new Map<string, ReplaySubject<SseEvent>>();

  connect(submissionId: string): Observable<SseEvent> {
    let stream = this.streams.get(submissionId);
    if (!stream) {
      stream = new ReplaySubject<SseEvent>(1); // allow late subscribers to get the last event
      this.streams.set(submissionId, stream);
    }
    return stream.asObservable();
  }

  emitFinal<T>(submissionId: string, payload: T) {
    let stream = this.streams.get(submissionId);
    if (!stream) {
      stream = new ReplaySubject<SseEvent>(1);
      this.streams.set(submissionId, stream);
    }
    stream.next({ event: 'result', data: payload });
    stream.complete();

    // Keep replay for late joiners (e.g., 60s), then clean up
    setTimeout(() => this.streams.delete(submissionId), 60_000);
  }
}
