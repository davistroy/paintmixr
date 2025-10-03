/**
 * POST /api/color-match
 * Color matching endpoint with primary result plus ranked alternatives
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type {
  ColorMatchResponse,
  ColorMatchErrorResponse,
  ColorValue,
  MixingFormula,
} from '@/types/types'
import { optimizePaintRatios, mixMultiplePaints, PaintProperties } from '@/lib/kubelka-munk'
import { deltaE2000, labToHex } from '@/lib/color-science'
import { getUserPaints } from '@/lib/user-paints'

// Use user's paint database from paint_colors.json
const PAINT_DATABASE: PaintProperties[] = getUserPaints()

// Request validation schema
const ColorMatchRequestSchema = z.object({
  target_color: z.object({
    hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format'),
    lab: z.object({
      l: z.number().min(0).max(100),
      a: z.number().min(-128).max(127),
      b: z.number().min(-128).max(127),
    }),
  }),
  total_volume_ml: z.number().min(100).max(1000).optional().default(200),
  optimization_preference: z.enum(['accuracy', 'cost', 'simplicity']).optional().default('accuracy'),
})

/**
 * Generate alternative formulas with different optimization strategies
 */
function generateAlternatives(
  targetColor: ColorValue,
  totalVolume: number,
  _primaryFormula: MixingFormula,
  primaryDeltaE: number
): Array<{
  formula: MixingFormula
  delta_e: number
  description: string
}> {
  const alternatives: Array<{
    formula: MixingFormula
    delta_e: number
    description: string
  }> = []

  // Cost-optimized alternative (fewer expensive pigments)
  try {
    const costOptimizedPaints = PAINT_DATABASE
      .filter(p => ['titanium-white', 'yellow-ochre', 'burnt-umber', 'raw-sienna'].includes(p.id))

    const costRatios = optimizePaintRatios(targetColor.lab, costOptimizedPaints, 3)
    const costRatiosWithProps = costRatios.map(ratio => ({
      ...ratio,
      volume_ml: (ratio.percentage / 100) * totalVolume,
      paint_properties: PAINT_DATABASE.find(p => p.id === ratio.paint_id)!,
    }))

    if (costRatiosWithProps.length > 0) {
      const costResult = mixMultiplePaints(costRatiosWithProps)
      const costDeltaE = deltaE2000(targetColor.lab, costResult.calculated_color)

      if (costDeltaE !== primaryDeltaE) {
        alternatives.push({
          formula: costResult.formula,
          delta_e: costDeltaE,
          description: 'Cost-optimized formula using earth pigments',
        })
      }
    }
  } catch (error) {
    console.warn('Failed to generate cost-optimized alternative:', error)
  }

  // Simplicity alternative (2 colors max)
  try {
    const simpleRatios = optimizePaintRatios(targetColor.lab, PAINT_DATABASE, 2)
    const simpleRatiosWithProps = simpleRatios.map(ratio => ({
      ...ratio,
      volume_ml: (ratio.percentage / 100) * totalVolume,
      paint_properties: PAINT_DATABASE.find(p => p.id === ratio.paint_id)!,
    }))

    if (simpleRatiosWithProps.length > 0) {
      const simpleResult = mixMultiplePaints(simpleRatiosWithProps)
      const simpleDeltaE = deltaE2000(targetColor.lab, simpleResult.calculated_color)

      if (simpleDeltaE !== primaryDeltaE) {
        alternatives.push({
          formula: simpleResult.formula,
          delta_e: simpleDeltaE,
          description: 'Simple 2-color mixture for easy mixing',
        })
      }
    }
  } catch (error) {
    console.warn('Failed to generate simplified alternative:', error)
  }

  // High-chroma alternative (using intense pigments)
  try {
    const chromaPaints = PAINT_DATABASE
      .filter(p => ['cadmium-red-medium', 'cadmium-yellow-medium', 'ultramarine-blue', 'alizarin-crimson'].includes(p.id))

    const chromaRatios = optimizePaintRatios(targetColor.lab, chromaPaints, 3)
    const chromaRatiosWithProps = chromaRatios.map(ratio => ({
      ...ratio,
      volume_ml: (ratio.percentage / 100) * totalVolume,
      paint_properties: PAINT_DATABASE.find(p => p.id === ratio.paint_id)!,
    }))

    if (chromaRatiosWithProps.length > 0) {
      const chromaResult = mixMultiplePaints(chromaRatiosWithProps)
      const chromaDeltaE = deltaE2000(targetColor.lab, chromaResult.calculated_color)

      if (chromaDeltaE !== primaryDeltaE) {
        alternatives.push({
          formula: chromaResult.formula,
          delta_e: chromaDeltaE,
          description: 'High-chroma formula using pure pigments',
        })
      }
    }
  } catch (error) {
    console.warn('Failed to generate high-chroma alternative:', error)
  }

  // Sort alternatives by Delta E (best first)
  return alternatives
    .sort((a, b) => a.delta_e - b.delta_e)
    .slice(0, 3) // Return top 3 alternatives
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Debug: Log the received request body BEFORE validation
    console.log('=== DEBUG: Raw request body ===')
    console.log('Received request body:', JSON.stringify(body, null, 2))
    console.log('Body keys:', Object.keys(body))
    console.log('total_volume_ml value:', body.total_volume_ml, typeof body.total_volume_ml)
    console.log('target_color:', body.target_color)
    console.log('optimization_preference:', body.optimization_preference)
    console.log('=== END DEBUG ===')

    // Validate request
    const validatedData = ColorMatchRequestSchema.parse(body)
    const { target_color, total_volume_ml, optimization_preference } = validatedData

    // Check if target color is achievable (basic validation)
    if (target_color.lab.l < 0 || target_color.lab.l > 100) {
      const errorResponse: ColorMatchErrorResponse = {
        error: 'INVALID_COLOR',
        message: 'Target color is outside achievable range',
        closest_achievable: {
          hex: '#808080',
          lab: { l: 50, a: 0, b: 0 },
        },
        min_delta_e: 50,
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Generate optimal paint ratios
    const maxPaints = optimization_preference === 'simplicity' ? 2 : 3
    const paintRatios = optimizePaintRatios(target_color.lab, PAINT_DATABASE, maxPaints)

    if (paintRatios.length === 0) {
      const errorResponse: ColorMatchErrorResponse = {
        error: 'NO_MATCH_FOUND',
        message: 'Unable to find suitable paint combination',
        closest_achievable: {
          hex: '#808080',
          lab: { l: 50, a: 0, b: 0 },
        },
        min_delta_e: 25,
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Convert percentages to volumes and add paint properties
    const paintRatiosWithProps = paintRatios.map(ratio => ({
      ...ratio,
      volume_ml: (ratio.percentage / 100) * total_volume_ml,
      paint_properties: PAINT_DATABASE.find(p => p.id === ratio.paint_id)!,
    }))

    // Calculate the resulting color using Kubelka-Munk theory
    const mixingResult = mixMultiplePaints(paintRatiosWithProps)

    // Calculate color accuracy (Delta E CIE 2000)
    const deltaE = deltaE2000(target_color.lab, mixingResult.calculated_color)

    // Convert LAB back to hex for response
    const achievedColorHex = labToHex(mixingResult.calculated_color)

    const achievedColor: ColorValue = {
      hex: achievedColorHex,
      lab: mixingResult.calculated_color,
    }

    // Generate alternatives with different optimization strategies
    const alternatives = generateAlternatives(
      target_color,
      total_volume_ml,
      mixingResult.formula,
      deltaE
    )

    // Prepare response
    const response: ColorMatchResponse = {
      formula: mixingResult.formula,
      achieved_color: achievedColor,
      calculated_color: achievedColor,
      delta_e: deltaE,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Color matching error:', error)

    if (error instanceof z.ZodError) {
      const errorResponse: ColorMatchErrorResponse = {
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const errorResponse: ColorMatchErrorResponse = {
      error: 'INTERNAL_ERROR',
      message: 'Failed to process color matching request',
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