/**
 * POST /api/color-match
 * Color matching endpoint with primary result plus ranked alternatives
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type {
  ColorMatchRequest,
  ColorMatchResponse,
  ColorMatchErrorResponse,
  ColorValue,
  MixingFormula,
} from '@/types/types'
import { optimizePaintRatios, mixMultiplePaints, PaintProperties } from '@/lib/kubelka-munk'
import { deltaE2000, labToHex } from '@/lib/color-science'

// Sample paint database - in production this would come from a database
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
  total_volume_ml: z.number().min(100).max(1000),
  optimization_preference: z.enum(['accuracy', 'cost', 'simplicity']).optional().default('accuracy'),
})

/**
 * Generate alternative formulas with different optimization strategies
 */
function generateAlternatives(
  targetColor: ColorValue,
  totalVolume: number,
  primaryFormula: MixingFormula,
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