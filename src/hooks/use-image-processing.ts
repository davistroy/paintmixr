import { useState, useCallback } from 'react'
import type { ColorValue, ImageColorExtractionRequest, ImageColorExtractionResponse } from '@/lib/types'

interface UseImageProcessingState {
  isProcessing: boolean
  uploadedImage: string | null
  extractedColor: ColorValue | null
  error: string | null
  extractionMethod: 'dominant' | 'average' | 'point'
  clickCoordinates: { x: number; y: number } | null
}

interface UseImageProcessingResult extends UseImageProcessingState {
  uploadImage: (file: File) => Promise<void>
  extractColor: (method?: 'dominant' | 'average' | 'point', coordinates?: { x: number; y: number }) => Promise<ColorValue>
  setExtractionMethod: (method: 'dominant' | 'average' | 'point') => void
  setClickCoordinates: (coordinates: { x: number; y: number } | null) => void
  reset: () => void
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

export const useImageProcessing = (): UseImageProcessingResult => {
  const [state, setState] = useState<UseImageProcessingState>({
    isProcessing: false,
    uploadedImage: null,
    extractedColor: null,
    error: null,
    extractionMethod: 'dominant',
    clickCoordinates: null,
  })

  const validateFile = useCallback((file: File): boolean => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      setState(prev => ({
        ...prev,
        error: 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)',
      }))
      return false
    }

    if (file.size > MAX_FILE_SIZE) {
      setState(prev => ({
        ...prev,
        error: 'File size must be less than 10MB',
      }))
      return false
    }

    return true
  }, [])

  const convertFileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }, [])

  const extractColorFromAPI = useCallback(async (
    imageData: string,
    method: 'dominant' | 'average' | 'point',
    coordinates?: { x: number; y: number }
  ): Promise<ColorValue> => {
    const request: ImageColorExtractionRequest = {
      image: new File([imageData], 'image.jpg', { type: 'image/jpeg' }),
      x: coordinates?.x || 0,
      y: coordinates?.y || 0,
      extraction_type: method,
    }

    const response = await fetch('/api/image/extract-color', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to extract color from image')
    }

    const data: ImageColorExtractionResponse = await response.json()
    return data.extracted_color
  }, [])

  const uploadImage = useCallback(async (file: File): Promise<void> => {
    if (!validateFile(file)) return

    setState(prev => ({
      ...prev,
      isProcessing: true,
      error: null,
      extractedColor: null,
      clickCoordinates: null,
    }))

    try {
      const base64 = await convertFileToBase64(file)

      setState(prev => ({
        ...prev,
        uploadedImage: base64,
      }))

      // Auto-extract color if not using point method
      if (state.extractionMethod !== 'point') {
        const extractedColor = await extractColorFromAPI(base64, state.extractionMethod)
        setState(prev => ({
          ...prev,
          isProcessing: false,
          extractedColor,
        }))
      } else {
        setState(prev => ({
          ...prev,
          isProcessing: false,
        }))
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: err instanceof Error ? err.message : 'Failed to process image',
      }))
    }
  }, [state.extractionMethod, validateFile, convertFileToBase64, extractColorFromAPI])

  const extractColor = useCallback(async (
    method: 'dominant' | 'average' | 'point' = state.extractionMethod,
    coordinates?: { x: number; y: number }
  ): Promise<ColorValue> => {
    if (!state.uploadedImage) {
      throw new Error('No image uploaded')
    }

    setState(prev => ({
      ...prev,
      isProcessing: true,
      error: null,
    }))

    try {
      const extractedColor = await extractColorFromAPI(state.uploadedImage, method, coordinates)

      setState(prev => ({
        ...prev,
        isProcessing: false,
        extractedColor,
        extractionMethod: method,
        clickCoordinates: coordinates || null,
      }))

      return extractedColor
    } catch (err) {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: err instanceof Error ? err.message : 'Failed to extract color',
      }))
      throw err
    }
  }, [state.uploadedImage, state.extractionMethod, extractColorFromAPI])

  const setExtractionMethod = useCallback((method: 'dominant' | 'average' | 'point') => {
    setState(prev => ({
      ...prev,
      extractionMethod: method,
      clickCoordinates: null,
    }))

    // Auto-extract if image is uploaded and not using point method
    if (state.uploadedImage && method !== 'point') {
      extractColor(method)
    }
  }, [state.uploadedImage, extractColor])

  const setClickCoordinates = useCallback((coordinates: { x: number; y: number } | null) => {
    setState(prev => ({
      ...prev,
      clickCoordinates: coordinates,
    }))
  }, [])

  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      uploadedImage: null,
      extractedColor: null,
      error: null,
      extractionMethod: 'dominant',
      clickCoordinates: null,
    })
  }, [])

  return {
    ...state,
    uploadImage,
    extractColor,
    setExtractionMethod,
    setClickCoordinates,
    reset,
  }
}