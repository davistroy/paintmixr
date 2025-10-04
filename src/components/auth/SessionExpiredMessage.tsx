'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

/**
 * Session Expired Toast Notification
 * Shows a toast message when user is redirected to signin due to session expiration
 */
export default function SessionExpiredMessage() {
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const reason = searchParams?.get('reason')

    if (reason === 'session_expired') {
      toast({
        title: 'Your session has expired. Please sign in again.',
        variant: 'default',
        duration: 5000,
      })
    }
  }, [searchParams, toast])

  return null
}
