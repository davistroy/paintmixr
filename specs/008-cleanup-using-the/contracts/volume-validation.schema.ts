import { z } from 'zod'

/**
 * Volume Validation Schema
 *
 * Validates paint volume inputs for Ratio Prediction mode.
 * Requirements: FR-012d, FR-012e, FR-012f
 */

// Single paint volume validation (5ml - 1000ml inclusive)
export const paintVolumeSchema = z.number()
  .min(5, "Paint volume must be between 5ml and 1000ml")
  .max(1000, "Paint volume must be between 5ml and 1000ml")

// Paint selection with volume
export const paintSelectionSchema = z.object({
  paintId: z.string().uuid("Invalid paint ID"),
  volume: paintVolumeSchema
})

// Full ratio prediction form validation
export const ratioPredictionSchema = z.object({
  paints: z.array(paintSelectionSchema)
    .min(2, "Ratio Prediction requires at least 2 paints")  // FR-012a
    .max(5, "Ratio Prediction allows maximum 5 paints")     // FR-012b
})

// Type exports for TypeScript
export type PaintSelection = z.infer<typeof paintSelectionSchema>
export type RatioPredictionForm = z.infer<typeof ratioPredictionSchema>
