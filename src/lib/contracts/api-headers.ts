/**
 * API Response Headers Utility
 *
 * Provides consistent header management for all API routes.
 *
 * Feature: 010-using-refactor-recommendations
 * Task: T039
 * Requirement: FR-021 (API versioning)
 */

export const API_VERSION = '1.0';

/**
 * Add standard API headers to response
 *
 * @param headers - Additional custom headers
 * @returns Headers object with API version and custom headers
 *
 * @example
 * return NextResponse.json(data, { headers: addApiHeaders() });
 *
 * @example
 * return NextResponse.json(data, {
 *   headers: addApiHeaders({ 'Cache-Control': 'max-age=300' })
 * });
 */
export function addApiHeaders(headers: Record<string, string> = {}): Record<string, string> {
  return {
    'X-API-Version': API_VERSION,
    ...headers
  };
}

/**
 * Add cache headers for GET endpoints
 *
 * @param maxAge - Cache duration in seconds (default: 300 = 5 minutes)
 * @param staleWhileRevalidate - SWR duration in seconds (default: 60 = 1 minute)
 * @returns Headers object with Cache-Control and API version
 *
 * @example
 * return NextResponse.json(data, { headers: addCacheHeaders() });
 *
 * @example
 * // 10 minute cache, 2 minute SWR
 * return NextResponse.json(data, { headers: addCacheHeaders(600, 120) });
 */
export function addCacheHeaders(
  maxAge = 300,
  staleWhileRevalidate = 60
): Record<string, string> {
  return addApiHeaders({
    'Cache-Control': `private, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  });
}

/**
 * Add no-cache headers for POST/PUT/DELETE endpoints
 *
 * @returns Headers object with no-cache directive and API version
 *
 * @example
 * return NextResponse.json(data, { headers: addNoCacheHeaders() });
 */
export function addNoCacheHeaders(): Record<string, string> {
  return addApiHeaders({
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  });
}

/**
 * Standard cache durations for different resource types
 */
export const CACHE_DURATIONS = {
  /** Static resources (5 minutes) */
  SHORT: 300,
  /** User data (10 minutes) */
  MEDIUM: 600,
  /** Rarely changing data (30 minutes) */
  LONG: 1800,
  /** Public static data (1 hour) */
  VERY_LONG: 3600
} as const;
