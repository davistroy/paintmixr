/**
 * GET /api/paints
 * List available paints with their properties for mixing calculations
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as fs from 'fs'
import * as path from 'path'
import type {
  PaintColor,
  ErrorResponse,
} from '@/types/types'
import { PaintProperties } from '@/lib/kubelka-munk'
import { hexToLab, labToHex } from '@/lib/color-science'

// Interface for simple paint colors from JSON file
interface SimplePaintColor {
  hex: string
  name: string
  code: string
  spray: string
  note?: string
}

// Cache for loaded paint database
let PAINT_DATABASE: PaintProperties[] | null = null

// Load paint colors from JSON file and convert to internal format
function loadPaintDatabase(): PaintProperties[] {
  if (PAINT_DATABASE) {
    return PAINT_DATABASE
  }

  try {
    const filePath = path.join(process.cwd(), 'public', 'paint-colors.json')
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const simplePaints: SimplePaintColor[] = JSON.parse(fileContent)

    PAINT_DATABASE = simplePaints.map(convertSimplePaintToProperties)
    return PAINT_DATABASE
  } catch (error) {
    console.error('Failed to load paint colors from JSON file:', error)
    // Fallback to empty array or could use hardcoded colors as backup
    PAINT_DATABASE = []
    return PAINT_DATABASE
  }
}

// Convert simple paint color to complex PaintProperties format
function convertSimplePaintToProperties(simplePaint: SimplePaintColor): PaintProperties {
  // Convert hex to LAB color space
  const labColor = hexToLab(simplePaint.hex)

  // Generate unique ID from paint code
  const id = simplePaint.code.toLowerCase().replace(/[^a-z0-9]/g, '-')

  // Assign reasonable default values based on color characteristics
  const defaults = assignDefaultsByColor(labColor, simplePaint.name)

  return {
    id,
    name: simplePaint.name,
    k_coefficient: defaults.k_coefficient,
    s_coefficient: defaults.s_coefficient,
    opacity: defaults.opacity,
    tinting_strength: defaults.tinting_strength,
    lab_values: labColor,
    mass_tone_lab: labColor,
    // Create slightly lighter undertone
    undertone_lab: {
      l: Math.min(100, labColor.l + 15),
      a: labColor.a * 0.6,
      b: labColor.b * 0.6
    },
    transparency_index: defaults.transparency_index,
  }
}

// Assign default optical properties based on color characteristics
function assignDefaultsByColor(lab: { l: number; a: number; b: number }, name: string) {
  const lightness = lab.l
  const saturation = Math.sqrt(lab.a * lab.a + lab.b * lab.b)
  const nameLower = name.toLowerCase()

  // Base defaults
  let k_coefficient = 0.4
  let s_coefficient = 0.4
  let opacity = 0.85
  let tinting_strength = 0.7
  let transparency_index = 1.0

  // Adjust based on color name patterns
  if (nameLower.includes('white') || nameLower.includes('primer')) {
    // Whites and primers - high opacity, low absorption
    k_coefficient = 0.02
    s_coefficient = 0.95
    opacity = 0.95
    tinting_strength = 0.3
    transparency_index = 0.05
  } else if (nameLower.includes('black')) {
    // Blacks - high absorption, medium scattering
    k_coefficient = 0.9
    s_coefficient = 0.1
    opacity = 0.95
    tinting_strength = 0.95
    transparency_index = 9.0
  } else if (nameLower.includes('yellow')) {
    // Yellows - typically semi-opaque with good tinting
    k_coefficient = 0.25 + (saturation / 200)
    s_coefficient = 0.55 - (saturation / 400)
    opacity = 0.88
    tinting_strength = 0.75 + (saturation / 400)
    transparency_index = 0.4 + (saturation / 200)
  } else if (nameLower.includes('red')) {
    // Reds - vary widely, adjust by saturation
    k_coefficient = 0.4 + (saturation / 300)
    s_coefficient = 0.45 - (saturation / 400)
    opacity = 0.9
    tinting_strength = 0.8 + (saturation / 500)
    transparency_index = 0.8 + (saturation / 100)
  } else if (nameLower.includes('blue')) {
    // Blues - typically good coverage
    k_coefficient = 0.5 + (saturation / 400)
    s_coefficient = 0.35 - (saturation / 600)
    opacity = 0.8
    tinting_strength = 0.85 + (saturation / 600)
    transparency_index = 1.5 + (saturation / 80)
  } else if (nameLower.includes('green')) {
    // Greens - medium properties
    k_coefficient = 0.45 + (saturation / 400)
    s_coefficient = 0.4 - (saturation / 500)
    opacity = 0.82
    tinting_strength = 0.75 + (saturation / 400)
    transparency_index = 1.2 + (saturation / 120)
  } else if (nameLower.includes('orange')) {
    // Oranges - typically semi-transparent
    k_coefficient = 0.35 + (saturation / 350)
    s_coefficient = 0.5 - (saturation / 500)
    opacity = 0.85
    tinting_strength = 0.8
    transparency_index = 0.6 + (saturation / 150)
  } else if (nameLower.includes('gray') || nameLower.includes('grey')) {
    // Grays - adjust by lightness
    k_coefficient = 0.3 + ((100 - lightness) / 200)
    s_coefficient = 0.6 - ((100 - lightness) / 300)
    opacity = 0.9
    tinting_strength = 0.6
    transparency_index = 0.5 + ((100 - lightness) / 100)
  }

  // Adjust all values based on lightness
  if (lightness < 30) {
    // Dark colors - increase absorption
    k_coefficient = Math.min(0.9, k_coefficient * 1.3)
    tinting_strength = Math.min(1.0, tinting_strength * 1.2)
    transparency_index = Math.min(10.0, transparency_index * 1.5)
  } else if (lightness > 80) {
    // Light colors - increase scattering
    s_coefficient = Math.min(0.98, s_coefficient * 1.2)
    k_coefficient = Math.max(0.02, k_coefficient * 0.7)
    transparency_index = Math.max(0.02, transparency_index * 0.5)
  }

  return {
    k_coefficient: Math.round(k_coefficient * 100) / 100,
    s_coefficient: Math.round(s_coefficient * 100) / 100,
    opacity: Math.round(opacity * 100) / 100,
    tinting_strength: Math.round(tinting_strength * 100) / 100,
    transparency_index: Math.round(transparency_index * 100) / 100,
  }
}

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
    brand: 'Generic', // Default brand since not in source data
    hex_color: labToHex(paint.lab_values),
    lab: paint.lab_values,
    k_coefficient: paint.k_coefficient,
    s_coefficient: paint.s_coefficient,
    opacity: paint.opacity,
    tinting_strength: paint.tinting_strength,
    density: 1.2, // Default density in g/ml
    cost_per_ml: 0.1, // Default cost per ml
  }
}

// Categorize paints by their name and properties
function categorizeByPaint(paint: PaintProperties): 'primary' | 'earth' | 'transparent' | 'opaque' {
  const nameLower = paint.name.toLowerCase()

  // Primary colors
  if (nameLower.includes('red') && !nameLower.includes('oxide') && !nameLower.includes('burnt') ||
      nameLower.includes('blue') && !nameLower.includes('gray') ||
      nameLower.includes('yellow') && !nameLower.includes('ochre')) {
    return 'primary'
  }

  // Earth tones
  if (nameLower.includes('ochre') || nameLower.includes('sienna') || nameLower.includes('umber') ||
      nameLower.includes('oxide') || nameLower.includes('caterpillar') || nameLower.includes('gray')) {
    return 'earth'
  }

  // Transparent (based on transparency index)
  if (paint.transparency_index > 5.0) {
    return 'transparent'
  }

  // Default to opaque
  return 'opaque'
}

// Filter paints based on query parameters
function filterPaints(paints: PaintProperties[], params?: z.infer<typeof PaintsQuerySchema>): PaintProperties[] {
  if (!params) return paints

  let filtered = paints

  // Filter by category
  if (params.category) {
    filtered = filtered.filter(paint => categorizeByPaint(paint) === params.category)
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

    // Load and filter paints based on query parameters
    const paintDatabase = loadPaintDatabase()
    const filteredPaints = filterPaints(paintDatabase, validatedParams)

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