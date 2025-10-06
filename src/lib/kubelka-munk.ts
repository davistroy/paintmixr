/**
 * Kubelka-Munk paint mixing physics
 * Implements optical mixing theory for oil paints with scattering and absorption
 */

import { LABColor } from './color-science'

export interface PaintProperties {
  id: string
  name: string
  /**
   * Absorption coefficient (K) - how much light is absorbed
   * Range: 0-1 (0 = no absorption, 1 = complete absorption)
   */
  k_coefficient: number
  /**
   * Scattering coefficient (S) - how much light is scattered
   * Range: 0-1 (0 = no scattering, 1 = complete scattering)
   */
  s_coefficient: number
  /**
   * Opacity (covering power)
   * Range: 0-1 (0 = transparent, 1 = opaque)
   */
  opacity: number
  /**
   * Tinting strength (how much the paint affects mixtures)
   * Range: 0-1 (0 = weak tinting, 1 = strong tinting)
   */
  tinting_strength: number
  /**
   * Base LAB color values for the paint
   */
  lab_values: LABColor
  /**
   * Mass tone LAB (pure paint color)
   */
  mass_tone_lab: LABColor
  /**
   * Undertone LAB (paint mixed with white)
   */
  undertone_lab: LABColor
  /**
   * Transparency index (derived from K/S ratio)
   */
  transparency_index: number
}

export interface PaintRatio {
  paint_id: string
  paint_name?: string
  volume_ml: number
  percentage: number
  paint_properties?: PaintProperties
}

export interface MixingFormula {
  total_volume_ml: number
  paint_ratios: PaintRatio[]
}

export interface MixingResult {
  calculated_color: LABColor
  formula: MixingFormula
  opacity: number
  transparency_index: number
  mixing_complexity: 'simple' | 'moderate' | 'complex'
  kubelka_munk_k: number
  kubelka_munk_s: number
}

/**
 * Calculate Kubelka-Munk K/S ratio for a single paint
 */
export function calculateKSRatio(paint: PaintProperties): number {
  if (paint.s_coefficient === 0) return Infinity
  return paint.k_coefficient / paint.s_coefficient
}

/**
 * Calculate reflectance from K/S ratio
 */
export function calculateReflectance(k: number, s: number): number {
  if (s === 0) return 0
  const ks = k / s
  const a = 1 + ks
  const b = Math.sqrt(a * a - 1)
  return (a - b) / (a + b)
}

/**
 * Calculate K and S from reflectance
 */
export function calculateKSFromReflectance(reflectance: number): { k: number, s: number } {
  if (reflectance <= 0 || reflectance >= 1) {
    throw new Error('Reflectance must be between 0 and 1')
  }

  const ks = Math.pow(1 - reflectance, 2) / (2 * reflectance)

  // Assume S = 1 for normalization, then K = K/S * S
  const s = 1
  const k = ks * s

  return { k, s }
}

/**
 * Mix two paints using Kubelka-Munk theory
 */
export function mixTwoPaints(
  paint1: PaintProperties,
  paint2: PaintProperties,
  ratio1: number, // 0-1
  ratio2: number  // 0-1
): { k: number, s: number, opacity: number } {
  // Normalize ratios
  const total = ratio1 + ratio2
  const r1 = ratio1 / total
  const r2 = ratio2 / total

  // Apply tinting strength corrections
  const effectiveR1 = r1 * paint1.tinting_strength
  const effectiveR2 = r2 * paint2.tinting_strength
  const effectiveTotal = effectiveR1 + effectiveR2

  const normalizedR1 = effectiveR1 / effectiveTotal
  const normalizedR2 = effectiveR2 / effectiveTotal

  // Mix K and S coefficients according to Kubelka-Munk
  const mixedK = normalizedR1 * paint1.k_coefficient + normalizedR2 * paint2.k_coefficient
  const mixedS = normalizedR1 * paint1.s_coefficient + normalizedR2 * paint2.s_coefficient

  // Calculate mixed opacity
  const mixedOpacity = normalizedR1 * paint1.opacity + normalizedR2 * paint2.opacity

  return { k: mixedK, s: mixedS, opacity: mixedOpacity }
}

/**
 * Mix multiple paints using Kubelka-Munk theory
 */
export function mixMultiplePaints(paintRatios: (PaintRatio & { paint_properties: PaintProperties })[]): MixingResult {
  if (paintRatios.length === 0) {
    throw new Error('At least one paint is required')
  }

  if (paintRatios.length === 1) {
    const paint = paintRatios[0].paint_properties!
    return {
      calculated_color: paint.lab_values,
      formula: {
        total_volume_ml: paintRatios[0].volume_ml,
        paint_ratios: paintRatios
      },
      opacity: paint.opacity,
      transparency_index: paint.transparency_index,
      mixing_complexity: 'simple',
      kubelka_munk_k: paint.k_coefficient,
      kubelka_munk_s: paint.s_coefficient
    }
  }

  // Calculate total volume for normalization
  const totalVolume = paintRatios.reduce((sum, ratio) => sum + ratio.volume_ml, 0)

  // Start with first paint
  let resultK = paintRatios[0].paint_properties!.k_coefficient * (paintRatios[0].volume_ml / totalVolume)
  let resultS = paintRatios[0].paint_properties!.s_coefficient * (paintRatios[0].volume_ml / totalVolume)
  let resultOpacity = paintRatios[0].paint_properties!.opacity * (paintRatios[0].volume_ml / totalVolume)

  // Track LAB mixing separately (weighted average with tinting strength)
  let weightedL = 0
  let weightedA = 0
  let weightedB = 0
  let totalWeight = 0

  for (const ratio of paintRatios) {
    const paint = ratio.paint_properties!
    const volumeRatio = ratio.volume_ml / totalVolume
    const weight = volumeRatio * paint.tinting_strength

    weightedL += paint.lab_values.l * weight
    weightedA += paint.lab_values.a * weight
    weightedB += paint.lab_values.b * weight
    totalWeight += weight
  }

  // Add remaining paints iteratively
  for (let i = 1; i < paintRatios.length; i++) {
    const paint = paintRatios[i].paint_properties!
    const ratio = paintRatios[i].volume_ml / totalVolume

    // Apply tinting strength
    const effectiveRatio = ratio * paint.tinting_strength

    resultK += paint.k_coefficient * effectiveRatio
    resultS += paint.s_coefficient * effectiveRatio
    resultOpacity += paint.opacity * effectiveRatio
  }

  // Normalize LAB values
  const calculatedColor: LABColor = {
    l: weightedL / totalWeight,
    a: weightedA / totalWeight,
    b: weightedB / totalWeight
  }

  // Calculate transparency index
  const transparencyIndex = resultS > 0 ? resultK / resultS : 0

  // Determine mixing complexity
  let complexity: 'simple' | 'moderate' | 'complex'
  if (paintRatios.length <= 2) {
    complexity = 'simple'
  } else if (paintRatios.length <= 3) {
    complexity = 'moderate'
  } else {
    complexity = 'complex'
  }

  return {
    calculated_color: calculatedColor,
    formula: {
      total_volume_ml: totalVolume,
      paint_ratios: paintRatios
    },
    opacity: Math.min(1, resultOpacity),
    transparency_index: transparencyIndex,
    mixing_complexity: complexity,
    kubelka_munk_k: resultK,
    kubelka_munk_s: resultS
  }
}

/**
 * Predict color mixing outcome using spectral data
 */
export function predictMixedColor(
  paint1: PaintProperties,
  paint2: PaintProperties,
  ratio1: number,
  ratio2: number
): LABColor {
  // For simplified spectral calculation, interpolate between paint LAB values
  // weighted by tinting strength and volume ratios
  const total = ratio1 + ratio2
  const effectiveR1 = (ratio1 / total) * paint1.tinting_strength
  const effectiveR2 = (ratio2 / total) * paint2.tinting_strength
  const effectiveTotal = effectiveR1 + effectiveR2

  const normalizedR1 = effectiveR1 / effectiveTotal
  const normalizedR2 = effectiveR2 / effectiveTotal

  return {
    l: paint1.lab_values.l * normalizedR1 + paint2.lab_values.l * normalizedR2,
    a: paint1.lab_values.a * normalizedR1 + paint2.lab_values.a * normalizedR2,
    b: paint1.lab_values.b * normalizedR1 + paint2.lab_values.b * normalizedR2
  }
}

/**
 * Calculate optimal paint ratios to achieve target color
 * Uses iterative approach to minimize Delta E
 */
export function optimizePaintRatios(
  targetLab: LABColor,
  availablePaints: PaintProperties[],
  maxPaints: number = 3
): PaintRatio[] {
  if (availablePaints.length === 0) {
    throw new Error('No paints available')
  }

  // For simplicity, start with greedy selection of best matching paints
  // In a full implementation, this would use genetic algorithms or simulated annealing

  const paintDistances = availablePaints.map(paint => ({
    paint,
    distance: calculateColorDistance(targetLab, paint.lab_values)
  })).sort((a, b) => a.distance - b.distance)

  // Select top paints up to maxPaints
  const selectedPaints = paintDistances.slice(0, Math.min(maxPaints, paintDistances.length))

  if (selectedPaints.length === 1) {
    return [{
      paint_id: selectedPaints[0].paint.id,
      paint_name: selectedPaints[0].paint.name,
      volume_ml: 100,
      percentage: 100
    }]
  }

  // Weighted ratio optimization based on color distance
  // Paints closer to target color get higher weight

  // Inverse distance weighting - closer paints get more weight
  const weights = selectedPaints.map(p => {
    // Avoid division by zero for exact matches
    const inverseDistance = p.distance === 0 ? 1000 : 1 / (p.distance + 0.1)
    return inverseDistance
  })

  // Normalize weights to sum to 100%
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const normalizedWeights = weights.map(w => (w / weightSum) * 100)

  // Simple gradient descent optimization (50 iterations)
  let bestRatios = normalizedWeights.slice()
  let bestDeltaE = Infinity

  for (let iteration = 0; iteration < 50; iteration++) {
    const ratios = iteration === 0
      ? bestRatios.slice()  // Start with weighted ratios
      : bestRatios.map(r => Math.max(1, Math.min(98, r + (Math.random() - 0.5) * 20)))

    // Normalize ratios to sum to 100%
    const sum = ratios.reduce((a, b) => a + b, 0)
    const normalizedRatios = ratios.map(r => (r / sum) * 100)

    // Calculate mixed color with these ratios
    const paintRatiosWithProps = selectedPaints.map((item, i) => ({
      paint_id: item.paint.id,
      paint_name: item.paint.name,
      volume_ml: (normalizedRatios[i] / 100) * 200,
      percentage: normalizedRatios[i],
      paint_properties: item.paint
    }))

    try {
      const mixResult = mixMultiplePaints(paintRatiosWithProps)
      const deltaE = calculateColorDistance(targetLab, mixResult.calculated_color)

      if (deltaE < bestDeltaE) {
        bestDeltaE = deltaE
        bestRatios = normalizedRatios.slice()
      }
    } catch {
      // Skip invalid ratio combinations
      continue
    }
  }

  // Return optimized ratios
  return selectedPaints.map((item, i) => ({
    paint_id: item.paint.id,
    paint_name: item.paint.name,
    volume_ml: (bestRatios[i] / 100) * 200,
    percentage: bestRatios[i]
  }))
}

/**
 * Calculate simple color distance for paint selection
 */
function calculateColorDistance(lab1: LABColor, lab2: LABColor): number {
  return Math.sqrt(
    Math.pow(lab1.l - lab2.l, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  )
}

/**
 * Validate paint properties
 */
export function validatePaintProperties(paint: PaintProperties): boolean {
  return (
    paint.k_coefficient >= 0 && paint.k_coefficient <= 1 &&
    paint.s_coefficient >= 0 && paint.s_coefficient <= 1 &&
    paint.opacity >= 0 && paint.opacity <= 1 &&
    paint.tinting_strength >= 0 && paint.tinting_strength <= 1 &&
    paint.transparency_index >= 0 &&
    typeof paint.id === 'string' && paint.id.length > 0 &&
    typeof paint.name === 'string' && paint.name.length > 0
  )
}

/**
 * Calculate undertone color by mixing with titanium white
 */
export function calculateUndertone(paint: PaintProperties, whiteRatio: number = 0.9): LABColor {
  // Simplified undertone calculation
  // Mix with white (L=95, a=0, b=0) at given ratio
  const white: LABColor = { l: 95, a: 0, b: 0 }

  return {
    l: paint.lab_values.l * (1 - whiteRatio) + white.l * whiteRatio,
    a: paint.lab_values.a * (1 - whiteRatio) + white.a * whiteRatio,
    b: paint.lab_values.b * (1 - whiteRatio) + white.b * whiteRatio
  }
}

/**
 * Estimate drying time based on paint composition
 */
export function estimateDryingTime(paintRatios: PaintRatio[]): {
  touch_dry_hours: number
  fully_dry_days: number
} {
  // Simplified drying time estimation
  // Based on opacity and volume - more opaque and thicker = longer drying

  const totalVolume = paintRatios.reduce((sum, ratio) => sum + ratio.volume_ml, 0)
  const avgOpacity = paintRatios.reduce((sum, ratio, _, arr) => {
    const opacity = ratio.paint_properties?.opacity || 0.5
    return sum + opacity / arr.length
  }, 0)

  // Base drying times for oil paints
  const baseTouchDry = 6 // hours
  const baseFullyDry = 3 // days

  // Adjust based on thickness and opacity
  const thicknessFactor = Math.min(2, totalVolume / 100) // Normalize to 100ml baseline
  const opacityFactor = 0.5 + avgOpacity * 0.5 // 0.5-1.0 range

  return {
    touch_dry_hours: Math.round(baseTouchDry * thicknessFactor * opacityFactor),
    fully_dry_days: Math.round(baseFullyDry * thicknessFactor * opacityFactor)
  }
}

/**
 * Generate mixing recommendations based on paint combination
 */
export function generateMixingRecommendations(paintRatios: PaintRatio[]): string[] {
  const recommendations: string[] = []

  if (paintRatios.length > 3) {
    recommendations.push('Consider simplifying: mixing more than 3 colors may result in muddy tones')
  }

  // Check for complementary colors (simplified)
  const hasWarmAndCool = paintRatios.some(ratio => {
    const lab = ratio.paint_properties?.lab_values
    return lab && lab.b > 10 // warm
  }) && paintRatios.some(ratio => {
    const lab = ratio.paint_properties?.lab_values
    return lab && lab.b < -10 // cool
  })

  if (hasWarmAndCool) {
    recommendations.push('Warm and cool colors detected - consider adding Titanium White to prevent muddiness')
  }

  // Check for high opacity combinations
  const highOpacityCount = paintRatios.filter(ratio =>
    (ratio.paint_properties?.opacity || 0) > 0.8
  ).length

  if (highOpacityCount === paintRatios.length && paintRatios.length > 1) {
    recommendations.push('All paints have high opacity - mix gradually to control color intensity')
  }

  // Check for transparent paints
  const transparentCount = paintRatios.filter(ratio =>
    (ratio.paint_properties?.opacity || 1) < 0.3
  ).length

  if (transparentCount > 0) {
    recommendations.push('Transparent paints detected - consider using as glazes over opaque base')
  }

  return recommendations
}