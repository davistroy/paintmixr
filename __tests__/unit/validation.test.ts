/**
 * Auth Validation Schema Unit Tests
 * Feature: 005-use-codebase-analysis
 * Task: T068
 *
 * Tests for Zod validation schemas ensuring email normalization,
 * password requirements, and error message accuracy.
 *
 * Coverage: src/lib/auth/validation.ts
 */

import { describe, it, expect } from '@jest/globals'
import { emailSigninSchema, type EmailSigninInput } from '@/lib/auth/validation'

describe('Email Signin Validation Schema', () => {
  describe('Valid Input Cases', () => {
    it('should accept valid email and password', () => {
      const input = {
        email: 'test@example.com',
        password: 'ValidPassword123'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
        expect(result.data.password).toBe('ValidPassword123')
      }
    })

    it('should accept minimal valid input', () => {
      const input = {
        email: 'a@b.co',
        password: 'x'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it('should accept password with special characters', () => {
      const input = {
        email: 'user@domain.com',
        password: 'P@$$w0rd!#$%^&*()'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it('should accept password with spaces', () => {
      const input = {
        email: 'user@domain.com',
        password: 'password with spaces'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it('should accept very long password (no max limit)', () => {
      const input = {
        email: 'user@domain.com',
        password: 'a'.repeat(1000) // 1000 character password
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it('should accept email with subdomain', () => {
      const input = {
        email: 'user@mail.company.co.uk',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@mail.company.co.uk')
      }
    })

    it('should accept email with plus addressing', () => {
      const input = {
        email: 'user+tag@example.com',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it('should accept email with dots in local part', () => {
      const input = {
        email: 'first.last@example.com',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it('should accept email with numbers', () => {
      const input = {
        email: 'user123@domain456.com',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
    })
  })

  describe('Email Normalization', () => {
    it('should transform email to lowercase', () => {
      const input = {
        email: 'Test@Example.COM',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
      }
    })

    it('should trim whitespace from email', () => {
      const input = {
        email: '  user@example.com  ',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        // Verify email is trimmed (may happen before or after validation)
        const email = result.data.email
        expect(email.startsWith(' ')).toBe(false)
        expect(email.endsWith(' ')).toBe(false)
        // Email should be lowercase and trimmed
        expect(email).toContain('@')
        expect(email).toContain('example.com')
      }
    })

    it('should trim and lowercase email', () => {
      const input = {
        email: '  User@EXAMPLE.com  ',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        const email = result.data.email
        // Should be both trimmed and lowercased
        expect(email.startsWith(' ')).toBe(false)
        expect(email.endsWith(' ')).toBe(false)
        expect(email.toLowerCase()).toBe(email) // Is lowercase
        expect(email).toContain('@')
      }
    })

    it('should handle mixed case and whitespace', () => {
      const input = {
        email: '\t\nTEST@example.COM\t\n',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        const email = result.data.email
        // Should trim all whitespace including tabs and newlines, and lowercase
        expect(email.includes('\t')).toBe(false)
        expect(email.includes('\n')).toBe(false)
        expect(email.toLowerCase()).toBe(email) // Is lowercase
        expect(email).toContain('@')
        expect(email).toContain('example.com')
      }
    })

    it('should not modify password casing', () => {
      const input = {
        email: 'user@example.com',
        password: 'PaSsWoRd123'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.password).toBe('PaSsWoRd123') // Unchanged
      }
    })

    it('should not trim password whitespace', () => {
      const input = {
        email: 'user@example.com',
        password: '  password  '
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.password).toBe('  password  ') // Unchanged
      }
    })
  })

  describe('Invalid Email Cases', () => {
    it('should reject missing email', () => {
      const input = {
        password: 'password'
      } as any

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.path.includes('email')
        )).toBe(true)
      }
    })

    it('should reject empty email', () => {
      const input = {
        email: '',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.message === 'Email is required'
        )).toBe(true)
      }
    })

    it('should reject email without @ symbol', () => {
      const input = {
        email: 'notanemail.com',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.message === 'Invalid email format'
        )).toBe(true)
      }
    })

    it('should reject email without domain', () => {
      const input = {
        email: 'user@',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it('should reject email without local part', () => {
      const input = {
        email: '@example.com',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it('should reject email with only @', () => {
      const input = {
        email: '@',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it('should reject email without TLD', () => {
      const input = {
        email: 'user@domain',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it('should reject email with spaces in middle', () => {
      const input = {
        email: 'user name@example.com',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it('should reject email with multiple @ symbols', () => {
      const input = {
        email: 'user@@example.com',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it('should reject email exceeding 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com' // 262 chars total
      const input = {
        email: longEmail,
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.message === 'Email too long'
        )).toBe(true)
      }
    })

    it('should reject null email', () => {
      const input = {
        email: null,
        password: 'password'
      } as any

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it('should reject numeric email', () => {
      const input = {
        email: 12345,
        password: 'password'
      } as any

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
    })
  })

  describe('Invalid Password Cases', () => {
    it('should reject missing password', () => {
      const input = {
        email: 'user@example.com'
      } as any

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.path.includes('password')
        )).toBe(true)
      }
    })

    it('should reject empty password', () => {
      const input = {
        email: 'user@example.com',
        password: ''
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.message === 'Password is required'
        )).toBe(true)
      }
    })

    it('should reject null password', () => {
      const input = {
        email: 'user@example.com',
        password: null
      } as any

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it('should reject numeric password', () => {
      const input = {
        email: 'user@example.com',
        password: 12345
      } as any

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it('should reject boolean password', () => {
      const input = {
        email: 'user@example.com',
        password: true
      } as any

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(false)
    })
  })

  describe('Type Inference', () => {
    it('should infer correct TypeScript type', () => {
      const validData: EmailSigninInput = {
        email: 'test@example.com',
        password: 'password123'
      }

      // Type check - should compile without errors
      expect(validData.email).toBe('test@example.com')
      expect(validData.password).toBe('password123')
    })

    it('should enforce email as string in type', () => {
      // This test verifies type safety at compile time
      const data = emailSigninSchema.parse({
        email: 'test@example.com',
        password: 'password'
      })

      // Runtime verification
      expect(typeof data.email).toBe('string')
      expect(typeof data.password).toBe('string')
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined input', () => {
      const result = emailSigninSchema.safeParse(undefined)

      expect(result.success).toBe(false)
    })

    it('should handle null input', () => {
      const result = emailSigninSchema.safeParse(null)

      expect(result.success).toBe(false)
    })

    it('should handle empty object', () => {
      const result = emailSigninSchema.safeParse({})

      expect(result.success).toBe(false)
    })

    it('should handle extra fields (should be stripped)', () => {
      const input = {
        email: 'user@example.com',
        password: 'password',
        extraField: 'should be ignored'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        // Zod strips extra fields by default
        expect('extraField' in result.data).toBe(false)
      }
    })

    it('should handle array input', () => {
      const result = emailSigninSchema.safeParse([])

      expect(result.success).toBe(false)
    })

    it('should handle string input', () => {
      const result = emailSigninSchema.safeParse('invalid')

      expect(result.success).toBe(false)
    })
  })

  describe('Security Considerations', () => {
    it('should accept password with SQL injection attempt', () => {
      // Schema should not reject SQL injection strings - sanitization happens elsewhere
      const input = {
        email: 'user@example.com',
        password: "'; DROP TABLE users; --"
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it('should accept password with script tags', () => {
      // Schema should not reject XSS strings - sanitization happens elsewhere
      const input = {
        email: 'user@example.com',
        password: '<script>alert("xss")</script>'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it('should accept password with unicode characters', () => {
      const input = {
        email: 'user@example.com',
        password: '密码🔐パスワード'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it('should prevent email enumeration by accepting non-existent emails', () => {
      // Schema should validate format only, not existence
      const input = {
        email: 'nonexistent@example.com',
        password: 'password'
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
    })
  })

  describe('Specification Compliance', () => {
    it('should enforce no maximum password length', () => {
      // Per specification: no max length requirement
      const veryLongPassword = 'a'.repeat(10000)
      const input = {
        email: 'user@example.com',
        password: veryLongPassword
      }

      const result = emailSigninSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.password.length).toBe(10000)
      }
    })

    it('should enforce no password complexity requirements', () => {
      // Per specification: no complexity requirements
      const simplePasswords = [
        'password',
        '12345678',
        'aaaaaaaa',
        'a',
        '   ',
        '!!!!!!!'
      ]

      for (const password of simplePasswords) {
        const result = emailSigninSchema.safeParse({
          email: 'user@example.com',
          password
        })

        expect(result.success).toBe(true)
      }
    })

    it('should enforce email format validation', () => {
      // Per specification: must validate email format
      const invalidEmails = [
        'not-an-email',
        'missing@domain',
        '@missing-local.com',
        'spaces in@email.com',
        'double@@at.com'
      ]

      for (const email of invalidEmails) {
        const result = emailSigninSchema.safeParse({
          email,
          password: 'password'
        })

        expect(result.success).toBe(false)
      }
    })

    it('should enforce email normalization to lowercase', () => {
      // Per specification: emails must be normalized to prevent duplicates
      const variations = [
        'User@Example.COM',
        'USER@EXAMPLE.COM',
        'uSeR@eXaMpLe.CoM'
      ]

      for (const email of variations) {
        const result = emailSigninSchema.safeParse({
          email,
          password: 'password'
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.email).toBe('user@example.com')
        }
      }
    })
  })
})
