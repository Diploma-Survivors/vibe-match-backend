/**
 * Redis TTL constants for caching
 */
export const CACHE_TTL = {
  /**
   * One hour in seconds - for static data like languages, tags, topics
   */
  ONE_HOUR: 3600,

  /**
   * Fifteen minutes in seconds - for semi-static data like problem details
   */
  FIFTEEN_MINUTES: 900,

  /**
   * Five minutes in seconds - for dynamic data like statistics
   */
  FIVE_MINUTES: 300,

  /**
   * One minute in seconds - for highly dynamic data
   */
  ONE_MINUTE: 60,
} as const;
