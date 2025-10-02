import { describe, it, expect } from '@jest/globals'
import { emailSigninSchema, type EmailSigninInput } from '@/lib/auth/validation'
import { z } from 'zod'

/**
 * Unit tests for email validation schema
 * Feature: 004-add-email-add
 * Task: T003
 *
 * Tests Zod schema for email/password validation including:
 * - Valid email formats
 * - Invalid email formats
 * - Email length constraints
 * - Email normalization (lowercase/trim)
 * - Required field validation
 */

describe('emailSigninSchema', () => {
  describe('Valid Email Validation', () => {
    it('should accept valid email with password', () => {
      const validInput = {
        email: 'user@example.com',
        password: 'password123'
      }

      const result = emailSigninSchema.safeParse(validInput)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@example.com')
        expect(result.data.password).toBe('password123')
      }
    })

    it('should accept email with subdomain', () => {
      const validInput = {
        email: 'test@mail.example.com',
        password: 'test'
      }

      const result = emailSigninSchema.safeParse(validInput)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@mail.example.com')
      }
    })

    it('should accept email with plus addressing', () => {
      const validInput = {
        email: 'user+tag@example.com',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(validInput)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user+tag@example.com')
      }
    })

    it('should accept email with numbers and dots', () => {
      const validInput = {
        email: 'user.name123@example.co.uk',
        password: 'pass'
      }

      const result = emailSigninSchema.safeParse(validInput)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user.name123@example.co.uk')
      }
    })
  })

  describe('Invalid Email Format Validation', () => {
    it('should reject email without @ symbol', () => {
      const invalidInput = {
        email: 'userexample.com',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(invalidInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format')
      }
    })

    it('should reject email without domain', () => {
      const invalidInput = {
        email: 'user@',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(invalidInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format')
      }
    })

    it('should reject email without local part', () => {
      const invalidInput = {
        email: '@example.com',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(invalidInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format')
      }
    })

    it('should reject email with spaces', () => {
      const invalidInput = {
        email: 'user name@example.com',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(invalidInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format')
      }
    })

    it('should reject email with multiple @ symbols', () => {
      const invalidInput = {
        email: 'user@@example.com',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(invalidInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format')
      }
    })

    it('should reject plain string as email', () => {
      const invalidInput = {
        email: 'notanemail',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(invalidInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format')
      }
    })
  })

  describe('Email Length Constraints', () => {
    it('should reject email longer than 255 characters', () => {
      // Create email with 256 characters total
      const longLocalPart = 'a'.repeat(240)
      const invalidInput = {
        email: `${longLocalPart}@example.com`, // 240 + 1 + 11 = 252 chars
        password: 'password'
      }

      // Make it actually exceed 255
      const tooLongInput = {
        email: `${longLocalPart}aaaa@example.com`, // 256 chars
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(tooLongInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email too long')
      }
    })

    it('should accept email at 255 character limit', () => {
      // Create email with exactly 255 characters
      const localPart = 'a'.repeat(243)
      const validInput = {
        email: `${localPart}@example.com`, // 243 + 1 + 11 = 255 chars
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(validInput)

      expect(result.success).toBe(true)
    })

    it('should accept short email (minimum valid length)', () => {
      const validInput = {
        email: 'a@b.co', // Needs valid TLD
        password: 'p'
      }

      const result = emailSigninSchema.safeParse(validInput)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('a@b.co')
      }
    })
  })

  describe('Email Normalization', () => {
    it('should normalize uppercase email to lowercase', () => {
      const input = {
        email: 'USER@EXAMPLE.COM',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@example.com')
      }
    })

    it('should normalize mixed case email to lowercase', () => {
      const input = {
        email: 'UsEr@ExAmPlE.CoM',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@example.com')
      }
    })

    it('should reject email with leading whitespace (validation before transform)', () => {
      // Note: Zod validates email format BEFORE applying transform
      // So emails with leading/trailing whitespace fail validation
      const input = {
        email: '  user@example.com',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format')
      }
    })

    it('should reject email with trailing whitespace (validation before transform)', () => {
      const input = {
        email: 'user@example.com  ',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format')
      }
    })

    it('should reject email with both uppercase and whitespace (validation before transform)', () => {
      const input = {
        email: '  USER@EXAMPLE.COM  ',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format')
      }
    })
  })

  describe('Required Field Validation', () => {
    it('should reject missing email field', () => {
      const invalidInput = {
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(invalidInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        const emailError = result.error.issues.find(issue => issue.path[0] === 'email')
        // Zod returns "Required" for missing fields, not the custom min(1) message
        expect(emailError?.message).toBe('Required')
      }
    })

    it('should reject empty string email', () => {
      const invalidInput = {
        email: '',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(invalidInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required')
      }
    })

    it('should reject missing password field', () => {
      const invalidInput = {
        email: 'user@example.com'
      }

      const result = emailSigninSchema.safeParse(invalidInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        const passwordError = result.error.issues.find(issue => issue.path[0] === 'password')
        // Zod returns "Required" for missing fields, not the custom min(1) message
        expect(passwordError?.message).toBe('Required')
      }
    })

    it('should reject empty string password', () => {
      const invalidInput = {
        email: 'user@example.com',
        password: ''
      }

      const result = emailSigninSchema.safeParse(invalidInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required')
      }
    })

    it('should reject missing both email and password', () => {
      const invalidInput = {}

      const result = emailSigninSchema.safeParse(invalidInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2)
        const emailError = result.error.issues.find(issue => issue.path[0] === 'email')
        const passwordError = result.error.issues.find(issue => issue.path[0] === 'password')
        expect(emailError).toBeDefined()
        expect(passwordError).toBeDefined()
      }
    })

    it('should reject whitespace-only email after trimming', () => {
      const invalidInput = {
        email: '   ',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(invalidInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        // After trimming, empty string triggers "Email is required" or "Invalid email format"
        expect(result.error.issues[0].message).toMatch(/Email is required|Invalid email format/)
      }
    })
  })

  describe('Password Validation', () => {
    it('should accept password with minimum length (1 character)', () => {
      const validInput = {
        email: 'user@example.com',
        password: 'a'
      }

      const result = emailSigninSchema.safeParse(validInput)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.password).toBe('a')
      }
    })

    it('should accept long password (no max length constraint)', () => {
      const longPassword = 'a'.repeat(1000)
      const validInput = {
        email: 'user@example.com',
        password: longPassword
      }

      const result = emailSigninSchema.safeParse(validInput)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.password).toBe(longPassword)
      }
    })

    it('should accept password with special characters', () => {
      const validInput = {
        email: 'user@example.com',
        password: '!@#$%^&*()_+-=[]{}|;:,.<>?'
      }

      const result = emailSigninSchema.safeParse(validInput)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.password).toBe('!@#$%^&*()_+-=[]{}|;:,.<>?')
      }
    })

    it('should accept password with spaces', () => {
      const validInput = {
        email: 'user@example.com',
        password: 'my password with spaces'
      }

      const result = emailSigninSchema.safeParse(validInput)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.password).toBe('my password with spaces')
      }
    })

    it('should NOT transform password case (preserve as-is)', () => {
      const validInput = {
        email: 'USER@EXAMPLE.COM',
        password: 'PaSsWoRd123'
      }

      const result = emailSigninSchema.safeParse(validInput)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.password).toBe('PaSsWoRd123') // Password should NOT be transformed
        expect(result.data.email).toBe('user@example.com') // But email should be lowercase
      }
    })
  })

  describe('TypeScript Type Inference', () => {
    it('should infer correct TypeScript type from schema', () => {
      const validInput: EmailSigninInput = {
        email: 'user@example.com',
        password: 'password123'
      }

      const result = emailSigninSchema.parse(validInput)

      // Type assertion to verify inferred type structure
      const email: string = result.email
      const password: string = result.password

      expect(email).toBe('user@example.com')
      expect(password).toBe('password123')
    })
  })

  describe('Edge Cases', () => {
    it('should handle email with consecutive dots in local part (invalid)', () => {
      const invalidInput = {
        email: 'user..name@example.com',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(invalidInput)

      // Zod's email validator may or may not catch this - depends on implementation
      // This test documents current behavior
      expect(result.success).toBe(false)
    })

    it('should handle email starting with dot (invalid)', () => {
      const invalidInput = {
        email: '.user@example.com',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(invalidInput)

      expect(result.success).toBe(false)
    })

    it('should handle email ending with dot before @ (invalid)', () => {
      const invalidInput = {
        email: 'user.@example.com',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(invalidInput)

      expect(result.success).toBe(false)
    })

    it('should reject null email', () => {
      const invalidInput = {
        email: null,
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(invalidInput)

      expect(result.success).toBe(false)
    })

    it('should reject undefined email', () => {
      const invalidInput = {
        email: undefined,
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(invalidInput)

      expect(result.success).toBe(false)
    })

    it('should reject numeric email', () => {
      const invalidInput = {
        email: 12345,
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(invalidInput)

      expect(result.success).toBe(false)
    })
  })
})
