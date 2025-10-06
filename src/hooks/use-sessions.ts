import { useState, useCallback } from 'react'
import type { SessionData, CreateSessionRequest } from '@/lib/types'

interface SessionListParams {
  limit?: number
  offset?: number
  favorites_only?: boolean
  session_type?: 'color_matching' | 'ratio_prediction'
}

interface SessionListResponse {
  sessions: SessionData[]
  total_count: number
  has_next: boolean
}

interface UseSessionsState {
  sessions: SessionData[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
  totalCount: number
  hasNext: boolean
  currentParams: SessionListParams
}

interface UseSessionsResult extends UseSessionsState {
  fetchSessions: (params?: SessionListParams, reset?: boolean) => Promise<void>
  createSession: (sessionData: CreateSessionRequest) => Promise<SessionData>
  updateSession: (sessionId: string, updates: Partial<SessionData>) => Promise<SessionData>
  deleteSession: (sessionId: string) => Promise<void>
  toggleFavorite: (sessionId: string) => Promise<void>
  loadMore: () => Promise<void>
  reset: () => void
}

const defaultParams: SessionListParams = {
  limit: 12,
  offset: 0,
  favorites_only: false,
}

export const useSessions = (): UseSessionsResult => {
  const [state, setState] = useState<UseSessionsState>({
    sessions: [],
    isLoading: false,
    isSaving: false,
    error: null,
    totalCount: 0,
    hasNext: false,
    currentParams: defaultParams,
  })

  const fetchSessions = useCallback(async (
    params: SessionListParams = {},
    reset: boolean = false
  ) => {
    const finalParams = { ...defaultParams, ...params }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      currentParams: finalParams,
    }))

    try {
      const searchParams = new URLSearchParams()

      if (finalParams.limit) searchParams.append('limit', finalParams.limit.toString())
      if (finalParams.offset) searchParams.append('offset', finalParams.offset.toString())
      if (finalParams.favorites_only) searchParams.append('favorites_only', 'true')
      if (finalParams.session_type) searchParams.append('session_type', finalParams.session_type)

      const response = await fetch(`/api/sessions?${searchParams.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch sessions')
      }

      const data: SessionListResponse = await response.json()

      setState(prev => ({
        ...prev,
        isLoading: false,
        sessions: reset ? data.sessions : [...prev.sessions, ...data.sessions],
        totalCount: data.total_count,
        hasNext: data.has_next,
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch sessions',
      }))
    }
  }, [])

  const createSession = useCallback(async (sessionData: CreateSessionRequest): Promise<SessionData> => {
    setState(prev => ({ ...prev, isSaving: true, error: null }))

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create session')
      }

      const newSession: SessionData = await response.json()

      setState(prev => ({
        ...prev,
        isSaving: false,
        sessions: [newSession, ...prev.sessions],
        totalCount: prev.totalCount + 1,
      }))

      return newSession
    } catch (err) {
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: err instanceof Error ? err.message : 'Failed to create session',
      }))
      throw err
    }
  }, [])

  const updateSession = useCallback(async (
    sessionId: string,
    updates: Partial<SessionData>
  ): Promise<SessionData> => {
    setState(prev => ({ ...prev, error: null }))

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update session')
      }

      const updatedSession: SessionData = await response.json()

      setState(prev => ({
        ...prev,
        sessions: prev.sessions.map(session =>
          session.id === sessionId ? updatedSession : session
        ),
      }))

      return updatedSession
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to update session',
      }))
      throw err
    }
  }, [])

  const deleteSession = useCallback(async (sessionId: string): Promise<void> => {
    setState(prev => ({ ...prev, error: null }))

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete session')
      }

      setState(prev => ({
        ...prev,
        sessions: prev.sessions.filter(session => session.id !== sessionId),
        totalCount: prev.totalCount - 1,
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to delete session',
      }))
      throw err
    }
  }, [])

  const toggleFavorite = useCallback(async (sessionId: string): Promise<void> => {
    const session = state.sessions.find(s => s.id === sessionId)
    if (!session) return

    await updateSession(sessionId, { is_favorite: !session.is_favorite })
  }, [state.sessions, updateSession])

  const loadMore = useCallback(async (): Promise<void> => {
    if (state.isLoading || !state.hasNext) return

    const nextOffset = state.sessions.length
    await fetchSessions(
      { ...state.currentParams, offset: nextOffset },
      false
    )
  }, [state.isLoading, state.hasNext, state.sessions.length, state.currentParams, fetchSessions])

  const reset = useCallback(() => {
    setState({
      sessions: [],
      isLoading: false,
      isSaving: false,
      error: null,
      totalCount: 0,
      hasNext: false,
      currentParams: defaultParams,
    })
  }, [])

  return {
    ...state,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
    toggleFavorite,
    loadMore,
    reset,
  }
}