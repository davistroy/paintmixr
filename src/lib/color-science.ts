/**
 * Color science utilities for paint mixing
 * Implements LAB color space conversions and Delta E CIE 2000 calculations
 */

export interface RGBColor {
  r: number // 0-255
  g: number // 0-255
  b: number // 0-255
}

export interface LABColor {
  l: number // 0-100 (lightness)
  a: number // -128 to 127 (green-red axis)
  b: number // -128 to 127 (blue-yellow axis)
}

export interface XYZColor {
  x: number
  y: number
  z: number
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGBColor {
  const sanitized = hex.replace('#', '')
  if (sanitized.length !== 6) {
    throw new Error('Invalid hex color format')
  }

  const r = parseInt(sanitized.substr(0, 2), 16)
  const g = parseInt(sanitized.substr(2, 2), 16)
  const b = parseInt(sanitized.substr(4, 2), 16)

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    throw new Error('Invalid hex color format')
  }

  return { r, g, b }
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(rgb: RGBColor): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase()
}

/**
 * Convert RGB to XYZ color space (D65 illuminant)
 */
export function rgbToXyz(rgb: RGBColor): XYZColor {
  // Normalize RGB to 0-1
  let r = rgb.r / 255
  let g = rgb.g / 255
  let b = rgb.b / 255

  // Apply gamma correction (sRGB)
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92

  // Convert to XYZ using sRGB matrix (D65)
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
  const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041

  return {
    x: x * 100, // Scale to 0-100
    y: y * 100,
    z: z * 100
  }
}

/**
 * Convert XYZ to LAB color space (D65 illuminant)
 */
export function xyzToLab(xyz: XYZColor): LABColor {
  // D65 reference white point
  const xn = 95.047
  const yn = 100.000
  const zn = 108.883

  // Normalize by reference white
  const x = xyz.x / xn
  const y = xyz.y / yn
  const z = xyz.z / zn

  // Apply LAB transformation
  const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116)
  const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116)
  const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116)

  const l = 116 * fy - 16
  const a = 500 * (fx - fy)
  const b = 200 * (fy - fz)

  return { l, a, b }
}

/**
 * Convert LAB to XYZ color space
 */
export function labToXyz(lab: LABColor): XYZColor {
  // D65 reference white point
  const xn = 95.047
  const yn = 100.000
  const zn = 108.883

  const fy = (lab.l + 16) / 116
  const fx = lab.a / 500 + fy
  const fz = fy - lab.b / 200

  const x = fx > 0.206893 ? Math.pow(fx, 3) : (fx - 16/116) / 7.787
  const y = fy > 0.206893 ? Math.pow(fy, 3) : (fy - 16/116) / 7.787
  const z = fz > 0.206893 ? Math.pow(fz, 3) : (fz - 16/116) / 7.787

  return {
    x: x * xn,
    y: y * yn,
    z: z * zn
  }
}

/**
 * Convert XYZ to RGB
 */
export function xyzToRgb(xyz: XYZColor): RGBColor {
  // Normalize XYZ
  const x = xyz.x / 100
  const y = xyz.y / 100
  const z = xyz.z / 100

  // Convert using sRGB matrix (D65)
  let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314
  let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560
  let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252

  // Apply inverse gamma correction
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1/2.4) - 0.055 : 12.92 * r
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1/2.4) - 0.055 : 12.92 * g
  b = b > 0.0031308 ? 1.055 * Math.pow(b, 1/2.4) - 0.055 : 12.92 * b

  return {
    r: Math.round(Math.max(0, Math.min(255, r * 255))),
    g: Math.round(Math.max(0, Math.min(255, g * 255))),
    b: Math.round(Math.max(0, Math.min(255, b * 255)))
  }
}

/**
 * Convert RGB to LAB (convenience function)
 */
export function rgbToLab(rgb: RGBColor): LABColor {
  return xyzToLab(rgbToXyz(rgb))
}

/**
 * Convert LAB to RGB (convenience function)
 */
export function labToRgb(lab: LABColor): RGBColor {
  return xyzToRgb(labToXyz(lab))
}

/**
 * Convert hex to LAB (convenience function)
 */
export function hexToLab(hex: string): LABColor {
  return rgbToLab(hexToRgb(hex))
}

/**
 * Convert LAB to hex (convenience function)
 */
export function labToHex(lab: LABColor): string {
  return rgbToHex(labToRgb(lab))
}

/**
 * Calculate Delta E CIE 2000 color difference
 * This is the most accurate perceptual color difference formula
 */
export function deltaE2000(lab1: LABColor, lab2: LABColor): number {
  const { l: L1, a: a1, b: b1 } = lab1
  const { l: L2, a: a2, b: b2 } = lab2

  // Calculate Chroma and Hue
  const C1 = Math.sqrt(a1 * a1 + b1 * b1)
  const C2 = Math.sqrt(a2 * a2 + b2 * b2)
  const Cab = (C1 + C2) / 2

  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cab, 7) / (Math.pow(Cab, 7) + Math.pow(25, 7))))

  const ap1 = (1 + G) * a1
  const ap2 = (1 + G) * a2

  const Cp1 = Math.sqrt(ap1 * ap1 + b1 * b1)
  const Cp2 = Math.sqrt(ap2 * ap2 + b2 * b2)

  const hp1 = Math.abs(ap1) + Math.abs(b1) === 0 ? 0 : Math.atan2(b1, ap1) * 180 / Math.PI
  const hp2 = Math.abs(ap2) + Math.abs(b2) === 0 ? 0 : Math.atan2(b2, ap2) * 180 / Math.PI

  const dL = L2 - L1
  const dC = Cp2 - Cp1

  let dhp = 0
  if (Cp1 * Cp2 !== 0) {
    dhp = hp2 - hp1
    if (dhp > 180) dhp -= 360
    if (dhp < -180) dhp += 360
  }

  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(dhp * Math.PI / 360)

  const Lp = (L1 + L2) / 2
  const Cp = (Cp1 + Cp2) / 2

  let Hp = (hp1 + hp2) / 2
  if (Math.abs(hp1 - hp2) > 180) {
    Hp += 180
    if (Hp > 360) Hp -= 360
  }

  const T = 1 - 0.17 * Math.cos((Hp - 30) * Math.PI / 180) +
              0.24 * Math.cos(2 * Hp * Math.PI / 180) +
              0.32 * Math.cos((3 * Hp + 6) * Math.PI / 180) -
              0.20 * Math.cos((4 * Hp - 63) * Math.PI / 180)

  const dTheta = 30 * Math.exp(-Math.pow((Hp - 275) / 25, 2))
  const RC = 2 * Math.sqrt(Math.pow(Cp, 7) / (Math.pow(Cp, 7) + Math.pow(25, 7)))
  const SL = 1 + (0.015 * Math.pow(Lp - 50, 2)) / Math.sqrt(20 + Math.pow(Lp - 50, 2))
  const SC = 1 + 0.045 * Cp
  const SH = 1 + 0.015 * Cp * T
  const RT = -Math.sin(2 * dTheta * Math.PI / 180) * RC

  // Weighting factors (default values)
  const kL = 1
  const kC = 1
  const kH = 1

  const deltaE = Math.sqrt(
    Math.pow(dL / (kL * SL), 2) +
    Math.pow(dC / (kC * SC), 2) +
    Math.pow(dH / (kH * SH), 2) +
    RT * (dC / (kC * SC)) * (dH / (kH * SH))
  )

  return deltaE
}

/**
 * Determine if two colors are perceptually similar
 */
export function areColorsSimilar(lab1: LABColor, lab2: LABColor, threshold: number = 2.3): boolean {
  return deltaE2000(lab1, lab2) <= threshold
}

/**
 * Get color temperature description based on LAB values
 */
export function getColorTemperature(lab: LABColor): 'warm' | 'neutral' | 'cool' {
  // Primarily based on the b* component (blue-yellow axis)
  if (lab.b > 10) return 'warm'    // Yellow bias
  if (lab.b < -10) return 'cool'   // Blue bias
  return 'neutral'
}

/**
 * Calculate color brightness (perceptual)
 */
export function getColorBrightness(lab: LABColor): 'dark' | 'medium' | 'light' {
  if (lab.l < 30) return 'dark'
  if (lab.l > 70) return 'light'
  return 'medium'
}

/**
 * Calculate color saturation from LAB
 */
export function getColorSaturation(lab: LABColor): number {
  return Math.sqrt(lab.a * lab.a + lab.b * lab.b)
}

/**
 * Validate LAB color values
 */
export function isValidLab(lab: LABColor): boolean {
  return (
    lab.l >= 0 && lab.l <= 100 &&
    lab.a >= -128 && lab.a <= 127 &&
    lab.b >= -128 && lab.b <= 127 &&
    !isNaN(lab.l) && !isNaN(lab.a) && !isNaN(lab.b)
  )
}

/**
 * Validate RGB color values
 */
export function isValidRgb(rgb: RGBColor): boolean {
  return (
    rgb.r >= 0 && rgb.r <= 255 &&
    rgb.g >= 0 && rgb.g <= 255 &&
    rgb.b >= 0 && rgb.b <= 255 &&
    Number.isInteger(rgb.r) && Number.isInteger(rgb.g) && Number.isInteger(rgb.b)
  )
}

/**
 * Validate hex color format
 */
export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex)
}