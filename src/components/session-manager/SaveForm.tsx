'use client'

import React, { useState } from 'react'
import type { CreateSessionRequest, ColorValue, MixingFormula, InputMethod, SessionType } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { translateApiError } from '@/lib/errors/user-messages'

interface SaveFormProps {
  sessionType: SessionType
  inputMethod: InputMethod
  targetColor?: ColorValue
  calculatedColor?: ColorValue
  deltaE?: number
  formula?: MixingFormula
  onSave: (sessionData: CreateSessionRequest) => Promise<void>
  onCancel: () => void
  onSuccess?: () => void
  isLoading?: boolean
  className?: string
}

const SaveForm: React.FC<SaveFormProps> = ({
  sessionType,
  inputMethod,
  targetColor,
  calculatedColor,
  deltaE,
  formula,
  onSave,
  onCancel,
  onSuccess,
  isLoading = false,
  className = '',
}) => {
  const [customLabel, setCustomLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState('')
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate required fields
    if (customLabel.trim().length === 0) {
      setError('Session name is required')
      return
    }

    if (customLabel.length > 100) {
      setError('Session name must be 100 characters or less')
      return
    }

    if (notes.length > 1000) {
      setError('Notes must be 1000 characters or less')
      return
    }

    // Validate image URL if provided
    if (imageUrl && !isValidUrl(imageUrl)) {
      setError('Please enter a valid image URL')
      return
    }

    try {
      const sessionData: CreateSessionRequest = {
        session_type: sessionType,
        input_method: inputMethod,
        target_color: targetColor,
        calculated_color: calculatedColor,
        delta_e: deltaE,
        formula,
        custom_label: customLabel.trim(),
        notes: notes.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
      }

      await onSave(sessionData)

      // Success toast now shown by parent component (page.tsx)
      // Parent will close dialog after showing toast

      // Call onSuccess callback immediately (parent handles toast + delay)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      // Translate error to user-friendly message
      const userMessage = translateApiError({
        status: (err as any)?.response?.status,
        code: (err as any)?.code,
        message: err instanceof Error ? err.message : undefined,
      })

      // Show error toast
      toast({
        title: userMessage,
        variant: 'destructive',
        duration: 5000,
      })

      // Also log technical error for debugging
      console.error('Session save failed:', err)

      // Keep inline error as fallback
      setError(userMessage)
    }
  }

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string)
      return true
    } catch {
      return false
    }
  }

  const getSessionTypeLabel = (type: string): string => {
    return type === 'color_matching' ? 'Color Matching' : 'Ratio Prediction'
  }

  const getInputMethodLabel = (method: string): string => {
    switch (method) {
      case 'color_picker': return 'Color Picker'
      case 'image_upload': return 'Image Upload'
      case 'manual_ratios': return 'Manual Ratios'
      default: return method
    }
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Save Mixing Session</h3>
        <p className="text-sm text-gray-600 mt-1">
          Save this {getSessionTypeLabel(sessionType).toLowerCase()} session for future reference
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6">
        {/* Session Preview */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Session Summary</h4>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Type:</span>
              <span className="ml-2 text-gray-800">{getSessionTypeLabel(sessionType)}</span>
            </div>
            <div>
              <span className="text-gray-500">Input:</span>
              <span className="ml-2 text-gray-800">{getInputMethodLabel(inputMethod)}</span>
            </div>

            {deltaE !== undefined && (
              <div>
                <span className="text-gray-500">Accuracy:</span>
                <span className="ml-2 text-gray-800 font-mono">ΔE {deltaE.toFixed(2)}</span>
              </div>
            )}

            {formula && (
              <div>
                <span className="text-gray-500">Formula:</span>
                <span className="ml-2 text-gray-800">
                  {formula.paint_ratios.length} paints, {formula.total_volume_ml.toFixed(1)} ml
                </span>
              </div>
            )}
          </div>

          {/* Color Preview */}
          {(targetColor || calculatedColor) && (
            <div className="mt-4">
              <div className="flex gap-4">
                {targetColor && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-gray-300"
                      style={{ backgroundColor: targetColor.hex }}
                    />
                    <span className="text-xs text-gray-600">Target: {targetColor.hex}</span>
                  </div>
                )}
                {calculatedColor && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-gray-300"
                      style={{ backgroundColor: calculatedColor.hex }}
                    />
                    <span className="text-xs text-gray-600">Result: {calculatedColor.hex}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Session Name */}
          <div>
            <label htmlFor="customLabel" className="block text-sm font-medium text-gray-700 mb-1">
              Session Name *
            </label>
            <input
              type="text"
              id="customLabel"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g., Sunset Orange Mix, Blue-Gray for Living Room"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={100}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              {customLabel.length}/100 characters
            </p>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this color mix, usage, or adjustments..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              maxLength={1000}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              {notes.length}/1000 characters
            </p>
          </div>

          {/* Image URL */}
          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Reference Image URL
            </label>
            <input
              type="url"
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/reference-image.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional: Link to a reference image for this color
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !customLabel.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Session
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default SaveForm