/**
 * POST /api/ratio-predict
 * Ratio prediction endpoint - predicts color from paint ratios
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type {
  RatioPredictRequest,
  RatioPredictResponse,
  ErrorResponse,
  ColorValue,
  MixingFormula,
} from '@/types/types'
import { mixMultiplePaints, PaintProperties } from '@/lib/kubelka-munk'
import { labToHex } from '@/lib/color-science'
import { getUserPaints } from '@/lib/user-paints'

// Use user's paint database from paint_colors.json
const PAINT_DATABASE: PaintProperties[] = getUserPaints()

// Request validation schema
const RatioPredictRequestSchema = z.object({
  paint_ratios: z
    .array(
      z.object({
        paint_id: z.string().min(1, 'Paint ID is required'),
        volume_ml: z.number().min(0.1, 'Volume must be greater than 0'),
      })
    )
    .min(1, 'At least one paint ratio is required')
    .max(5, 'Maximum 5 paints allowed'),
})

/**
 * Validate paint ratios and normalize percentages
 */
function validateAndNormalizePaintRatios(
  paintRatios: Array<{ paint_id: string; volume_ml: number }>
): Array<{
  paint_id: string
  paint_name: string
  volume_ml: number
  percentage: number
  paint_properties: PaintProperties
}> {
  const results: Array<{
    paint_id: string
    paint_name: string
    volume_ml: number
    percentage: number
    paint_properties: PaintProperties
  }> = []

  // Calculate total volume
  const totalVolume = paintRatios.reduce((sum, ratio) => sum + ratio.volume_ml, 0)

  if (totalVolume <= 0) {
    throw new Error('Total volume must be greater than 0')
  }

  // Validate each paint and calculate percentages
  for (const ratio of paintRatios) {
    const paint = PAINT_DATABASE.find(p => p.id === ratio.paint_id)

    if (!paint) {
      throw new Error(`Unknown paint: ${ratio.paint_id}`)
    }

    const percentage = (ratio.volume_ml / totalVolume) * 100

    results.push({
      paint_id: ratio.paint_id,
      paint_name: paint.name,
      volume_ml: ratio.volume_ml,
      percentage,
      paint_properties: paint,
    })
  }

  return results
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request
    const validatedData = RatioPredictRequestSchema.parse(body)
    const { paint_ratios } = validatedData

    // Check for duplicate paints
    const paintIds = paint_ratios.map(r => r.paint_id)
    const uniquePaintIds = new Set(paintIds)
    if (paintIds.length !== uniquePaintIds.size) {
      const errorResponse: ErrorResponse = {
        error: 'DUPLICATE_PAINTS',
        message: 'Each paint can only be used once in a formula',
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Validate and normalize paint ratios
    let normalizedRatios: Array<{
      paint_id: string
      paint_name: string
      volume_ml: number
      percentage: number
      paint_properties: PaintProperties
    }>

    try {
      normalizedRatios = validateAndNormalizePaintRatios(paint_ratios)
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: 'INVALID_PAINTS',
        message: error instanceof Error ? error.message : 'Invalid paint configuration',
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Calculate the resulting color using Kubelka-Munk theory
    const mixingResult = mixMultiplePaints(normalizedRatios)

    // Calculate total volume
    const totalVolume = paint_ratios.reduce((sum, ratio) => sum + ratio.volume_ml, 0)

    // Convert LAB to hex for response
    const resultingColorHex = labToHex(mixingResult.calculated_color)

    const resultingColor: ColorValue = {
      hex: resultingColorHex,
      lab: mixingResult.calculated_color,
    }

    // Create the formula with normalized ratios
    const formula: MixingFormula = {
      total_volume_ml: Math.round(totalVolume * 10) / 10, // Round to 1 decimal
      paint_ratios: normalizedRatios.map(ratio => ({
        paint_id: ratio.paint_id,
        paint_name: ratio.paint_name,
        volume_ml: Math.round(ratio.volume_ml * 10) / 10, // Round to 1 decimal
        percentage: Math.round(ratio.percentage * 100) / 100, // Round to 2 decimals
      })),
    }

    // Prepare response
    const response: RatioPredictResponse = {
      resulting_color: resultingColor,
      total_volume_ml: formula.total_volume_ml,
      formula,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Ratio prediction error:', error)

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
      message: 'Failed to process ratio prediction request',
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