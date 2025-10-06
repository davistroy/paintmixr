/**
 * Database Query Performance Logger
 *
 * Logs slow database queries to help identify performance bottlenecks.
 *
 * Feature: 010-using-refactor-recommendations
 * Task: T036b
 * Requirement: NFR-030 (database performance monitoring)
 */

import { logger } from '@/lib/logging/logger';

export interface QueryLogContext {
  query?: string;
  table?: string;
  operation?: 'select' | 'insert' | 'update' | 'delete' | 'rpc';
  filters?: Record<string, unknown>;
  user_id?: string;
}

/**
 * Log slow database queries that exceed the threshold
 *
 * @param context - Query context (query string, table, operation, filters)
 * @param duration - Query duration in milliseconds
 * @param threshold - Threshold in ms (default: 100ms)
 */
export function logSlowQuery(
  context: QueryLogContext,
  duration: number,
  threshold = 100
): void {
  if (duration > threshold) {
    logger.warn({
      message: 'Slow database query detected',
      duration_ms: duration,
      threshold_ms: threshold,
      performance_impact: duration > threshold * 2 ? 'high' : 'medium',
      ...context
    });
  }
}

/**
 * Measure and log query execution time
 *
 * @example
 * const result = await measureQuery(
 *   { table: 'paints', operation: 'select', user_id: userId },
 *   async () => supabase.from('paints').select('*').eq('user_id', userId)
 * );
 */
export async function measureQuery<T>(
  context: QueryLogContext,
  queryFn: () => Promise<T>,
  threshold = 100
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;

    logSlowQuery(context, duration, threshold);

    // Log all queries in development for debugging
    if (process.env.NODE_ENV === 'development') {
      logger.debug({
        message: 'Database query executed',
        duration_ms: Math.round(duration),
        ...context
      });
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    logger.error({
      message: 'Database query failed',
      duration_ms: Math.round(duration),
      error,
      ...context
    });

    throw error;
  }
}

/**
 * Create a query logger for a specific table
 *
 * @example
 * const paintsLogger = createTableLogger('paints');
 * const result = await paintsLogger(
 *   { operation: 'select', filters: { user_id: userId } },
 *   async () => supabase.from('paints').select('*')
 * );
 */
export function createTableLogger(table: string, defaultThreshold = 100) {
  return async <T>(
    context: Omit<QueryLogContext, 'table'>,
    queryFn: () => Promise<T>,
    threshold = defaultThreshold
  ): Promise<T> => {
    return measureQuery({ ...context, table }, queryFn, threshold);
  };
}

/**
 * Performance thresholds for different operation types
 */
export const QUERY_THRESHOLDS = {
  select: 100,      // SELECT queries should be under 100ms
  insert: 50,       // INSERT queries should be under 50ms
  update: 50,       // UPDATE queries should be under 50ms
  delete: 50,       // DELETE queries should be under 50ms
  rpc: 200,         // RPC/function calls can be slower (up to 200ms)
  aggregation: 250, // Aggregations/analytics can be slower (up to 250ms)
} as const;
