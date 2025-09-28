'use client'

import React, { useState, useRef, useCallback } from 'react'
import type { ColorValue, ImageColorExtractionResponse } from '@/types/types'

interface ImageUploadProps {
  onColorExtracted: (color: ColorValue) => void
  className?: string
  disabled?: boolean
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onColorExtracted,
  className = '',
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [extractionMethod, setExtractionMethod] = useState<'dominant' | 'average' | 'point'>('dominant')
  const [clickCoordinates, setClickCoordinates] = useState<{ x: number; y: number } | null>(null)
  const [error, setError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const resetState = () => {
    setUploadedImage(null)
    setClickCoordinates(null)
    setError('')
  }

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)')
      return false
    }

    if (file.size > maxSize) {
      setError('File size must be less than 10MB')
      return false
    }

    return true
  }

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const extractColorFromAPI = async (imageData: string, method: 'dominant' | 'average' | 'point', coordinates?: { x: number; y: number }) => {
    const response = await fetch('/api/image/extract-color', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_data: imageData,
        extraction_method: method,
        coordinates,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to extract color')
    }

    const data: ImageColorExtractionResponse = await response.json()
    return data.extracted_color
  }

  const processFile = async (file: File) => {
    if (!validateFile(file)) return

    setIsProcessing(true)
    setError('')

    try {
      const base64 = await convertFileToBase64(file)
      setUploadedImage(base64)

      // Auto-extract color using the selected method
      if (extractionMethod !== 'point') {
        const extractedColor = await extractColorFromAPI(base64, extractionMethod)
        onColorExtracted(extractedColor)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (extractionMethod !== 'point' || !uploadedImage || isProcessing) return

    const rect = imageRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Convert to image coordinates
    const imageX = Math.round((x / rect.width) * (imageRef.current?.naturalWidth || 0))
    const imageY = Math.round((y / rect.height) * (imageRef.current?.naturalHeight || 0))

    setClickCoordinates({ x: imageX, y: imageY })
    setIsProcessing(true)

    try {
      const extractedColor = await extractColorFromAPI(uploadedImage, 'point', { x: imageX, y: imageY })
      onColorExtracted(extractedColor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract color')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMethodChange = async (method: 'dominant' | 'average' | 'point') => {
    setExtractionMethod(method)
    setClickCoordinates(null)

    if (uploadedImage && method !== 'point') {
      setIsProcessing(true)
      try {
        const extractedColor = await extractColorFromAPI(uploadedImage, method)
        onColorExtracted(extractedColor)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to extract color')
      } finally {
        setIsProcessing(false)
      }
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Extraction Method Selection */}
      <div className="flex flex-wrap gap-2">
        <label className="text-sm font-medium text-gray-700 mr-2">
          Extraction Method:
        </label>
        {(['dominant', 'average', 'point'] as const).map((method) => (
          <button
            key={method}
            onClick={() => handleMethodChange(method)}
            disabled={disabled || isProcessing}
            className={`
              px-3 py-1 text-xs rounded-full border transition-colors
              ${extractionMethod === method
                ? 'bg-blue-100 border-blue-300 text-blue-800'
                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
              }
              ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {method === 'dominant' && 'Dominant Color'}
            {method === 'average' && 'Average Color'}
            {method === 'point' && 'Click to Pick'}
          </button>
        ))}
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors
          ${isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        {!uploadedImage ? (
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-4">
              <p className="text-lg font-medium text-gray-700">
                Drop an image here, or click to browse
              </p>
              <p className="text-sm text-gray-500 mt-1">
                PNG, JPG, GIF, or WebP up to 10MB
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <img
              ref={imageRef}
              src={uploadedImage}
              alt="Uploaded"
              className={`
                max-w-full max-h-64 mx-auto rounded border
                ${extractionMethod === 'point' ? 'cursor-crosshair' : 'cursor-default'}
              `}
              onClick={handleImageClick}
            />

            {extractionMethod === 'point' && (
              <p className="text-sm text-blue-600 mt-2">
                Click on the image to extract color from that point
              </p>
            )}

            {clickCoordinates && (
              <p className="text-xs text-gray-500 mt-1">
                Selected point: ({clickCoordinates.x}, {clickCoordinates.y})
              </p>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation()
                resetState()
              }}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Remove Image
            </button>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-700">Processing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
    </div>
  )
}

export default ImageUpload