/**
 * Pagination constants used across the application
 */
export const PAGINATION_CONSTANTS = {
  /**
   * Maximum number of items that can be requested in a single page
   */
  MAX_PAGE_SIZE: 100,

  /**
   * Default number of items per page when not specified
   */
  DEFAULT_PAGE_SIZE: 20,

  /**
   * Minimum page size allowed
   */
  MIN_PAGE_SIZE: 1,
} as const;
