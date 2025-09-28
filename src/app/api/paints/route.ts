/**
 * GET /api/paints
 * List available paints with their properties for mixing calculations
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type {
  PaintColor,
  ErrorResponse,
} from '@/types/types'
import { PaintProperties } from '@/lib/kubelka-munk'

// Same paint database as used in color matching endpoints
const PAINT_DATABASE: PaintProperties[] = [
  {
    id: 'titanium-white',
    name: 'Titanium White',
    k_coefficient: 0.02,
    s_coefficient: 0.98,
    opacity: 0.95,
    tinting_strength: 0.3,
    lab_values: { l: 96, a: -0.5, b: 1.2 },
    mass_tone_lab: { l: 96, a: -0.5, b: 1.2 },
    undertone_lab: { l: 96, a: -0.5, b: 1.2 },
    transparency_index: 0.02,
  },
  {
    id: 'cadmium-red-medium',
    name: 'Cadmium Red Medium',
    k_coefficient: 0.45,
    s_coefficient: 0.35,
    opacity: 0.92,
    tinting_strength: 0.85,
    lab_values: { l: 48, a: 65, b: 52 },
    mass_tone_lab: { l: 48, a: 65, b: 52 },
    undertone_lab: { l: 72, a: 35, b: 28 },
    transparency_index: 1.29,
  },
  {
    id: 'cadmium-yellow-medium',
    name: 'Cadmium Yellow Medium',
    k_coefficient: 0.25,
    s_coefficient: 0.55,
    opacity: 0.88,
    tinting_strength: 0.78,
    lab_values: { l: 78, a: 12, b: 85 },
    mass_tone_lab: { l: 78, a: 12, b: 85 },
    undertone_lab: { l: 88, a: 5, b: 45 },
    transparency_index: 0.45,
  },
  {
    id: 'ultramarine-blue',
    name: 'Ultramarine Blue',
    k_coefficient: 0.65,
    s_coefficient: 0.25,
    opacity: 0.75,
    tinting_strength: 0.92,
    lab_values: { l: 32, a: 25, b: -58 },
    mass_tone_lab: { l: 32, a: 25, b: -58 },
    undertone_lab: { l: 68, a: 8, b: -25 },
    transparency_index: 2.6,
  },
  {
    id: 'burnt-umber',
    name: 'Burnt Umber',
    k_coefficient: 0.75,
    s_coefficient: 0.15,
    opacity: 0.82,
    tinting_strength: 0.68,
    lab_values: { l: 28, a: 15, b: 25 },
    mass_tone_lab: { l: 28, a: 15, b: 25 },
    undertone_lab: { l: 58, a: 8, b: 18 },
    transparency_index: 5.0,
  },
  {
    id: 'yellow-ochre',
    name: 'Yellow Ochre',
    k_coefficient: 0.35,
    s_coefficient: 0.45,
    opacity: 0.85,
    tinting_strength: 0.65,
    lab_values: { l: 65, a: 8, b: 45 },
    mass_tone_lab: { l: 65, a: 8, b: 45 },
    undertone_lab: { l: 82, a: 3, b: 25 },
    transparency_index: 0.78,
  },
  {
    id: 'raw-sienna',
    name: 'Raw Sienna',
    k_coefficient: 0.55,
    s_coefficient: 0.25,
    opacity: 0.78,
    tinting_strength: 0.72,
    lab_values: { l: 42, a: 22, b: 38 },
    mass_tone_lab: { l: 42, a: 22, b: 38 },
    undertone_lab: { l: 68, a: 12, b: 22 },
    transparency_index: 2.2,
  },
  {
    id: 'alizarin-crimson',
    name: 'Alizarin Crimson',
    k_coefficient: 0.85,
    s_coefficient: 0.08,
    opacity: 0.45,
    tinting_strength: 0.95,
    lab_values: { l: 28, a: 58, b: 18 },
    mass_tone_lab: { l: 28, a: 58, b: 18 },
    undertone_lab: { l: 75, a: 25, b: 8 },
    transparency_index: 10.6,
  },
]

// Query parameters validation
const PaintsQuerySchema = z.object({
  category: z.enum(['primary', 'earth', 'transparent', 'opaque']).optional(),
  search: z.string().min(1).max(50).optional(),
}).optional()

// Transform internal paint properties to API response format
function transformPaintToApiFormat(paint: PaintProperties): PaintColor {
  return {
    id: paint.id,
    name: paint.name,
    hex: '#000000', // Would be calculated from LAB in production
    lab: paint.lab_values,
    mass_tone: paint.mass_tone_lab,
    undertone: paint.undertone_lab,
    opacity: paint.opacity,
    tinting_strength: paint.tinting_strength,
    transparency_index: paint.transparency_index,
    category: categorizeByPaint(paint.id),
    series: 1, // Default series
    lightfastness: 'excellent', // Default lightfastness
  }
}

// Categorize paints by their ID
function categorizeByPaint(paintId: string): 'primary' | 'earth' | 'transparent' | 'opaque' {
  if (['cadmium-red-medium', 'cadmium-yellow-medium', 'ultramarine-blue'].includes(paintId)) {
    return 'primary'
  }
  if (['burnt-umber', 'yellow-ochre', 'raw-sienna'].includes(paintId)) {
    return 'earth'
  }
  if (paintId === 'alizarin-crimson') {
    return 'transparent'
  }
  return 'opaque'
}

// Filter paints based on query parameters
function filterPaints(paints: PaintProperties[], params?: z.infer<typeof PaintsQuerySchema>): PaintProperties[] {
  if (!params) return paints

  let filtered = paints

  // Filter by category
  if (params.category) {
    filtered = filtered.filter(paint => categorizeByPaint(paint.id) === params.category)
  }

  // Filter by search term
  if (params.search) {
    const searchTerm = params.search.toLowerCase()
    filtered = filtered.filter(paint =>
      paint.name.toLowerCase().includes(searchTerm) ||
      paint.id.toLowerCase().includes(searchTerm)
    )
  }

  return filtered
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Extract and validate query parameters
    const queryParams = searchParams.size > 0 ? {
      category: searchParams.get('category'),
      search: searchParams.get('search'),
    } : undefined

    const validatedParams = PaintsQuerySchema.parse(queryParams)

    // Filter paints based on query parameters
    const filteredPaints = filterPaints(PAINT_DATABASE, validatedParams)

    // Transform to API response format
    const paints = filteredPaints.map(transformPaintToApiFormat)

    // Sort alphabetically by name
    paints.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ paints })

  } catch (error) {
    console.error('Paints list error:', error)

    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = {
        error: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: error.errors,
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const errorResponse: ErrorResponse = {
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch paints',
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { error: 'METHOD_NOT_ALLOWED', message: 'POST method not supported' },
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