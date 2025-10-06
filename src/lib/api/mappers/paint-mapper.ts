/**
 * Paint Entity to DTO Mapper
 *
 * Transforms database entities to API DTOs.
 *
 * Feature: 010-using-refactor-recommendations
 * Task: T038
 * Requirement: FR-026
 */

import type { Paint } from '@/lib/types'
import type { PaintDTO } from '@/lib/api/dtos/paint.dto'

/**
 * Transform Paint entity to PaintDTO
 *
 * Removes internal database fields and standardizes naming.
 */
export function toPaintDTO(paint: Paint): PaintDTO {
  return {
    id: paint.id,
    name: paint.name,
    brand: paint.brand,
    color: {
      hex: paint.color.hex,
      lab: {
        l: paint.color.lab.l,
        a: paint.color.lab.a,
        b: paint.color.lab.b,
      },
    },
    opacity: paint.opacity,
    tintingStrength: paint.tintingStrength,
  }
}

/**
 * Transform array of Paint entities to PaintDTOs
 */
export function toPaintDTOs(paints: Paint[]): PaintDTO[] {
  return paints.map(toPaintDTO)
}
