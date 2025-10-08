export class TimeUtil {
  static msToSeconds(ms: number): number {
    return Math.ceil(ms / 1000);
  }
}
