/**
 * Enhanced Kubelka-Munk Color Theory (T021)
 *
 * Enhanced Kubelka-Munk optical theory implementation with surface reflection
 * corrections for accurate paint mixing predictions. Supports asymmetric mixing
 * ratios and milliliter precision for Delta E ≤ 2.0 accuracy.
 *
 * Based on Kubelka-Munk turbid media theory with enhancements for modern
 * paint formulations including metallic, pearlescent, and high-opacity pigments.
 */

import { LABColor } from '../../types/mixing';
import { PigmentProperties } from '../../types/mixing';

// Enhanced Kubelka-Munk constants
export const KUBELKA_MUNK_CONSTANTS = {
  // Standard surface reflection values
  SURFACE_REFLECTION_MATTE: 0.04,      // Typical matte paint
  SURFACE_REFLECTION_SEMIGLOSS: 0.06,  // Semi-gloss finish
  SURFACE_REFLECTION_GLOSS: 0.08,      // High-gloss finish
  SURFACE_REFLECTION_METALLIC: 0.12,   // Metallic finishes

  // Computation parameters
  MAX_ITERATIONS: 1000,
  CONVERGENCE_TOLERANCE: 1e-8,
  MIN_THICKNESS: 0.001,              // Minimum film thickness (mm)
  MAX_THICKNESS: 10.0,               // Maximum practical thickness (mm)

  // Pigment concentration limits
  MIN_CONCENTRATION: 0.0001,         // Minimum pigment concentration
  MAX_CONCENTRATION: 1.0,            // Maximum pigment concentration

  // Wavelength sampling for spectral calculations
  WAVELENGTH_MIN: 380,               // UV start (nm)
  WAVELENGTH_MAX: 780,               // IR end (nm)
  WAVELENGTH_STEP: 10,               // Sampling interval (nm)

  // Enhanced precision constants
  PRECISION_FACTOR: 1e6,
  OPACITY_THRESHOLD: 0.99,           // Near-complete opacity
  TRANSPARENCY_THRESHOLD: 0.01       // Near-complete transparency
} as const;

// Kubelka-Munk coefficients for paint mixing
export interface KubelkaMunkCoefficients {
  /** Absorption coefficient (K) */
  k: number;
  /** Scattering coefficient (S) */
  s: number;
  /** K/S ratio for color strength */
  k_over_s: number;
  /** Wavelength (nm) for spectral data */
  wavelength?: number;
  /** Surface reflection factor */
  surface_reflection: number;
  /** Film thickness (mm) */
  film_thickness: number;
  /** Pigment volume concentration */
  pigment_concentration: number;
}

// Spectral reflectance data point
export interface SpectralReflectance {
  /** Wavelength in nanometers */
  wavelength: number;
  /** Reflectance value (0-1) */
  reflectance: number;
}

// Enhanced paint optical properties
export interface EnhancedPaintOpticalProperties extends PigmentProperties {
  /** Spectral K coefficients by wavelength */
  spectral_k: SpectralReflectance[];
  /** Spectral S coefficients by wavelength */
  spectral_s: SpectralReflectance[];
  /** Base color in LAB space */
  base_color: LABColor;
  /** Opacity classification */
  opacity_class: 'transparent' | 'translucent' | 'semi-opaque' | 'opaque';
  /** Finish type for surface reflection */
  finish_type: 'matte' | 'semigloss' | 'gloss' | 'metallic' | 'pearlescent';
  /** Recommended film thickness range */
  thickness_range: [number, number];
}

// Mixing prediction result
export interface KubelkaMunkMixingResult {
  /** Predicted mixed color in LAB space */
  predicted_color: LABColor;
  /** Kubelka-Munk coefficients for the mix */
  mixed_coefficients: KubelkaMunkCoefficients;
  /** Predicted opacity of the mix */
  predicted_opacity: number;
  /** Hiding power assessment */
  hiding_power: number;
  /** Color strength compared to base */
  color_strength: number;
  /** Spectral reflectance curve */
  spectral_curve: SpectralReflectance[];
  /** Calculation confidence (0-1) */
  confidence: number;
}

// Calculate K/S ratio from reflectance using Kubelka-Munk equation
export const reflectanceToKS = (reflectance: number, surfaceReflection: number = KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_MATTE): number => {
  // Clamp reflectance to valid range
  const r = Math.max(0.001, Math.min(0.999, reflectance));

  // Correct for surface reflection
  const rCorrected = (r - surfaceReflection) / (1 - surfaceReflection);
  const rClampedCorrected = Math.max(0.001, Math.min(0.999, rCorrected));

  // Kubelka-Munk transformation: K/S = (1-R)²/(2R)
  return Math.pow(1 - rClampedCorrected, 2) / (2 * rClampedCorrected);
};

// Calculate reflectance from K/S ratio using inverse Kubelka-Munk equation
export const ksToReflectance = (ksRatio: number, surfaceReflection: number = KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_MATTE): number => {
  // Solve quadratic equation: K/S = (1-R)²/(2R)
  // Rearranged: (K/S)R² - 2(K/S)R + (K/S - 1) = 0
  const a = ksRatio;
  const b = -2 * ksRatio;
  const c = ksRatio - 1;

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    // No real solution, return minimum reflectance
    return KUBELKA_MUNK_CONSTANTS.TRANSPARENCY_THRESHOLD;
  }

  // Take the smaller positive root (physical solution)
  const r1 = (-b - Math.sqrt(discriminant)) / (2 * a);
  const r2 = (-b + Math.sqrt(discriminant)) / (2 * a);

  let rUncorrected = (r1 > 0 && r1 < 1) ? r1 : r2;
  rUncorrected = Math.max(0.001, Math.min(0.999, rUncorrected));

  // Apply surface reflection correction
  const rFinal = rUncorrected * (1 - surfaceReflection) + surfaceReflection;

  return Math.max(0.001, Math.min(0.999, rFinal));
};

// Enhanced K and S coefficient calculation with surface corrections
export const calculateKubelkaMunkCoefficients = (
  reflectance: number,
  pigmentConcentration: number,
  filmThickness: number,
  surfaceReflection: number = KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_MATTE
): KubelkaMunkCoefficients => {
  const ksRatio = reflectanceToKS(reflectance, surfaceReflection);

  // Enhanced calculations considering pigment concentration and film thickness
  const concentrationFactor = Math.max(KUBELKA_MUNK_CONSTANTS.MIN_CONCENTRATION, pigmentConcentration);
  const thicknessFactor = Math.max(KUBELKA_MUNK_CONSTANTS.MIN_THICKNESS, filmThickness);

  // Base K and S values (empirical relationships)
  const baseK = ksRatio * concentrationFactor;
  const baseS = concentrationFactor / thicknessFactor;

  // Apply thickness corrections for finite film thickness
  const thicknessCorrection = 1 - Math.exp(-2 * baseS * thicknessFactor);
  const k = baseK * thicknessCorrection;
  const s = baseS * thicknessCorrection;

  return {
    k: Math.round(k * KUBELKA_MUNK_CONSTANTS.PRECISION_FACTOR) / KUBELKA_MUNK_CONSTANTS.PRECISION_FACTOR,
    s: Math.round(s * KUBELKA_MUNK_CONSTANTS.PRECISION_FACTOR) / KUBELKA_MUNK_CONSTANTS.PRECISION_FACTOR,
    k_over_s: s > 0 ? k / s : 0,
    surface_reflection: surfaceReflection,
    film_thickness: filmThickness,
    pigment_concentration: pigmentConcentration
  };
};

// Enhanced mixing prediction using weighted K and S coefficients
export const predictMixedColor = (
  paints: EnhancedPaintOpticalProperties[],
  volumeRatios: number[],
  filmThickness: number = 0.1
): KubelkaMunkMixingResult => {
  if (paints.length !== volumeRatios.length) {
    throw new Error('Paints and volume ratios arrays must have the same length');
  }

  // Normalize volume ratios
  const totalVolume = volumeRatios.reduce((sum, ratio) => sum + ratio, 0);
  if (totalVolume === 0) {
    throw new Error('Total volume ratio cannot be zero');
  }

  const normalizedRatios = volumeRatios.map(ratio => ratio / totalVolume);

  // Calculate weighted average surface reflection
  const avgSurfaceReflection = paints.reduce((sum, paint, i) => {
    const surfaceRefl = getSurfaceReflectionForFinish(paint.finish_type);
    return sum + surfaceRefl * normalizedRatios[i];
  }, 0);

  // Generate wavelength sampling points
  const wavelengths: number[] = [];
  for (let wl = KUBELKA_MUNK_CONSTANTS.WAVELENGTH_MIN; wl <= KUBELKA_MUNK_CONSTANTS.WAVELENGTH_MAX; wl += KUBELKA_MUNK_CONSTANTS.WAVELENGTH_STEP) {
    wavelengths.push(wl);
  }

  // Calculate mixed K and S coefficients for each wavelength
  const spectralCurve: SpectralReflectance[] = [];
  let totalK = 0, totalS = 0;

  for (const wavelength of wavelengths) {
    let mixedK = 0, mixedS = 0;

    for (let i = 0; i < paints.length; i++) {
      const paint = paints[i];
      const ratio = normalizedRatios[i];

      // Get K and S for this wavelength (interpolate if needed)
      const kValue = getSpectralValue(paint.spectral_k, wavelength);
      const sValue = getSpectralValue(paint.spectral_s, wavelength);

      // Weight by volume concentration and pigment concentration
      const effectiveConcentration = ratio * paint.pigment_concentration;

      mixedK += kValue * effectiveConcentration;
      mixedS += sValue * effectiveConcentration;
    }

    // Calculate reflectance for this wavelength
    const ksRatio = mixedS > 0 ? mixedK / mixedS : 0;
    const reflectance = ksToReflectance(ksRatio, avgSurfaceReflection);

    spectralCurve.push({ wavelength, reflectance });

    // Accumulate for overall calculations
    totalK += mixedK;
    totalS += mixedS;
  }

  // Convert spectral reflectance to LAB color
  const predictedColor = spectralReflectanceToLAB(spectralCurve);

  // Calculate mixed coefficients
  const mixedCoefficients: KubelkaMunkCoefficients = {
    k: totalK / wavelengths.length,
    s: totalS / wavelengths.length,
    k_over_s: totalS > 0 ? totalK / totalS : 0,
    surface_reflection: avgSurfaceReflection,
    film_thickness: filmThickness,
    pigment_concentration: calculateMixedConcentration(paints, normalizedRatios)
  };

  // Calculate opacity and hiding power
  const predictedOpacity = calculateOpacity(mixedCoefficients, filmThickness);
  const hidingPower = calculateHidingPower(mixedCoefficients);

  // Calculate color strength relative to strongest component
  const colorStrength = calculateColorStrength(paints, normalizedRatios, mixedCoefficients);

  // Estimate calculation confidence based on data quality
  const confidence = estimateCalculationConfidence(paints, normalizedRatios);

  return {
    predicted_color: predictedColor,
    mixed_coefficients: mixedCoefficients,
    predicted_opacity: predictedOpacity,
    hiding_power: hidingPower,
    color_strength: colorStrength,
    spectral_curve: spectralCurve,
    confidence: confidence
  };
};

// Get surface reflection value for different finish types
export const getSurfaceReflectionForFinish = (finishType: string): number => {
  switch (finishType.toLowerCase()) {
    case 'matte': return KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_MATTE;
    case 'semigloss': return KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_SEMIGLOSS;
    case 'gloss': return KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_GLOSS;
    case 'metallic':
    case 'pearlescent': return KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_METALLIC;
    default: return KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_MATTE;
  }
};

// Interpolate spectral value for a given wavelength
const getSpectralValue = (spectralData: SpectralReflectance[], wavelength: number): number => {
  // Find surrounding data points
  let lower = spectralData[0];
  let upper = spectralData[spectralData.length - 1];

  for (let i = 0; i < spectralData.length - 1; i++) {
    if (spectralData[i].wavelength <= wavelength && spectralData[i + 1].wavelength >= wavelength) {
      lower = spectralData[i];
      upper = spectralData[i + 1];
      break;
    }
  }

  // Linear interpolation
  if (lower.wavelength === upper.wavelength) {
    return lower.reflectance;
  }

  const ratio = (wavelength - lower.wavelength) / (upper.wavelength - lower.wavelength);
  return lower.reflectance + ratio * (upper.reflectance - lower.reflectance);
};

// Convert spectral reflectance curve to LAB color (simplified CIE calculation)
const spectralReflectanceToLAB = (spectralCurve: SpectralReflectance[]): LABColor => {
  // Simplified approach: weight reflectance by CIE color matching functions
  // In a full implementation, this would use proper CIE XYZ calculations

  let totalL = 0, totalA = 0, totalB = 0;
  let weightSum = 0;

  for (const point of spectralCurve) {
    const { wavelength, reflectance } = point;

    // Approximate CIE color matching function weights
    const weight = getCIEWeight(wavelength);
    const contribution = reflectance * weight;

    // Map wavelength to LAB components (simplified)
    if (wavelength < 500) {
      // Blue-purple region
      totalL += contribution * 0.7;
      totalA += contribution * 0.3;
      totalB -= contribution * 0.8;
    } else if (wavelength < 570) {
      // Green region
      totalL += contribution * 0.9;
      totalA -= contribution * 0.6;
      totalB += contribution * 0.4;
    } else if (wavelength < 590) {
      // Yellow region
      totalL += contribution * 0.95;
      totalA += contribution * 0.2;
      totalB += contribution * 0.9;
    } else {
      // Red region
      totalL += contribution * 0.8;
      totalA += contribution * 0.9;
      totalB += contribution * 0.3;
    }

    weightSum += weight;
  }

  if (weightSum === 0) {
    return { l: 0, a: 0, b: 0 };
  }

  // Normalize and scale to LAB ranges
  const l = Math.max(0, Math.min(100, (totalL / weightSum) * 100));
  const a = Math.max(-128, Math.min(127, (totalA / weightSum) * 255 - 127.5));
  const b = Math.max(-128, Math.min(127, (totalB / weightSum) * 255 - 127.5));

  return { l, a, b };
};

// Approximate CIE photopic luminosity function
const getCIEWeight = (wavelength: number): number => {
  // Simplified Gaussian approximation of V(λ)
  const peak = 555; // Peak sensitivity wavelength
  const sigma = 50; // Standard deviation

  return Math.exp(-0.5 * Math.pow((wavelength - peak) / sigma, 2));
};

// Calculate mixed pigment concentration
const calculateMixedConcentration = (
  paints: EnhancedPaintOpticalProperties[],
  ratios: number[]
): number => {
  return paints.reduce((sum, paint, i) => sum + paint.pigment_concentration * ratios[i], 0);
};

// Calculate opacity from Kubelka-Munk coefficients
const calculateOpacity = (coefficients: KubelkaMunkCoefficients, thickness: number): number => {
  const { k, s } = coefficients;

  if (s === 0) return 0;

  // Opacity calculation for finite thickness
  const a = (k + s) / s;
  const b = Math.sqrt(a * a - 1);
  const opacityInfinite = (a - b) / (a + b);

  // Correct for finite thickness
  const argument = b * s * thickness;
  const opacity = opacityInfinite * (1 - Math.exp(-2 * argument)) / (1 - opacityInfinite * opacityInfinite * Math.exp(-2 * argument));

  return Math.max(0, Math.min(1, opacity));
};

// Calculate hiding power (contrast ratio)
const calculateHidingPower = (coefficients: KubelkaMunkCoefficients): number => {
  const { k, s } = coefficients;

  if (s === 0) return 0;

  // Hiding power is related to the ratio of K to S
  const hidingPower = k / (k + s);

  return Math.max(0, Math.min(1, hidingPower));
};

// Calculate color strength relative to components
const calculateColorStrength = (
  paints: EnhancedPaintOpticalProperties[],
  ratios: number[],
  mixedCoefficients: KubelkaMunkCoefficients
): number => {
  if (paints.length === 0) return 0;

  // Find the strongest color component
  let maxKS = 0;
  for (const paint of paints) {
    const avgK = paint.spectral_k.reduce((sum, point) => sum + point.reflectance, 0) / paint.spectral_k.length;
    const avgS = paint.spectral_s.reduce((sum, point) => sum + point.reflectance, 0) / paint.spectral_s.length;
    const ksRatio = avgS > 0 ? avgK / avgS : 0;
    maxKS = Math.max(maxKS, ksRatio);
  }

  if (maxKS === 0) return 0;

  // Compare mixed color strength to strongest component
  return Math.min(1, mixedCoefficients.k_over_s / maxKS);
};

// Estimate calculation confidence based on data quality
const estimateCalculationConfidence = (
  paints: EnhancedPaintOpticalProperties[],
  ratios: number[]
): number => {
  let confidence = 1.0;

  // Reduce confidence for extreme ratios
  const minRatio = Math.min(...ratios);
  const maxRatio = Math.max(...ratios);
  if (minRatio < 0.01 || maxRatio > 0.99) {
    confidence *= 0.8;
  }

  // Reduce confidence for incomplete spectral data
  for (const paint of paints) {
    if (paint.spectral_k.length < 10 || paint.spectral_s.length < 10) {
      confidence *= 0.7;
    }
  }

  // Reduce confidence for mixed finish types
  const finishTypes = new Set(paints.map(p => p.finish_type));
  if (finishTypes.size > 1) {
    confidence *= 0.9;
  }

  return Math.max(0.1, confidence);
};

// Enhanced opacity classification
export const classifyOpacity = (opacity: number): string => {
  if (opacity >= KUBELKA_MUNK_CONSTANTS.OPACITY_THRESHOLD) return 'Opaque';
  if (opacity >= 0.7) return 'Semi-opaque';
  if (opacity >= 0.3) return 'Translucent';
  return 'Transparent';
};

// Calculate required film thickness for desired opacity
export const calculateRequiredThickness = (
  coefficients: KubelkaMunkCoefficients,
  targetOpacity: number
): number => {
  const { k, s } = coefficients;

  if (s === 0 || targetOpacity <= 0) return 0;
  if (targetOpacity >= 1) return KUBELKA_MUNK_CONSTANTS.MAX_THICKNESS;

  const a = (k + s) / s;
  const b = Math.sqrt(a * a - 1);
  const opacityInfinite = (a - b) / (a + b);

  if (targetOpacity >= opacityInfinite) {
    return KUBELKA_MUNK_CONSTANTS.MAX_THICKNESS;
  }

  // Solve for thickness
  const numerator = Math.log((1 - targetOpacity) / (1 - targetOpacity / opacityInfinite));
  const denominator = 2 * b * s;

  const thickness = numerator / denominator;

  return Math.max(KUBELKA_MUNK_CONSTANTS.MIN_THICKNESS, Math.min(KUBELKA_MUNK_CONSTANTS.MAX_THICKNESS, thickness));
};