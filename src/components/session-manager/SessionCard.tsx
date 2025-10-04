'use client'

import React, { useState } from 'react'
import type { MixingSession } from '@/lib/types'
import ColorValueComponent from '@/components/color-display/ColorValue'
import { useToast } from '@/hooks/use-toast'

interface SessionCardProps {
  session: MixingSession
  onClick?: (session: MixingSession) => void
  onFavorite?: () => Promise<void>
  onFavoriteToggle?: (sessionId: string, isFavorite: boolean) => void
  onDelete?: (sessionId: string) => void
  onEdit?: (sessionId: string) => void
  onView?: (sessionId: string) => void
  onDetailClick?: (sessionId: string) => void
  showActions?: boolean
  compactMode?: boolean
  className?: string
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onDetailClick,
  showActions = true,
  compactMode = false,
  className = '',
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { toast } = useToast()

  const handleCardClick = () => {
    if (!onDetailClick) {
      // Detail view not implemented yet - show placeholder toast
      toast({
        title: 'Session details view coming soon',
        variant: 'default',
        duration: 3000,
      })
      return
    }

    // Call parent handler (for future implementation)
    onDetailClick(session.id)
  }

  const isDetailedSession = (s: MixingSession): boolean => {
    return 'input_method' in s
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getSessionTypeLabel = (type: string): string => {
    return type === 'color_matching' ? 'Color Match' : 'Ratio Prediction'
  }

  const getSessionTypeIcon = (type: string): React.JSX.Element => {
    if (type === 'color_matching') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
        </svg>
      )
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  }

  const detailedSession = isDetailedSession(session) ? (session as any) : null;

  if (compactMode) {
    return (
      <div
        className={`bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow cursor-pointer ${className}`}
        onClick={handleCardClick}
        data-testid="session-card"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Session Type Icon */}
            <div className="text-gray-400">
              {getSessionTypeIcon((session as any).session_type)}
            </div>

            {/* Colors */}
            <div className="flex gap-2">
              {detailedSession?.targetColor && (
                <ColorValueComponent
                  color={detailedSession.targetColor}
                  size="sm"
                  showDetails={false}
                />
              )}
              {detailedSession?.calculatedColor && (
                <ColorValueComponent
                  color={detailedSession.calculatedColor}
                  size="sm"
                  showDetails={false}
                />
              )}
            </div>

            {/* Session Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {(session as any).custom_label || getSessionTypeLabel((session as any).session_type)}
              </p>
              <p className="text-xs text-gray-500">
                {formatDate((session as any).created_at)}
              </p>
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-2">
              {/* Favorite */}
              <button
                onClick={() => {}}
                className={`p-1 rounded transition-colors ${
                  (session as any).is_favorite
                    ? 'text-yellow-500 hover:text-yellow-600'
                    : 'text-gray-400 hover:text-yellow-500'
                }`}
              >
                <svg className="w-4 h-4" fill={(session as any).is_favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>

              {/* View */}
              <button
                onClick={handleCardClick}
                className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${className}`}
      onClick={handleCardClick}
      data-testid="session-card"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-gray-400">
              {getSessionTypeIcon((session as any).session_type)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {(session as any).custom_label || getSessionTypeLabel((session as any).session_type)}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{formatDate((session as any).created_at)}</span>
                {(session as any).updated_at !== (session as any).created_at && (
                  <span>• Updated {formatDate((session as any).updated_at)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          {showActions && (
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleCardClick()
                        setIsMenuOpen(false)
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
                    </button>
                    <button
                      onClick={() => {
                        
                        setIsMenuOpen(false)
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        
                        setIsMenuOpen(false)
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <svg className="w-4 h-4" fill={(session as any).is_favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      {(session as any).is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        
                        setIsMenuOpen(false)
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Favorite Star */}
        {(session as any).is_favorite && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Favorite
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Colors */}
        {detailedSession && (detailedSession.targetColor || detailedSession.calculatedColor) && (
          <div className="mb-4">
            <div className="flex items-center gap-4">
              {detailedSession.targetColor && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Target</p>
                  <ColorValueComponent
                    color={detailedSession.targetColor}
                    size="md"
                    showDetails={true}
                    showLab={false}
                  />
                </div>
              )}
              {detailedSession.calculatedColor && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Result</p>
                  <ColorValueComponent
                    color={detailedSession.calculatedColor}
                    size="md"
                    showDetails={true}
                    showLab={false}
                  />
                </div>
              )}
            </div>

            {/* Delta E */}
            {detailedSession.delta_e !== undefined && (
              <div className="mt-2">
                <p className="text-xs text-gray-500">
                  Color accuracy: <span className="font-mono font-medium">ΔE {detailedSession.delta_e.toFixed(2)}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Formula Summary */}
        {detailedSession?.formula && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Paint Formula</p>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-2">
                {detailedSession.formula.paint_ratios.length} paints • {detailedSession.formula.total_volume_ml.toFixed(1)} ml total
              </p>
              <div className="space-y-1">
                {detailedSession.formula.paint_ratios.slice(0, 3).map((ratio: any, index: number) => (
                  <div key={`${ratio.paint_id}-${index}`} className="flex justify-between text-xs">
                    <span className="text-gray-700 truncate">{ratio.paint_name || ratio.paint_id}</span>
                    <span className="text-gray-500 font-mono ml-2">{ratio.percentage.toFixed(1)}%</span>
                  </div>
                ))}
                {detailedSession.formula.paint_ratios.length > 3 && (
                  <p className="text-xs text-gray-500">
                    +{detailedSession.formula.paint_ratios.length - 3} more...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {detailedSession?.notes && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
            <p className="text-sm text-gray-600 line-clamp-2">
              {detailedSession.notes}
            </p>
          </div>
        )}

        {/* Session Metadata */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{getSessionTypeLabel((session as any).session_type)}</span>
          {detailedSession?.input_method && (
            <span>• {detailedSession.input_method.replace('_', ' ')}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default SessionCard