/**
 * CIEDE2000 Delta E Calculations (T022)
 *
 * High-precision CIEDE2000 color difference calculations for enhanced color
 * accuracy optimization targeting Delta E ≤ 2.0. Includes comprehensive
 * implementation with all correction terms and enhanced numerical precision.
 *
 * Based on CIE Technical Report CIE 142:2001 "Improvement to industrial
 * colour-difference evaluation" with optimizations for paint mixing applications.
 */

import { LABColor } from '../../types/mixing';

// CIEDE2000 calculation constants
export const CIEDE2000_CONSTANTS = {
  // Parametric factors (typically set to 1.0)
  KL: 1.0,    // Lightness weighting
  KC: 1.0,    // Chroma weighting
  KH: 1.0,    // Hue weighting

  // Mathematical constants
  DEG_TO_RAD: Math.PI / 180,
  RAD_TO_DEG: 180 / Math.PI,

  // Calculation parameters
  POW25_7: Math.pow(25, 7),    // 6103515625
  PRECISION_FACTOR: 1e10,       // Enhanced precision
  ANGLE_THRESHOLD: 180,         // Hue angle threshold

  // Delta E classification thresholds
  JUST_NOTICEABLE: 1.0,        // JND threshold
  ACCEPTABLE: 2.3,             // Acceptable difference
  PERCEPTIBLE: 5.0,            // Clearly perceptible
  VERY_DIFFERENT: 10.0         // Very different colors
} as const;

// CIEDE2000 calculation result with detailed breakdown
export interface CIEDE2000Result {
  /** Final CIEDE2000 Delta E value */
  delta_e: number;
  /** Lightness difference component */
  delta_l_prime: number;
  /** Chroma difference component */
  delta_c_prime: number;
  /** Hue difference component */
  delta_h_prime: number;
  /** Rotation term (RT) */
  rotation_term: number;
  /** Lightness weighting function (SL) */
  sl_weighting: number;
  /** Chroma weighting function (SC) */
  sc_weighting: number;
  /** Hue weighting function (SH) */
  sh_weighting: number;
  /** Intermediate values for debugging */
  intermediate_values: CIEDE2000Intermediate;
  /** Perceptual classification */
  perceptual_classification: string;
  /** Calculation confidence (0-1) */
  confidence: number;
}

// Intermediate calculation values for detailed analysis
export interface CIEDE2000Intermediate {
  /** Modified a* values */
  a_prime: [number, number];
  /** Modified chroma values */
  c_prime: [number, number];
  /** Modified hue angles */
  h_prime: [number, number];
  /** Average values */
  l_avg: number;
  c_prime_avg: number;
  h_prime_avg: number;
  /** G factor for a* modification */
  g_factor: number;
  /** T factor for hue weighting */
  t_factor: number;
  /** Delta theta for rotation term */
  delta_theta: number;
  /** RC factor for rotation calculation */
  rc_factor: number;
}

// Enhanced CIEDE2000 calculation with full precision
export const calculateCIEDE2000 = (
  lab1: LABColor,
  lab2: LABColor,
  kL: number = CIEDE2000_CONSTANTS.KL,
  kC: number = CIEDE2000_CONSTANTS.KC,
  kH: number = CIEDE2000_CONSTANTS.KH
): CIEDE2000Result => {
  // Step 1: Calculate preliminary values
  const c1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
  const c2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
  const cAvg = (c1 + c2) / 2;

  // Step 2: Calculate G factor for a* modification
  const cAvg7 = Math.pow(cAvg, 7);
  const gFactor = 0.5 * (1 - Math.sqrt(cAvg7 / (cAvg7 + CIEDE2000_CONSTANTS.POW25_7)));

  // Step 3: Calculate modified a* and C* values
  const a1Prime = (1 + gFactor) * lab1.a;
  const a2Prime = (1 + gFactor) * lab2.a;
  const c1Prime = Math.sqrt(a1Prime * a1Prime + lab1.b * lab1.b);
  const c2Prime = Math.sqrt(a2Prime * a2Prime + lab2.b * lab2.b);
  const cPrimeAvg = (c1Prime + c2Prime) / 2;

  // Step 4: Calculate modified hue angles
  const h1Prime = calculateHuePrime(a1Prime, lab1.b);
  const h2Prime = calculateHuePrime(a2Prime, lab2.b);

  // Step 5: Calculate average hue with proper handling of circular mean
  const hPrimeAvg = calculateAverageHue(h1Prime, h2Prime, c1Prime, c2Prime);

  // Step 6: Calculate differences
  const deltaLPrime = lab2.l - lab1.l;
  const deltaCPrime = c2Prime - c1Prime;
  const deltaHPrime = calculateHueDifference(h1Prime, h2Prime, c1Prime, c2Prime);

  // Step 7: Calculate T factor
  const tFactor = calculateTFactor(hPrimeAvg);

  // Step 8: Calculate weighting functions
  const lAvg = (lab1.l + lab2.l) / 2;
  const sl = calculateLightnessWeighting(lAvg);
  const sc = calculateChromaWeighting(cPrimeAvg);
  const sh = calculateHueWeighting(cPrimeAvg, tFactor);

  // Step 9: Calculate rotation term
  const deltaTheta = calculateDeltaTheta(hPrimeAvg);
  const rc = calculateRC(cPrimeAvg);
  const rt = -rc * Math.sin(2 * deltaTheta * CIEDE2000_CONSTANTS.DEG_TO_RAD);

  // Step 10: Calculate final Delta E components
  const lComponent = deltaLPrime / (kL * sl);
  const cComponent = deltaCPrime / (kC * sc);
  const hComponent = deltaHPrime / (kH * sh);
  const rtComponent = rt * cComponent * hComponent;

  // Step 11: Calculate final Delta E
  const deltaE = Math.sqrt(
    lComponent * lComponent +
    cComponent * cComponent +
    hComponent * hComponent +
    rtComponent
  );

  // Prepare intermediate values for analysis
  const intermediateValues: CIEDE2000Intermediate = {
    a_prime: [a1Prime, a2Prime],
    c_prime: [c1Prime, c2Prime],
    h_prime: [h1Prime, h2Prime],
    l_avg: lAvg,
    c_prime_avg: cPrimeAvg,
    h_prime_avg: hPrimeAvg,
    g_factor: gFactor,
    t_factor: tFactor,
    delta_theta: deltaTheta,
    rc_factor: rc
  };

  // Calculate confidence based on color space region
  const confidence = calculateCalculationConfidence(lab1, lab2, deltaE);

  // Classify perceptual difference
  const perceptualClassification = classifyPerceptualDifference(deltaE);

  return {
    delta_e: Math.round(deltaE * CIEDE2000_CONSTANTS.PRECISION_FACTOR) / CIEDE2000_CONSTANTS.PRECISION_FACTOR,
    delta_l_prime: Math.round(deltaLPrime * CIEDE2000_CONSTANTS.PRECISION_FACTOR) / CIEDE2000_CONSTANTS.PRECISION_FACTOR,
    delta_c_prime: Math.round(deltaCPrime * CIEDE2000_CONSTANTS.PRECISION_FACTOR) / CIEDE2000_CONSTANTS.PRECISION_FACTOR,
    delta_h_prime: Math.round(deltaHPrime * CIEDE2000_CONSTANTS.PRECISION_FACTOR) / CIEDE2000_CONSTANTS.PRECISION_FACTOR,
    rotation_term: Math.round(rt * CIEDE2000_CONSTANTS.PRECISION_FACTOR) / CIEDE2000_CONSTANTS.PRECISION_FACTOR,
    sl_weighting: Math.round(sl * CIEDE2000_CONSTANTS.PRECISION_FACTOR) / CIEDE2000_CONSTANTS.PRECISION_FACTOR,
    sc_weighting: Math.round(sc * CIEDE2000_CONSTANTS.PRECISION_FACTOR) / CIEDE2000_CONSTANTS.PRECISION_FACTOR,
    sh_weighting: Math.round(sh * CIEDE2000_CONSTANTS.PRECISION_FACTOR) / CIEDE2000_CONSTANTS.PRECISION_FACTOR,
    intermediate_values: intermediateValues,
    perceptual_classification: perceptualClassification,
    confidence: confidence
  };
};

// Calculate hue angle with proper quadrant handling
const calculateHuePrime = (aPrime: number, b: number): number => {
  if (aPrime === 0 && b === 0) return 0;

  let hPrime = Math.atan2(b, aPrime) * CIEDE2000_CONSTANTS.RAD_TO_DEG;

  // Ensure positive angle
  if (hPrime < 0) {
    hPrime += 360;
  }

  return hPrime;
};

// Calculate average hue with proper circular mean
const calculateAverageHue = (h1Prime: number, h2Prime: number, c1Prime: number, c2Prime: number): number => {
  // Handle achromatic colors
  if (c1Prime === 0 || c2Prime === 0) {
    return h1Prime + h2Prime;
  }

  const absHueDiff = Math.abs(h1Prime - h2Prime);

  if (absHueDiff <= CIEDE2000_CONSTANTS.ANGLE_THRESHOLD) {
    // Simple average for small differences
    return (h1Prime + h2Prime) / 2;
  } else {
    // Circular mean for large differences
    let hAvg = (h1Prime + h2Prime) / 2;
    if (h1Prime + h2Prime < 360) {
      hAvg += 180;
    } else {
      hAvg -= 180;
    }
    return hAvg;
  }
};

// Calculate hue difference with proper circular handling
const calculateHueDifference = (h1Prime: number, h2Prime: number, c1Prime: number, c2Prime: number): number => {
  // Handle achromatic colors
  if (c1Prime === 0 || c2Prime === 0) {
    return 0;
  }

  const hueDiff = h2Prime - h1Prime;
  const absHueDiff = Math.abs(hueDiff);

  let deltaHPrime: number;

  if (absHueDiff <= CIEDE2000_CONSTANTS.ANGLE_THRESHOLD) {
    deltaHPrime = hueDiff;
  } else if (hueDiff > CIEDE2000_CONSTANTS.ANGLE_THRESHOLD) {
    deltaHPrime = hueDiff - 360;
  } else {
    deltaHPrime = hueDiff + 360;
  }

  // Convert to Delta H'
  return 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(deltaHPrime * CIEDE2000_CONSTANTS.DEG_TO_RAD / 2);
};

// Calculate T factor for hue weighting
const calculateTFactor = (hPrimeAvg: number): number => {
  const hAvgRad = hPrimeAvg * CIEDE2000_CONSTANTS.DEG_TO_RAD;

  return 1 - 0.17 * Math.cos(hAvgRad - 30 * CIEDE2000_CONSTANTS.DEG_TO_RAD) +
         0.24 * Math.cos(2 * hAvgRad) +
         0.32 * Math.cos(3 * hAvgRad + 6 * CIEDE2000_CONSTANTS.DEG_TO_RAD) -
         0.20 * Math.cos(4 * hAvgRad - 63 * CIEDE2000_CONSTANTS.DEG_TO_RAD);
};

// Calculate lightness weighting function SL
const calculateLightnessWeighting = (lAvg: number): number => {
  const lAvgMinus50Squared = (lAvg - 50) * (lAvg - 50);
  return 1 + (0.015 * lAvgMinus50Squared) / Math.sqrt(20 + lAvgMinus50Squared);
};

// Calculate chroma weighting function SC
const calculateChromaWeighting = (cPrimeAvg: number): number => {
  return 1 + 0.045 * cPrimeAvg;
};

// Calculate hue weighting function SH
const calculateHueWeighting = (cPrimeAvg: number, tFactor: number): number => {
  return 1 + 0.015 * cPrimeAvg * tFactor;
};

// Calculate delta theta for rotation term
const calculateDeltaTheta = (hPrimeAvg: number): number => {
  return 30 * Math.exp(-Math.pow((hPrimeAvg - 275) / 25, 2));
};

// Calculate RC factor for rotation term
const calculateRC = (cPrimeAvg: number): number => {
  const cPrimeAvg7 = Math.pow(cPrimeAvg, 7);
  return 2 * Math.sqrt(cPrimeAvg7 / (cPrimeAvg7 + CIEDE2000_CONSTANTS.POW25_7));
};

// Calculate calculation confidence based on color space region
const calculateCalculationConfidence = (lab1: LABColor, lab2: LABColor, deltaE: number): number => {
  let confidence = 1.0;

  // Reduce confidence near color space boundaries
  const colors = [lab1, lab2];
  for (const color of colors) {
    if (color.l < 5 || color.l > 95) confidence *= 0.9;
    if (Math.sqrt(color.a * color.a + color.b * color.b) > 100) confidence *= 0.9;
  }

  // Reduce confidence for very small differences (measurement noise)
  if (deltaE < 0.1) confidence *= 0.8;

  // Reduce confidence for very large differences (potential errors)
  if (deltaE > 50) confidence *= 0.7;

  return Math.max(0.1, confidence);
};

// Classify perceptual difference based on Delta E value
const classifyPerceptualDifference = (deltaE: number): string => {
  if (deltaE < CIEDE2000_CONSTANTS.JUST_NOTICEABLE) {
    return 'Imperceptible';
  } else if (deltaE < CIEDE2000_CONSTANTS.ACCEPTABLE) {
    return 'Just Noticeable';
  } else if (deltaE < CIEDE2000_CONSTANTS.PERCEPTIBLE) {
    return 'Perceptible';
  } else if (deltaE < CIEDE2000_CONSTANTS.VERY_DIFFERENT) {
    return 'Well Perceptible';
  } else {
    return 'Very Different';
  }
};

// Batch Delta E calculation for optimization
export const calculateBatchCIEDE2000 = (
  targetColor: LABColor,
  colors: LABColor[],
  weights?: { kL?: number; kC?: number; kH?: number }
): CIEDE2000Result[] => {
  const kL = weights?.kL ?? CIEDE2000_CONSTANTS.KL;
  const kC = weights?.kC ?? CIEDE2000_CONSTANTS.KC;
  const kH = weights?.kH ?? CIEDE2000_CONSTANTS.KH;

  return colors.map(color => calculateCIEDE2000(targetColor, color, kL, kC, kH));
};

// Find closest color from array using CIEDE2000
export const findClosestColor = (
  targetColor: LABColor,
  candidateColors: LABColor[],
  weights?: { kL?: number; kC?: number; kH?: number }
): { color: LABColor; index: number; deltaE: number } => {
  if (candidateColors.length === 0) {
    throw new Error('Candidate colors array cannot be empty');
  }

  const results = calculateBatchCIEDE2000(targetColor, candidateColors, weights);

  let minDeltaE = Infinity;
  let closestIndex = 0;

  for (let i = 0; i < results.length; i++) {
    if (results[i].delta_e < minDeltaE) {
      minDeltaE = results[i].delta_e;
      closestIndex = i;
    }
  }

  return {
    color: candidateColors[closestIndex],
    index: closestIndex,
    deltaE: minDeltaE
  };
};

// Enhanced color difference analysis
export interface ColorDifferenceAnalysis {
  /** CIEDE2000 result */
  ciede2000: CIEDE2000Result;
  /** Dominant difference component */
  dominant_component: 'lightness' | 'chroma' | 'hue';
  /** Component contributions (percentages) */
  component_contributions: {
    lightness: number;
    chroma: number;
    hue: number;
    rotation: number;
  };
  /** Recommendations for color adjustment */
  adjustment_recommendations: string[];
  /** Visual description of difference */
  visual_description: string;
}

// Comprehensive color difference analysis
export const analyzeColorDifference = (lab1: LABColor, lab2: LABColor): ColorDifferenceAnalysis => {
  const result = calculateCIEDE2000(lab1, lab2);

  // Calculate component contributions
  const totalVariance = result.delta_l_prime * result.delta_l_prime +
                       result.delta_c_prime * result.delta_c_prime +
                       result.delta_h_prime * result.delta_h_prime +
                       result.rotation_term * result.rotation_term;

  const contributions = {
    lightness: totalVariance > 0 ? (result.delta_l_prime * result.delta_l_prime / totalVariance) * 100 : 0,
    chroma: totalVariance > 0 ? (result.delta_c_prime * result.delta_c_prime / totalVariance) * 100 : 0,
    hue: totalVariance > 0 ? (result.delta_h_prime * result.delta_h_prime / totalVariance) * 100 : 0,
    rotation: totalVariance > 0 ? (result.rotation_term * result.rotation_term / totalVariance) * 100 : 0
  };

  // Determine dominant component
  let dominantComponent: 'lightness' | 'chroma' | 'hue' = 'lightness';
  let maxContribution = contributions.lightness;

  if (contributions.chroma > maxContribution) {
    dominantComponent = 'chroma';
    maxContribution = contributions.chroma;
  }

  if (contributions.hue > maxContribution) {
    dominantComponent = 'hue';
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (Math.abs(result.delta_l_prime) > 2) {
    recommendations.push(result.delta_l_prime > 0 ? 'Reduce lightness' : 'Increase lightness');
  }
  if (Math.abs(result.delta_c_prime) > 2) {
    recommendations.push(result.delta_c_prime > 0 ? 'Reduce saturation' : 'Increase saturation');
  }
  if (Math.abs(result.delta_h_prime) > 2) {
    recommendations.push('Adjust hue angle');
  }

  // Generate visual description
  const visualDescription = generateVisualDescription(result, dominantComponent);

  return {
    ciede2000: result,
    dominant_component: dominantComponent,
    component_contributions: contributions,
    adjustment_recommendations: recommendations,
    visual_description: visualDescription
  };
};

// Generate human-readable visual description
const generateVisualDescription = (result: CIEDE2000Result, dominantComponent: string): string => {
  const deltaE = result.delta_e;
  let description = '';

  if (deltaE < 1) {
    description = 'Colors are virtually identical';
  } else if (deltaE < 2) {
    description = 'Colors are very similar with subtle differences';
  } else if (deltaE < 5) {
    description = 'Colors are noticeably different';
  } else {
    description = 'Colors are distinctly different';
  }

  // Add component-specific information
  switch (dominantComponent) {
    case 'lightness':
      if (result.delta_l_prime > 0) {
        description += ', with the second color being lighter';
      } else {
        description += ', with the second color being darker';
      }
      break;
    case 'chroma':
      if (result.delta_c_prime > 0) {
        description += ', with the second color being more saturated';
      } else {
        description += ', with the second color being less saturated';
      }
      break;
    case 'hue':
      description += ', differing primarily in hue';
      break;
  }

  return description;
};

// Color tolerance checking for quality control
export const isWithinTolerance = (
  targetColor: LABColor,
  actualColor: LABColor,
  tolerance: number = 2.0,
  weights?: { kL?: number; kC?: number; kH?: number }
): { withinTolerance: boolean; deltaE: number; analysis: ColorDifferenceAnalysis } => {
  const analysis = analyzeColorDifference(targetColor, actualColor);
  const deltaE = weights
    ? calculateCIEDE2000(targetColor, actualColor, weights.kL, weights.kC, weights.kH).delta_e
    : analysis.ciede2000.delta_e;

  return {
    withinTolerance: deltaE <= tolerance,
    deltaE: deltaE,
    analysis: analysis
  };
};