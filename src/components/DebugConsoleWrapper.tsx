'use client'

import { DebugConsole } from '@/components/DebugConsole'
import { useDebug } from '@/contexts/DebugContext'

/**
 * Client component wrapper for DebugConsole
 * Conditionally renders DebugConsole based on debug mode state
 */
export function DebugConsoleWrapper() {
  const { isDebugEnabled } = useDebug()
  return <DebugConsole isVisible={isDebugEnabled} />
}
