/**
 * Session Entity to DTO Mapper
 *
 * Transforms database entities to API DTOs.
 *
 * Feature: 010-using-refactor-recommendations
 * Task: T038
 * Requirement: FR-026
 */

import type { MixingSessionDetail } from '@/lib/types'
import type { SessionDTO } from '@/lib/api/dtos/session.dto'

/**
 * Transform MixingSessionDetail entity to SessionDTO
 *
 * Converts snake_case to camelCase and removes internal fields.
 */
export function toSessionDTO(session: MixingSessionDetail & { user_id: string }): SessionDTO {
  // Default values for missing fields
  const targetColor = session.target_color || {
    hex: '#000000',
    lab: { l: 0, a: 0, b: 0 },
  }

  const achievedColor = session.calculated_color || targetColor

  const formula = session.formula || {
    total_volume_ml: 0,
    paint_ratios: [],
  }

  return {
    id: session.id,
    userId: session.user_id,
    targetColor: {
      hex: targetColor.hex,
      lab: {
        l: targetColor.lab.l,
        a: targetColor.lab.a,
        b: targetColor.lab.b,
      },
    },
    formula: {
      paints: formula.paint_ratios.map((paint) => ({
        paintId: paint.paint_id,
        paintName: paint.paint_name || '',
        paintBrand: '', // Not stored in MixingFormula
        ratio: paint.percentage / 100,
        volume: paint.volume_ml,
      })),
      totalVolume: formula.total_volume_ml,
      achievedColor: {
        hex: achievedColor.hex,
        lab: {
          l: achievedColor.lab.l,
          a: achievedColor.lab.a,
          b: achievedColor.lab.b,
        },
      },
    },
    deltaE: session.delta_e || 0,
    customLabel: session.custom_label,
    isFavorite: session.is_favorite,
    createdAt: session.created_at,
  }
}

/**
 * Transform array of MixingSessionDetail entities to SessionDTOs
 */
export function toSessionDTOs(sessions: Array<MixingSessionDetail & { user_id: string }>): SessionDTO[] {
  return sessions.map(toSessionDTO)
}
