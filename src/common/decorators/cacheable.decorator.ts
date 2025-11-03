import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

/**
 * Options for the Cacheable decorator
 */
export interface CacheableOptions {
  /**
   * Cache key or function to generate cache key
   * If function, receives method arguments
   */
  key: string | ((...args: any[]) => string);

  /**
   * Time to live in seconds
   */
  ttl: number;

  /**
   * Whether to cache null/undefined values
   * @default false
   */
  cacheNullable?: boolean;
}

/**
 * Method decorator that caches the result of the decorated method
 *
 * @param options - Caching options
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @Cacheable({
 *   key: 'languages:all',
 *   ttl: CACHE_TTL.ONE_HOUR,
 * })
 * async findAll(): Promise<Language[]> {
 *   return this.repository.find();
 * }
 *
 * @Cacheable({
 *   key: (id: number) => `problem:${id}`,
 *   ttl: CACHE_TTL.FIFTEEN_MINUTES,
 * })
 * async findById(id: number): Promise<Problem> {
 *   return this.repository.findOne({ where: { id } });
 * }
 * ```
 */
export function Cacheable(options: CacheableOptions) {
  const injectCache = Inject(CACHE_MANAGER);

  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    // Inject cache manager
    injectCache(target as object, 'cacheManager');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const cacheManager: Cache = this.cacheManager as Cache;

      if (!cacheManager) {
        // If cache manager not available, execute method normally
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const cacheKey =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        typeof options.key === 'function' ? options.key(...args) : options.key;

      try {
        // Try to get from cache
        const cachedValue = await cacheManager.get(cacheKey);

        if (cachedValue !== undefined) {
          return cachedValue;
        }

        // Execute original method
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const result = await originalMethod.apply(this, args);

        // Cache the result if not nullable or cacheNullable is true
        if (
          (result !== null && result !== undefined) ||
          options.cacheNullable
        ) {
          await cacheManager.set(cacheKey, result, options.ttl * 1000);
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return result;
      } catch (error) {
        // If cache fails, execute method normally
        console.error(
          `Cache error for key ${cacheKey}:`,
          (error as Error).message,
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * Options for cache invalidation
 */
export interface CacheInvalidateOptions {
  /**
   * Cache key(s) to invalidate
   * Can be string, array of strings, or function that returns key(s)
   */
  keys: string | string[] | ((...args: any[]) => string | string[]);
}

/**
 * Method decorator that invalidates cache keys after method execution
 *
 * @param options - Cache invalidation options
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @CacheInvalidate({
 *   keys: ['languages:all']
 * })
 * async create(data: CreateLanguageDto): Promise<Language> {
 *   return this.repository.save(data);
 * }
 *
 * @CacheInvalidate({
 *   keys: (id: number) => [`problem:${id}`, 'problems:list']
 * })
 * async update(id: number, data: UpdateProblemDto): Promise<void> {
 *   await this.repository.update(id, data);
 * }
 * ```
 */
export function CacheInvalidate(options: CacheInvalidateOptions) {
  const injectCache = Inject(CACHE_MANAGER);

  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    // Inject cache manager
    injectCache(target as object, 'cacheManager');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const cacheManager: Cache = this.cacheManager;

      // Execute original method
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = await originalMethod.apply(this, args);

      if (cacheManager) {
        try {
          // Generate keys to invalidate
          let keysToInvalidate: string[];

          if (typeof options.keys === 'function') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const keys = options.keys(...args);
            keysToInvalidate = Array.isArray(keys) ? keys : [keys];
          } else if (Array.isArray(options.keys)) {
            keysToInvalidate = options.keys;
          } else {
            keysToInvalidate = [options.keys];
          }

          // Invalidate all keys
          await Promise.all(
            keysToInvalidate.map((key) => cacheManager.del(key)),
          );
        } catch (error) {
          console.error('Cache invalidation error:', (error as Error).message);
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result;
    };

    return descriptor;
  };
}
