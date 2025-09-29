/**
 * POST /api/image/extract-color
 * Extract color from uploaded image for color matching
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type {
  ImageColorExtractionResponse,
  ErrorResponse,
  ColorValue,
} from '@/types/types'
import { hexToLab, labToHex } from '@/lib/color-science'

// Request validation schema
const ImageColorExtractionRequestSchema = z.object({
  image_data: z.string().min(1, 'Image data is required'),
  extraction_method: z.enum(['dominant', 'average', 'point']).default('dominant'),
  coordinates: z.object({
    x: z.number().min(0),
    y: z.number().min(0),
  }).optional(),
})

/**
 * Extract dominant color from image data (simplified implementation)
 * In production, this would use a proper image processing library like Sharp
 */
function extractDominantColor(imageData: string): ColorValue {
  // This is a placeholder implementation
  // In production, you would:
  // 1. Decode the base64 image data
  // 2. Use an image processing library (Sharp, Canvas, etc.)
  // 3. Apply color quantization algorithms
  // 4. Return the most frequent color

  // For now, return a sample color based on image data hash
  const hash = simpleHash(imageData)
  const hue = (hash % 360)
  const saturation = 0.7
  const lightness = 0.5

  // Convert HSL to RGB then to hex
  const rgb = hslToRgb(hue / 360, saturation, lightness)
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b)

  // Convert to LAB color space
  const lab = hexToLab(hex)

  return { hex, lab }
}

/**
 * Extract average color from image (simplified implementation)
 */
function extractAverageColor(imageData: string): ColorValue {
  // Similar placeholder - would analyze all pixels and compute average
  const hash = simpleHash(imageData + 'average')
  const hue = (hash % 360)
  const saturation = 0.5
  const lightness = 0.6

  const rgb = hslToRgb(hue / 360, saturation, lightness)
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
  const lab = hexToLab(hex)

  return { hex, lab }
}

/**
 * Extract color from specific point in image
 */
function extractPointColor(imageData: string, x: number, y: number): ColorValue {
  // Placeholder - would sample pixel at specific coordinates
  const hash = simpleHash(imageData + x.toString() + y.toString())
  const hue = (hash % 360)
  const saturation = 0.8
  const lightness = 0.4

  const rgb = hslToRgb(hue / 360, saturation, lightness)
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
  const lab = hexToLab(hex)

  return { hex, lab }
}

/**
 * Simple hash function for consistent color generation
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r, g, b

  if (s === 0) {
    r = g = b = l // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

/**
 * Validate base64 image data
 */
function validateImageData(imageData: string): boolean {
  // Check if it's a valid base64 data URL for images
  const dataUrlPattern = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/
  return dataUrlPattern.test(imageData)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request
    const validatedData = ImageColorExtractionRequestSchema.parse(body)
    const { image_data, extraction_method, coordinates } = validatedData

    // Validate image data format
    if (!validateImageData(image_data)) {
      const errorResponse: ErrorResponse = {
        error: 'INVALID_IMAGE',
        message: 'Invalid image data format. Must be a base64 data URL for JPEG, PNG, GIF, or WebP.',
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Validate coordinates for point extraction
    if (extraction_method === 'point' && !coordinates) {
      const errorResponse: ErrorResponse = {
        error: 'MISSING_COORDINATES',
        message: 'Coordinates are required for point color extraction',
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Extract color based on method
    let extractedColor: ColorValue

    switch (extraction_method) {
      case 'dominant':
        extractedColor = extractDominantColor(image_data)
        break
      case 'average':
        extractedColor = extractAverageColor(image_data)
        break
      case 'point':
        if (!coordinates) {
          throw new Error('Coordinates required for point extraction')
        }
        extractedColor = extractPointColor(image_data, coordinates.x, coordinates.y)
        break
      default:
        throw new Error('Invalid extraction method')
    }

    // Prepare response
    const response: ImageColorExtractionResponse = {
      color: extractedColor,
      extracted_color: extractedColor,
      extraction_type: extraction_method,
      image_dimensions: {
        width: 800,  // placeholder dimensions
        height: 600,
      },
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Image color extraction error:', error)

    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = {
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors,
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const errorResponse: ErrorResponse = {
      error: 'INTERNAL_ERROR',
      message: 'Failed to extract color from image',
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'METHOD_NOT_ALLOWED', message: 'GET method not supported' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'METHOD_NOT_ALLOWED', message: 'PUT method not supported' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'METHOD_NOT_ALLOWED', message: 'DELETE method not supported' },
    { status: 405 }
  )
}