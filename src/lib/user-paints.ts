import { PaintProperties } from './kubelka-munk'
import { hexToLab } from './color-science'
import userPaintsData from '../../user_info/paint_colors.json'

interface UserPaint {
  hex: string
  name: string
  code: string
  spray: string
  note?: string
}

/**
 * Convert user paint data to Kubelka-Munk paint properties
 * This function estimates K/S coefficients and other properties based on the paint color
 */
function convertUserPaintToKubelkaMunk(userPaint: UserPaint, _index: number): PaintProperties {
  const lab = hexToLab(userPaint.hex)

  // Create a safe paint ID from the name and code
  const paintId = `${userPaint.code}-${userPaint.name}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  // Estimate K/S coefficients based on lightness and color properties
  // Darker colors typically have higher K (absorption) coefficients
  // Lighter colors typically have higher S (scattering) coefficients
  const lightness = lab.l / 100

  // Base K coefficient: darker colors absorb more light
  const k_coefficient = Math.max(0.02, 1.0 - lightness * 0.8)

  // Base S coefficient: lighter colors scatter more light
  const s_coefficient = Math.max(0.08, lightness * 0.9)

  // Estimate opacity based on lightness (darker colors tend to be more opaque)
  const opacity = Math.max(0.45, 0.95 - lightness * 0.3)

  // Estimate tinting strength based on chroma (color intensity)
  const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b)
  const tinting_strength = Math.max(0.3, Math.min(0.95, (chroma / 100) + 0.5))

  // Transparency index (inverse relationship with opacity)
  const transparency_index = Math.max(0.02, (1 - opacity) * 10)

  return {
    id: paintId,
    name: userPaint.name,
    k_coefficient,
    s_coefficient,
    opacity,
    tinting_strength,
    lab_values: lab,
    mass_tone_lab: lab,
    // For undertone, use a lighter version of the same color
    undertone_lab: {
      l: Math.min(100, lab.l + 20),
      a: lab.a * 0.5,
      b: lab.b * 0.5,
    },
    transparency_index,
    // Add user-specific properties
    code: userPaint.code,
    spray_code: userPaint.spray,
    hex: userPaint.hex,
    ...(userPaint.note && { note: userPaint.note })
  } as any
}

/**
 * Get all user paints converted to Kubelka-Munk format
 */
export function getUserPaints(): PaintProperties[] {
  return (userPaintsData as UserPaint[]).map((paint, index) =>
    convertUserPaintToKubelkaMunk(paint, index)
  )
}

/**
 * Get a user paint by ID
 */
export function getUserPaintById(id: string): PaintProperties | undefined {
  const userPaints = getUserPaints()
  return userPaints.find(paint => paint.id === id)
}

/**
 * Get user paint options for UI dropdowns
 */
export function getUserPaintOptions(): Array<{ value: string; label: string; hex: string }> {
  return getUserPaints().map(paint => ({
    value: paint.id,
    label: `${paint.name} (${(paint as any).code})`,
    hex: (paint as any).hex || paint.lab_values ?
      (paint as any).hex || ('#' + Math.floor(Math.random()*16777215).toString(16)) :
      '#000000'
  }))
}