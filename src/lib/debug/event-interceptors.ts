/**
 * Event Interceptors for Debug Logging
 *
 * Provides utilities to intercept browser events and API calls for debugging purposes.
 * Each interceptor returns a cleanup function to restore original behavior.
 *
 * @module debug/event-interceptors
 */

/**
 * Log function signature for event interceptors
 */
type LogFunction = (
  level: 'info' | 'warn' | 'error' | 'debug',
  category: 'api' | 'user' | 'state' | 'error',
  message: string,
  metadata?: Record<string, unknown>
) => void;

/**
 * Cleanup function signature returned by all interceptors
 */
type CleanupFunction = () => void;

/**
 * Intercepts window.fetch to log all API calls
 *
 * Logs request details (method, URL, headers) and response details (status, statusText).
 * Automatically categorizes failed responses (response.ok === false) as errors.
 *
 * @param logFn - Function to call for logging
 * @returns Cleanup function that restores original fetch
 *
 * @example
 * ```typescript
 * const cleanup = interceptFetch((level, category, message, metadata) => {
 *   console.log(`[${level}] [${category}] ${message}`, metadata);
 * });
 *
 * // Later, restore original fetch
 * cleanup();
 * ```
 */
export function interceptFetch(logFn: LogFunction): CleanupFunction {
  // Store original fetch before replacing
  const originalFetch = window.fetch;

  // Replace window.fetch with logging wrapper
  window.fetch = async function (...args: Parameters<typeof fetch>): Promise<Response> {
    const [resource, init] = args;
    const url = typeof resource === 'string' ? resource : (resource instanceof URL ? resource.href : (resource as Request).url);
    const method = init?.method || 'GET';

    // Log request
    logFn('info', 'api', `API Request: ${method} ${url}`, {
      method,
      url,
      headers: init?.headers || {},
    });

    try {
      // Call original fetch
      const response = await originalFetch(...args);

      // Log response
      const level = response.ok ? 'info' : 'error';
      logFn(level, 'api', `API Response: ${method} ${url} - ${response.status} ${response.statusText}`, {
        method,
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      return response;
    } catch (error) {
      // Log fetch failure (network error, etc.)
      logFn('error', 'api', `API Request Failed: ${method} ${url}`, {
        method,
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  // Return cleanup function
  return () => {
    window.fetch = originalFetch;
  };
}

/**
 * Intercepts click events to log user interactions
 *
 * Logs details about clicked elements (tagName, id, className, textContent).
 * TextContent is truncated to 50 characters for readability.
 *
 * @param logFn - Function to call for logging
 * @returns Cleanup function that removes event listener
 *
 * @example
 * ```typescript
 * const cleanup = interceptClicks((level, category, message, metadata) => {
 *   console.log(`[${level}] [${category}] ${message}`, metadata);
 * });
 *
 * // Later, remove click listener
 * cleanup();
 * ```
 */
export function interceptClicks(logFn: LogFunction): CleanupFunction {
  // Define click handler
  const clickHandler = (event: MouseEvent) => {
    const target = event.target;

    // Handle edge case where target is null
    if (!target || !(target instanceof Element)) {
      return;
    }

    // Extract element details
    const tagName = target.tagName.toLowerCase();
    const id = target.id || '';
    const className = target.className || '';
    const textContent = target.textContent?.trim().slice(0, 50) || '';

    // Log click event
    logFn('info', 'user', `Click: <${tagName}>`, {
      tagName,
      id,
      className,
      textContent,
    });
  };

  // Add global click listener
  document.addEventListener('click', clickHandler, true); // Use capture phase

  // Return cleanup function
  return () => {
    document.removeEventListener('click', clickHandler, true);
  };
}

/**
 * Intercepts window.onerror to log global JavaScript errors
 *
 * Logs error details (message, filename, line number, column number).
 * Preserves original window.onerror behavior if it exists.
 *
 * @param logFn - Function to call for logging
 * @returns Cleanup function that restores original window.onerror
 *
 * @example
 * ```typescript
 * const cleanup = interceptErrors((level, category, message, metadata) => {
 *   console.log(`[${level}] [${category}] ${message}`, metadata);
 * });
 *
 * // Later, restore original error handler
 * cleanup();
 * ```
 */
export function interceptErrors(logFn: LogFunction): CleanupFunction {
  // Store original window.onerror (may be null)
  const originalOnError = window.onerror;

  // Replace window.onerror with logging wrapper
  window.onerror = function (
    message: string | Event,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ): boolean {
    // Extract error message
    const errorMessage = typeof message === 'string' ? message : message.type;

    // Log error
    logFn('error', 'error', `Global Error: ${errorMessage}`, {
      message: errorMessage,
      filename: source || '',
      line: lineno || 0,
      column: colno || 0,
      stack: error?.stack || '',
    });

    // Call original handler if it exists
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }

    // Return false to allow default error handling
    return false;
  };

  // Return cleanup function
  return () => {
    window.onerror = originalOnError;
  };
}
