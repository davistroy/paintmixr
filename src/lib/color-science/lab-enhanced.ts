/**
 * Enhanced LAB Color Utilities (T020)
 *
 * Enhanced LAB color space utilities with improved precision for color accuracy
 * optimization targeting Delta E ≤ 2.0. Includes high-precision conversions,
 * enhanced color distance calculations, and asymmetric color mixing support.
 *
 * Based on CIE L*a*b* color space specifications with enhanced numerical
 * precision for milliliter-accurate paint mixing calculations.
 */

import { LABColor } from '@/lib/types';

// Enhanced LAB color space constants with high precision
export const LAB_CONSTANTS = {
  // CIE standard illuminant D65 reference white point
  XN: 95.047,
  YN: 100.000,
  ZN: 108.883,

  // CIE L*a*b* transformation constants
  EPSILON: 0.008856451679035631,  // (6/29)^3
  KAPPA: 903.2962962962963,      // (29/3)^3

  // Enhanced precision constants
  PRECISION_TOLERANCE: 1e-10,
  MAX_ITERATIONS: 1000,

  // LAB color space bounds
  L_MIN: 0.0,
  L_MAX: 100.0,
  A_MIN: -128.0,
  A_MAX: 127.0,
  B_MIN: -128.0,
  B_MAX: 127.0,

  // Enhanced accuracy thresholds
  DELTA_E_EXCELLENT: 1.0,
  DELTA_E_GOOD: 2.0,
  DELTA_E_ACCEPTABLE: 4.0,
  DELTA_E_POOR: 8.0
} as const;

// RGB to XYZ conversion matrix (sRGB, D65)
const RGB_TO_XYZ_MATRIX = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.0721750],
  [0.0193339, 0.1191920, 0.9503041]
];

// XYZ to RGB conversion matrix (sRGB, D65)
const XYZ_TO_RGB_MATRIX = [
  [3.2404542, -1.5371385, -0.4985314],
  [-0.9692660, 1.8760108, 0.0415560],
  [0.0556434, -0.2040259, 1.0572252]
];

// Enhanced RGB color interface
export interface RGBColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

// Enhanced XYZ color interface
export interface XYZColor {
  x: number; // 0-100+
  y: number; // 0-100+
  z: number; // 0-100+
}

// LAB color validation with enhanced precision
export const validateLABColor = (color: LABColor): boolean => {
  return (
    typeof color.l === 'number' &&
    typeof color.a === 'number' &&
    typeof color.b === 'number' &&
    color.l >= LAB_CONSTANTS.L_MIN &&
    color.l <= LAB_CONSTANTS.L_MAX &&
    color.a >= LAB_CONSTANTS.A_MIN &&
    color.a <= LAB_CONSTANTS.A_MAX &&
    color.b >= LAB_CONSTANTS.B_MIN &&
    color.b <= LAB_CONSTANTS.B_MAX &&
    !isNaN(color.l) && !isNaN(color.a) && !isNaN(color.b)
  );
};

// Enhanced RGB to XYZ conversion with gamma correction
export const rgbToXYZ = (rgb: RGBColor): XYZColor => {
  // Normalize RGB values to 0-1 range
  let r = rgb.r / 255.0;
  let g = rgb.g / 255.0;
  let b = rgb.b / 255.0;

  // Apply inverse gamma correction (sRGB)
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Linear RGB to XYZ transformation
  const x = RGB_TO_XYZ_MATRIX[0][0] * r + RGB_TO_XYZ_MATRIX[0][1] * g + RGB_TO_XYZ_MATRIX[0][2] * b;
  const y = RGB_TO_XYZ_MATRIX[1][0] * r + RGB_TO_XYZ_MATRIX[1][1] * g + RGB_TO_XYZ_MATRIX[1][2] * b;
  const z = RGB_TO_XYZ_MATRIX[2][0] * r + RGB_TO_XYZ_MATRIX[2][1] * g + RGB_TO_XYZ_MATRIX[2][2] * b;

  // Scale to 0-100 range
  return {
    x: x * 100,
    y: y * 100,
    z: z * 100
  };
};

// Enhanced XYZ to RGB conversion with gamma correction
export const xyzToRGB = (xyz: XYZColor): RGBColor => {
  // Normalize XYZ values to 0-1 range
  const x = xyz.x / 100.0;
  const y = xyz.y / 100.0;
  const z = xyz.z / 100.0;

  // XYZ to linear RGB transformation
  let r = XYZ_TO_RGB_MATRIX[0][0] * x + XYZ_TO_RGB_MATRIX[0][1] * y + XYZ_TO_RGB_MATRIX[0][2] * z;
  let g = XYZ_TO_RGB_MATRIX[1][0] * x + XYZ_TO_RGB_MATRIX[1][1] * y + XYZ_TO_RGB_MATRIX[1][2] * z;
  let b = XYZ_TO_RGB_MATRIX[2][0] * x + XYZ_TO_RGB_MATRIX[2][1] * y + XYZ_TO_RGB_MATRIX[2][2] * z;

  // Apply gamma correction (sRGB)
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1.0 / 2.4) - 0.055 : r * 12.92;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1.0 / 2.4) - 0.055 : g * 12.92;
  b = b > 0.0031308 ? 1.055 * Math.pow(b, 1.0 / 2.4) - 0.055 : b * 12.92;

  // Clamp to 0-255 range and round
  return {
    r: Math.max(0, Math.min(255, Math.round(r * 255))),
    g: Math.max(0, Math.min(255, Math.round(g * 255))),
    b: Math.max(0, Math.min(255, Math.round(b * 255)))
  };
};

// Enhanced XYZ to LAB conversion with high precision
export const xyzToLAB = (xyz: XYZColor): LABColor => {
  // Normalize to reference white point
  const xr = xyz.x / LAB_CONSTANTS.XN;
  const yr = xyz.y / LAB_CONSTANTS.YN;
  const zr = xyz.z / LAB_CONSTANTS.ZN;

  // Apply CIE f(t) function with enhanced precision
  const fx = xr > LAB_CONSTANTS.EPSILON ? Math.cbrt(xr) : (LAB_CONSTANTS.KAPPA * xr + 16) / 116;
  const fy = yr > LAB_CONSTANTS.EPSILON ? Math.cbrt(yr) : (LAB_CONSTANTS.KAPPA * yr + 16) / 116;
  const fz = zr > LAB_CONSTANTS.EPSILON ? Math.cbrt(zr) : (LAB_CONSTANTS.KAPPA * zr + 16) / 116;

  // Calculate LAB values
  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  // Apply precision rounding for enhanced accuracy
  return {
    l: Math.round(l * 1e6) / 1e6,
    a: Math.round(a * 1e6) / 1e6,
    b: Math.round(b * 1e6) / 1e6
  };
};

// Enhanced LAB to XYZ conversion with high precision
export const labToXYZ = (lab: LABColor): XYZColor => {
  // Calculate intermediate values
  const fy = (lab.l + 16) / 116;
  const fx = lab.a / 500 + fy;
  const fz = fy - lab.b / 200;

  // Apply inverse CIE f(t) function
  const xr = fx * fx * fx > LAB_CONSTANTS.EPSILON ? fx * fx * fx : (116 * fx - 16) / LAB_CONSTANTS.KAPPA;
  const yr = lab.l > LAB_CONSTANTS.KAPPA * LAB_CONSTANTS.EPSILON ? fy * fy * fy : lab.l / LAB_CONSTANTS.KAPPA;
  const zr = fz * fz * fz > LAB_CONSTANTS.EPSILON ? fz * fz * fz : (116 * fz - 16) / LAB_CONSTANTS.KAPPA;

  // Scale by reference white point
  return {
    x: xr * LAB_CONSTANTS.XN,
    y: yr * LAB_CONSTANTS.YN,
    z: zr * LAB_CONSTANTS.ZN
  };
};

// Direct RGB to LAB conversion (enhanced precision)
export const rgbToLAB = (rgb: RGBColor): LABColor => {
  return xyzToLAB(rgbToXYZ(rgb));
};

// Direct LAB to RGB conversion (enhanced precision)
export const labToRGB = (lab: LABColor): RGBColor => {
  return xyzToRGB(labToXYZ(lab));
};

// Enhanced Delta E CIE76 calculation (legacy support)
export const deltaECIE76 = (lab1: LABColor, lab2: LABColor): number => {
  const deltaL = lab1.l - lab2.l;
  const deltaA = lab1.a - lab2.a;
  const deltaB = lab1.b - lab2.b;

  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
};

// Enhanced Delta E CIEDE2000 calculation (high precision)
export const deltaECIEDE2000 = (lab1: LABColor, lab2: LABColor): number => {
  // Constants for CIEDE2000
  const kL = 1.0;
  const kC = 1.0;
  const kH = 1.0;

  // Calculate Chroma and Hue
  const c1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
  const c2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
  const cAvg = (c1 + c2) / 2;

  // Calculate G factor
  const g = 0.5 * (1 - Math.sqrt(Math.pow(cAvg, 7) / (Math.pow(cAvg, 7) + Math.pow(25, 7))));

  // Calculate modified a* values
  const a1Prime = (1 + g) * lab1.a;
  const a2Prime = (1 + g) * lab2.a;

  // Calculate modified Chroma
  const c1Prime = Math.sqrt(a1Prime * a1Prime + lab1.b * lab1.b);
  const c2Prime = Math.sqrt(a2Prime * a2Prime + lab2.b * lab2.b);
  const cPrimeAvg = (c1Prime + c2Prime) / 2;

  // Calculate modified Hue
  const h1Prime = Math.atan2(lab1.b, a1Prime) * 180 / Math.PI;
  const h2Prime = Math.atan2(lab2.b, a2Prime) * 180 / Math.PI;

  let deltaHPrime = h2Prime - h1Prime;
  if (Math.abs(deltaHPrime) > 180) {
    deltaHPrime = deltaHPrime > 180 ? deltaHPrime - 360 : deltaHPrime + 360;
  }

  const deltahPrime = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin((deltaHPrime * Math.PI / 180) / 2);

  // Calculate averages
  const lAvg = (lab1.l + lab2.l) / 2;
  let hPrimeAvg = (h1Prime + h2Prime) / 2;
  if (Math.abs(h1Prime - h2Prime) > 180) {
    hPrimeAvg = hPrimeAvg < 180 ? hPrimeAvg + 180 : hPrimeAvg - 180;
  }

  // Calculate T
  const t = 1 - 0.17 * Math.cos((hPrimeAvg - 30) * Math.PI / 180) +
            0.24 * Math.cos((2 * hPrimeAvg) * Math.PI / 180) +
            0.32 * Math.cos((3 * hPrimeAvg + 6) * Math.PI / 180) -
            0.20 * Math.cos((4 * hPrimeAvg - 63) * Math.PI / 180);

  // Calculate weighting functions
  const deltaL = lab2.l - lab1.l;
  const deltaC = c2Prime - c1Prime;
  const deltaH = deltahPrime;

  const sl = 1 + ((0.015 * Math.pow(lAvg - 50, 2)) / Math.sqrt(20 + Math.pow(lAvg - 50, 2)));
  const sc = 1 + 0.045 * cPrimeAvg;
  const sh = 1 + 0.015 * cPrimeAvg * t;

  // Calculate rotation term
  const deltaTheta = 30 * Math.exp(-Math.pow((hPrimeAvg - 275) / 25, 2));
  const rc = 2 * Math.sqrt(Math.pow(cPrimeAvg, 7) / (Math.pow(cPrimeAvg, 7) + Math.pow(25, 7)));
  const rt = -rc * Math.sin(2 * deltaTheta * Math.PI / 180);

  // Calculate final Delta E
  const term1 = deltaL / (kL * sl);
  const term2 = deltaC / (kC * sc);
  const term3 = deltaH / (kH * sh);
  const term4 = rt * (deltaC / (kC * sc)) * (deltaH / (kH * sh));

  return Math.sqrt(term1 * term1 + term2 * term2 + term3 * term3 + term4);
};

// Enhanced color interpolation for mixing calculations
export const interpolateLAB = (lab1: LABColor, lab2: LABColor, ratio: number): LABColor => {
  // Clamp ratio to 0-1 range
  const t = Math.max(0, Math.min(1, ratio));

  return {
    l: lab1.l + (lab2.l - lab1.l) * t,
    a: lab1.a + (lab2.a - lab1.a) * t,
    b: lab1.b + (lab2.b - lab1.b) * t
  };
};

// Enhanced weighted color mixing for asymmetric ratios
export const mixLABColors = (colors: LABColor[], weights: number[]): LABColor => {
  if (colors.length !== weights.length || colors.length === 0) {
    throw new Error('Colors and weights arrays must have the same non-zero length');
  }

  // Normalize weights
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) {
    throw new Error('Total weight cannot be zero');
  }

  const normalizedWeights = weights.map(w => w / totalWeight);

  // Calculate weighted average
  let l = 0, a = 0, b = 0;
  for (let i = 0; i < colors.length; i++) {
    l += colors[i].l * normalizedWeights[i];
    a += colors[i].a * normalizedWeights[i];
    b += colors[i].b * normalizedWeights[i];
  }

  return { l, a, b };
};

// Enhanced color distance calculation for optimization
export const colorDistance = (lab1: LABColor, lab2: LABColor, method: 'CIE76' | 'CIEDE2000' = 'CIEDE2000'): number => {
  return method === 'CIE76' ? deltaECIE76(lab1, lab2) : deltaECIEDE2000(lab1, lab2);
};

// Color gamut validation for paint mixing
export const isColorInPaintGamut = (lab: LABColor): boolean => {
  // Basic gamut check for typical paint colors
  // This can be enhanced with specific paint manufacturer gamut data
  const maxChroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  const maxAllowedChroma = lab.l * 1.5; // Simplified gamut approximation

  return maxChroma <= maxAllowedChroma && lab.l >= 5 && lab.l <= 95;
};

// Enhanced precision color comparison
export const colorsAreEqual = (lab1: LABColor, lab2: LABColor, tolerance: number = LAB_CONSTANTS.PRECISION_TOLERANCE): boolean => {
  return Math.abs(lab1.l - lab2.l) <= tolerance &&
         Math.abs(lab1.a - lab2.a) <= tolerance &&
         Math.abs(lab1.b - lab2.b) <= tolerance;
};

// Color accuracy classification
export const classifyColorAccuracy = (deltaE: number): string => {
  if (deltaE <= LAB_CONSTANTS.DELTA_E_EXCELLENT) return 'Excellent';
  if (deltaE <= LAB_CONSTANTS.DELTA_E_GOOD) return 'Good';
  if (deltaE <= LAB_CONSTANTS.DELTA_E_ACCEPTABLE) return 'Acceptable';
  if (deltaE <= LAB_CONSTANTS.DELTA_E_POOR) return 'Poor';
  return 'Unacceptable';
};

// Enhanced color temperature calculation
export const calculateColorTemperature = (lab: LABColor): number => {
  // Convert to XYZ then to chromaticity coordinates
  const xyz = labToXYZ(lab);
  const x = xyz.x / (xyz.x + xyz.y + xyz.z);
  const y = xyz.y / (xyz.x + xyz.y + xyz.z);

  // McCamy's approximation for correlated color temperature
  const n = (x - 0.3320) / (0.1858 - y);
  const cct = 449 * Math.pow(n, 3) + 3525 * Math.pow(n, 2) + 6823.3 * n + 5520.33;

  return Math.max(1000, Math.min(25000, cct)); // Clamp to reasonable range
};

// Enhanced hex color conversion
export const labToHex = (lab: LABColor): string => {
  const rgb = labToRGB(lab);
  const r = rgb.r.toString(16).padStart(2, '0');
  const g = rgb.g.toString(16).padStart(2, '0');
  const b = rgb.b.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toLowerCase();
};

// Enhanced hex to LAB conversion
export const hexToLAB = (hex: string): LABColor => {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  if (cleanHex.length !== 6) {
    throw new Error('Invalid hex color format');
  }

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return rgbToLAB({ r, g, b });
};

// Color harmony calculations for palette generation
export const generateComplementaryColor = (lab: LABColor): LABColor => {
  // Calculate complementary in LAB space
  return {
    l: lab.l,
    a: -lab.a,
    b: -lab.b
  };
};

// Enhanced triadic color generation
export const generateTriadicColors = (lab: LABColor): [LABColor, LABColor] => {
  const hue = Math.atan2(lab.b, lab.a);
  const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);

  const hue1 = hue + (2 * Math.PI / 3);
  const hue2 = hue - (2 * Math.PI / 3);

  return [
    {
      l: lab.l,
      a: chroma * Math.cos(hue1),
      b: chroma * Math.sin(hue1)
    },
    {
      l: lab.l,
      a: chroma * Math.cos(hue2),
      b: chroma * Math.sin(hue2)
    }
  ];
};