/**
 * Shared Form Validation Schemas
 * Contract: refactoring-contracts.md - Contract 2
 * Feature: 005-use-codebase-analysis
 */

import { z } from 'zod'

/**
 * Email validation schema (normalized)
 */
export const emailSchema = z.string()
  .transform(val => val.toLowerCase().trim())
  .pipe(z.string().email('Invalid email format'))

/**
 * Password validation schema
 */
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

/**
 * Sign-in form schema
 */
export const signinSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

/**
 * Volume constraints schema (UI form)
 */
export const volumeConstraintsSchema = z.object({
  minVolume: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid number'),
  maxVolume: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid number'),
  targetVolume: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid number').optional(),
  displayUnit: z.enum(['ml', 'oz', 'gal'])
}).refine(
  data => parseFloat(data.minVolume) < parseFloat(data.maxVolume),
  { message: 'Min volume must be less than max volume', path: ['minVolume'] }
)

/**
 * Paint volume validation (5-1000ml)
 * FR-012d: Minimum 5ml
 * FR-012e: Maximum 1000ml
 */
export const paintVolumeSchema = z.number()
  .min(5, "Paint volume must be between 5ml and 1000ml")
  .max(1000, "Paint volume must be between 5ml and 1000ml")

/**
 * Paint selection with volume validation
 * T025: UUID validation for paint IDs
 */
export const paintSelectionSchema = z.object({
  paintId: z.string().uuid("Invalid paint ID"),
  volume: paintVolumeSchema
})

/**
 * Ratio Prediction form validation
 * FR-012f: 2-5 paints allowed
 */
export const ratioPredictionSchema = z.object({
  paints: z.array(paintSelectionSchema)
    .min(2, "Ratio Prediction requires at least 2 paints")
    .max(5, "Ratio Prediction allows maximum 5 paints"),
  mode: z.enum(['Standard', 'Enhanced'])
})

/**
 * Session save validation
 */
export const sessionSaveSchema = z.object({
  name: z.string()
    .min(1, "Session name is required")
    .max(100, "Session name must be 100 characters or less"),
  notes: z.string()
    .max(1000, "Notes must be 1000 characters or less")
    .optional(),
  imageUrl: z.string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal(''))
})

/**
 * Hex color validation
 */
export const hexColorSchema = z.string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Please enter a valid hex color (e.g., #FF5733)")

// T025: Type exports for TypeScript
export type PaintSelection = z.infer<typeof paintSelectionSchema>
export type RatioPredictionForm = z.infer<typeof ratioPredictionSchema>
