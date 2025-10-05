/**
 * useDebugLog Hook
 *
 * Provides convenient access to the debug logging functionality from DebugContext.
 * This hook is a simple wrapper that extracts the `log` function for manual logging.
 *
 * @example
 * ```typescript
 * import { useDebugLog } from '@/hooks/useDebugLog'
 *
 * function MyComponent() {
 *   const { log } = useDebugLog()
 *
 *   const handleClick = () => {
 *     log('User clicked button', { buttonId: 'submit' })
 *   }
 *
 *   return <button onClick={handleClick}>Submit</button>
 * }
 * ```
 *
 * @returns Object containing the log function from DebugContext
 */

import { useDebug } from '@/contexts/DebugContext'

export function useDebugLog() {
  const { log } = useDebug()

  return { log }
}
