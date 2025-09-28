'use client'

import React, { useState, useEffect } from 'react'
import type { SessionData } from '@/types/types'
import SessionCard from '@/components/session-manager/SessionCard'

interface SessionListResponse {
  sessions: SessionData[]
  total_count: number
  has_next: boolean
}

const HistoryPage: React.FC = () => {
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [sessionTypeFilter, setSessionTypeFilter] = useState<'all' | 'color_matching' | 'ratio_prediction'>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  const ITEMS_PER_PAGE = 12

  const fetchSessions = async (page: number = 1, reset: boolean = false) => {
    setIsLoading(true)
    setError('')

    try {
      const offset = (page - 1) * ITEMS_PER_PAGE
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: offset.toString(),
      })

      if (sessionTypeFilter !== 'all') {
        params.append('session_type', sessionTypeFilter)
      }

      if (favoritesOnly) {
        params.append('favorites_only', 'true')
      }

      const response = await fetch(`/api/sessions?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch sessions')
      }

      const data: SessionListResponse = await response.json()

      if (reset || page === 1) {
        setSessions(data.sessions)
      } else {
        setSessions(prev => [...prev, ...data.sessions])
      }

      setTotalCount(data.total_count)
      setHasNext(data.has_next)
      setCurrentPage(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions(1, true)
  }, [sessionTypeFilter, favoritesOnly])

  const handleLoadMore = () => {
    if (!isLoading && hasNext) {
      fetchSessions(currentPage + 1, false)
    }
  }

  const handleSessionAction = async (sessionId: string, action: 'favorite' | 'delete') => {
    try {
      if (action === 'delete') {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to delete session')
        }

        setSessions(prev => prev.filter(session => session.id !== sessionId))
        setTotalCount(prev => prev - 1)
      } else if (action === 'favorite') {
        const session = sessions.find(s => s.id === sessionId)
        if (!session) return

        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_favorite: !session.is_favorite,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to update session')
        }

        const updatedSession: SessionData = await response.json()

        setSessions(prev =>
          prev.map(s => s.id === sessionId ? updatedSession : s)
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    }
  }

  const getFilteredCount = () => {
    if (sessionTypeFilter === 'all' && !favoritesOnly) {
      return totalCount
    }
    return sessions.length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"></div>
                <h1 className="text-xl font-bold text-gray-900">PaintMixr</h1>
              </a>
            </div>
            <nav className="flex items-center gap-4">
              <a
                href="/"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                New Mix
              </a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Session History</h1>
          <p className="text-gray-600">
            View and manage your saved paint mixing sessions
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Type:</label>
                <select
                  value={sessionTypeFilter}
                  onChange={(e) => setSessionTypeFilter(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="color_matching">Color Matching</option>
                  <option value="ratio_prediction">Ratio Prediction</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={favoritesOnly}
                  onChange={(e) => setFavoritesOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Favorites Only</span>
              </label>
            </div>

            <div className="text-sm text-gray-500">
              {getFilteredCount()} {getFilteredCount() === 1 ? 'session' : 'sessions'}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Sessions Grid */}
        {sessions.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onFavorite={() => handleSessionAction(session.id, 'favorite')}
                  onDelete={() => handleSessionAction(session.id, 'delete')}
                  compactMode={false}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasNext && (
              <div className="flex justify-center pt-6">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      Load More
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-600">Loading sessions...</span>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  {sessionTypeFilter !== 'all' || favoritesOnly ? 'No matching sessions found' : 'No sessions yet'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {sessionTypeFilter !== 'all' || favoritesOnly
                    ? 'Try adjusting your filters to see more sessions.'
                    : 'Start mixing colors to create your first saved session.'
                  }
                </p>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create New Mix
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default HistoryPage