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
