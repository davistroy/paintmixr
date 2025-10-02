/**
 * Auth Validation Schemas
 * Feature: 004-add-email-add
 * Task: T002
 *
 * Zod schemas for email/password validation
 */

import { z } from 'zod'

/**
 * Email/password signin validation schema
 *
 * Validates:
 * - Email: required, valid format, max 255 chars, normalized to lowercase
 * - Password: required, min 1 char (no max or complexity per requirements)
 */
export const emailSigninSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email too long')
    .transform(val => val.toLowerCase().trim()),

  password: z
    .string()
    .min(1, 'Password is required')
  // No max length or complexity requirements per specification
})

/**
 * Infer TypeScript type from schema
 */
export type EmailSigninInput = z.infer<typeof emailSigninSchema>
