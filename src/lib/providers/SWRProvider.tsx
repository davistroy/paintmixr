/**
 * SWR Provider
 *
 * Global configuration for SWR client-side data fetching.
 *
 * Feature: 010-using-refactor-recommendations
 * Task: T033
 * Requirement: FR-014 (client-side caching)
 */

'use client'

import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'

interface SWRProviderProps {
  children: ReactNode
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Dedupe identical requests within 5 seconds
        dedupingInterval: 5000,

        // Revalidate when window regains focus
        revalidateOnFocus: true,

        // Revalidate when browser regains network connection
        revalidateOnReconnect: true,

        // Don't revalidate when component mounts if data is already cached
        revalidateOnMount: false,

        // Retry on error (3 attempts with exponential backoff)
        shouldRetryOnError: true,
        errorRetryCount: 3,
        errorRetryInterval: 5000,

        // Default fetcher using native fetch API
        fetcher: async (url: string) => {
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
          }
          return response.json()
        },
      }}
    >
      {children}
    </SWRConfig>
  )
}
