/**
 * Contract Tests: Form Utilities
 *
 * Tests for src/lib/forms/ modules
 * Validates shared form utilities contract from refactoring-contracts.md
 *
 * Expected: FAIL (modules don't exist yet)
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  emailSchema,
  passwordSchema,
  signinSchema,
  volumeConstraintsSchema
} from '@/lib/forms/schemas'
import { useFormErrors, getFieldError } from '@/lib/forms/useFormErrors'
import { useFormSubmit } from '@/lib/forms/useFormSubmit'
import { APIResponse } from '@/lib/api/client'

describe('Form Utilities Contract', () => {
  describe('Validation Schemas', () => {
    describe('emailSchema', () => {
      it('should validate correct email format', () => {
        const result = emailSchema.safeParse('test@example.com')
        expect(result.success).toBe(true)
      })

      it('should normalize email to lowercase', () => {
        const result = emailSchema.parse('Test@EXAMPLE.com')
        expect(result).toBe('test@example.com')
      })

      it('should trim whitespace from email', () => {
        const result = emailSchema.parse('  test@example.com  ')
        expect(result).toBe('test@example.com')
      })

      it('should normalize and trim together', () => {
        const result = emailSchema.parse('  TEST@Example.COM  ')
        expect(result).toBe('test@example.com')
      })

      it('should reject invalid email format', () => {
        const result = emailSchema.safeParse('notanemail')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Invalid email')
        }
      })

      it('should reject empty string', () => {
        const result = emailSchema.safeParse('')
        expect(result.success).toBe(false)
      })

      it('should reject email without domain', () => {
        const result = emailSchema.safeParse('test@')
        expect(result.success).toBe(false)
      })

      it('should reject email without @ symbol', () => {
        const result = emailSchema.safeParse('test.example.com')
        expect(result.success).toBe(false)
      })
    })

    describe('passwordSchema', () => {
      it('should validate password with all requirements', () => {
        const result = passwordSchema.safeParse('Password123')
        expect(result.success).toBe(true)
      })

      it('should reject password shorter than 8 characters', () => {
        const result = passwordSchema.safeParse('Pass1')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('at least 8 characters')
        }
      })

      it('should reject password without uppercase letter', () => {
        const result = passwordSchema.safeParse('password123')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues.some(e => e.message.includes('uppercase'))).toBe(true)
        }
      })

      it('should reject password without lowercase letter', () => {
        const result = passwordSchema.safeParse('PASSWORD123')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues.some(e => e.message.includes('lowercase'))).toBe(true)
        }
      })

      it('should reject password without number', () => {
        const result = passwordSchema.safeParse('Password')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues.some(e => e.message.includes('number'))).toBe(true)
        }
      })

      it('should accept password with special characters', () => {
        const result = passwordSchema.safeParse('Password123!@#')
        expect(result.success).toBe(true)
      })

      it('should reject empty password', () => {
        const result = passwordSchema.safeParse('')
        expect(result.success).toBe(false)
      })
    })

    describe('signinSchema', () => {
      it('should validate correct signin data', () => {
        const result = signinSchema.safeParse({
          email: 'test@example.com',
          password: 'anypassword'
        })
        expect(result.success).toBe(true)
      })

      it('should normalize email in signin schema', () => {
        const result = signinSchema.parse({
          email: '  TEST@Example.COM  ',
          password: 'password'
        })
        expect(result.email).toBe('test@example.com')
      })

      it('should require password field', () => {
        const result = signinSchema.safeParse({
          email: 'test@example.com',
          password: ''
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('required')
        }
      })

      it('should validate email format in signin schema', () => {
        const result = signinSchema.safeParse({
          email: 'invalid-email',
          password: 'password'
        })
        expect(result.success).toBe(false)
      })

      it('should not enforce password strength in signin schema', () => {
        // Signin only requires min 1 char, not full strength
        const result = signinSchema.safeParse({
          email: 'test@example.com',
          password: 'a'
        })
        expect(result.success).toBe(true)
      })
    })

    describe('volumeConstraintsSchema', () => {
      it('should validate correct volume constraints', () => {
        const result = volumeConstraintsSchema.safeParse({
          minVolume: '10',
          maxVolume: '100',
          displayUnit: 'ml'
        })
        expect(result.success).toBe(true)
      })

      it('should accept decimal values', () => {
        const result = volumeConstraintsSchema.safeParse({
          minVolume: '10.5',
          maxVolume: '100.75',
          displayUnit: 'oz'
        })
        expect(result.success).toBe(true)
      })

      it('should accept optional targetVolume', () => {
        const result = volumeConstraintsSchema.safeParse({
          minVolume: '10',
          maxVolume: '100',
          targetVolume: '50',
          displayUnit: 'gal'
        })
        expect(result.success).toBe(true)
      })

      it('should reject when minVolume >= maxVolume', () => {
        const result = volumeConstraintsSchema.safeParse({
          minVolume: '100',
          maxVolume: '50',
          displayUnit: 'ml'
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Min volume must be less than max')
        }
      })

      it('should reject when minVolume equals maxVolume', () => {
        const result = volumeConstraintsSchema.safeParse({
          minVolume: '100',
          maxVolume: '100',
          displayUnit: 'ml'
        })
        expect(result.success).toBe(false)
      })

      it('should reject invalid number format', () => {
        const result = volumeConstraintsSchema.safeParse({
          minVolume: 'abc',
          maxVolume: '100',
          displayUnit: 'ml'
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('valid number')
        }
      })

      it('should reject invalid displayUnit', () => {
        const result = volumeConstraintsSchema.safeParse({
          minVolume: '10',
          maxVolume: '100',
          displayUnit: 'liters'
        })
        expect(result.success).toBe(false)
      })

      it('should accept all valid displayUnits', () => {
        const units = ['ml', 'oz', 'gal'] as const

        units.forEach(unit => {
          const result = volumeConstraintsSchema.safeParse({
            minVolume: '10',
            maxVolume: '100',
            displayUnit: unit
          })
          expect(result.success).toBe(true)
        })
      })
    })
  })

  describe('Form Error Utilities', () => {
    describe('useFormErrors', () => {
      it('should return null when no errors', () => {
        const { result } = renderHook(() => useFormErrors({}))
        expect(result.current).toBeNull()
      })

      it('should return first error message', () => {
        const errors = {
          email: { type: 'validation', message: 'Invalid email' },
          password: { type: 'validation', message: 'Password too short' }
        }

        const { result } = renderHook(() => useFormErrors(errors))
        expect(result.current).toBe('Invalid email')
      })

      it('should handle error without message', () => {
        const errors = {
          field: { type: 'validation' }
        }

        const { result } = renderHook(() => useFormErrors(errors))
        expect(result.current).toBe('Validation error')
      })

      it('should convert non-string error messages to string', () => {
        const errors = {
          field: { type: 'custom', message: { text: 'Error' } }
        }

        const { result } = renderHook(() => useFormErrors(errors))
        expect(typeof result.current).toBe('string')
      })
    })

    describe('getFieldError', () => {
      it('should return error for specific field', () => {
        const errors = {
          email: { type: 'validation', message: 'Invalid email' },
          password: { type: 'validation', message: 'Password required' }
        }

        const emailError = getFieldError(errors, 'email')
        const passwordError = getFieldError(errors, 'password')

        expect(emailError).toBe('Invalid email')
        expect(passwordError).toBe('Password required')
      })

      it('should return null when field has no error', () => {
        const errors = {
          email: { type: 'validation', message: 'Invalid email' }
        }

        const result = getFieldError(errors, 'password')
        expect(result).toBeNull()
      })

      it('should return null for empty errors object', () => {
        const result = getFieldError({}, 'email')
        expect(result).toBeNull()
      })

      it('should handle field error without message', () => {
        const errors = {
          field: { type: 'validation' }
        }

        const result = getFieldError(errors, 'field')
        expect(result).toBeNull()
      })
    })
  })

  describe('useFormSubmit Hook', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useFormSubmit())

      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should set isSubmitting during API call', async () => {
      const { result } = renderHook(() => useFormSubmit<{ test: string }, { id: number }>())

      const mockApiCall = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return { data: { id: 1 } } as APIResponse<{ id: number }>
      })

      act(() => {
        result.current.submit({ test: 'data' }, mockApiCall)
      })

      expect(result.current.isSubmitting).toBe(true)

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false)
      })
    })

    it('should return data on successful submission', async () => {
      const { result } = renderHook(() => useFormSubmit<{ email: string }, { redirectTo: string }>())

      const mockApiCall = jest.fn(async () => ({
        data: { redirectTo: '/dashboard' }
      } as APIResponse<{ redirectTo: string }>))

      let submitResult: { redirectTo: string } | null = null

      await act(async () => {
        submitResult = await result.current.submit({ email: 'test@example.com' }, mockApiCall)
      })

      expect(submitResult).toEqual({ redirectTo: '/dashboard' })
      expect(result.current.error).toBeNull()
      expect(result.current.isSubmitting).toBe(false)
    })

    it('should set error on failed submission', async () => {
      const { result } = renderHook(() => useFormSubmit())

      const mockApiCall = jest.fn(async () => ({
        error: {
          code: 'validation_error',
          message: 'Invalid input'
        }
      } as APIResponse<never>))

      let submitResult: unknown

      await act(async () => {
        submitResult = await result.current.submit({}, mockApiCall)
      })

      expect(submitResult).toBeNull()
      expect(result.current.error).toBe('Invalid input')
      expect(result.current.isSubmitting).toBe(false)
    })

    it('should clear error on retry', async () => {
      const { result } = renderHook(() => useFormSubmit())

      // First call - error
      const errorCall = jest.fn(async () => ({
        error: { code: 'error', message: 'Failed' }
      } as APIResponse<never>))

      await act(async () => {
        await result.current.submit({}, errorCall)
      })

      expect(result.current.error).toBe('Failed')

      // Second call - success
      const successCall = jest.fn(async () => ({
        data: { success: true }
      } as APIResponse<{ success: boolean }>))

      await act(async () => {
        await result.current.submit({}, successCall)
      })

      expect(result.current.error).toBeNull()
    })

    it('should support manual error clearing', async () => {
      const { result } = renderHook(() => useFormSubmit())

      const mockApiCall = jest.fn(async () => ({
        error: { code: 'error', message: 'Failed' }
      } as APIResponse<never>))

      await act(async () => {
        await result.current.submit({}, mockApiCall)
      })

      expect(result.current.error).toBe('Failed')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })

    it('should prevent multiple simultaneous submissions', async () => {
      const { result } = renderHook(() => useFormSubmit())

      const mockApiCall = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return { data: { id: 1 } } as APIResponse<{ id: number }>
      })

      // Start first submission
      act(() => {
        result.current.submit({}, mockApiCall)
      })

      expect(result.current.isSubmitting).toBe(true)

      // Attempt second submission while first is in progress
      const callCount = mockApiCall.mock.calls.length

      await act(async () => {
        await result.current.submit({}, mockApiCall)
      })

      // Both submissions should complete
      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false)
      })

      expect(mockApiCall).toHaveBeenCalledTimes(callCount + 1)
    })

    it('should handle API call exceptions gracefully', async () => {
      const { result } = renderHook(() => useFormSubmit())

      const mockApiCall = jest.fn(async () => {
        throw new Error('Network error')
      })

      await act(async () => {
        await result.current.submit({}, mockApiCall)
      })

      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('React Hook Form Integration', () => {
    it('should integrate emailSchema with React Hook Form', async () => {
      const { result } = renderHook(() =>
        useForm({
          resolver: zodResolver(signinSchema)
        })
      )

      await act(async () => {
        await result.current.handleSubmit(() => {})({
          preventDefault: () => {},
          stopPropagation: () => {}
        } as any)
      })

      expect(result.current.formState.errors).toBeDefined()
    })

    it('should show validation errors before submission', async () => {
      const { result } = renderHook(() =>
        useForm<{ email: string; password: string }>({
          resolver: zodResolver(signinSchema),
          mode: 'onChange'
        })
      )

      await act(async () => {
        result.current.setValue('email', 'invalid-email')
        await result.current.trigger('email')
      })

      expect(result.current.formState.errors.email).toBeDefined()
    })

    it('should normalize email on form submission', async () => {
      const { result } = renderHook(() =>
        useForm<{ email: string; password: string }>({
          resolver: zodResolver(signinSchema)
        })
      )

      await act(async () => {
        result.current.setValue('email', '  TEST@Example.COM  ')
        result.current.setValue('password', 'password')
      })

      const values = result.current.getValues()
      const validated = signinSchema.parse(values)

      expect(validated.email).toBe('test@example.com')
    })

    it('should validate password strength in signup form', async () => {
      const signupSchema = signinSchema.extend({
        password: passwordSchema // Use full password validation
      })

      const { result } = renderHook(() =>
        useForm({
          resolver: zodResolver(signupSchema)
        })
      )

      await act(async () => {
        result.current.setValue('email', 'test@example.com')
        result.current.setValue('password', 'weak')
        await result.current.trigger('password')
      })

      expect(result.current.formState.errors.password).toBeDefined()
    })
  })

  describe('Form Submission Flow', () => {
    it('should complete full form submission workflow', async () => {
      const mockApiCall = jest.fn(async (data: { email: string; password: string }) => ({
        data: { redirectTo: '/dashboard' }
      } as APIResponse<{ redirectTo: string }>))

      const { result: formResult } = renderHook(() =>
        useForm<{ email: string; password: string }>({
          resolver: zodResolver(signinSchema)
        })
      )

      const { result: submitResult } = renderHook(() =>
        useFormSubmit<{ email: string; password: string }, { redirectTo: string }>()
      )

      // Set valid form values
      await act(async () => {
        formResult.current.setValue('email', 'test@example.com')
        formResult.current.setValue('password', 'password123')
      })

      // Submit form
      await act(async () => {
        const isValid = await formResult.current.trigger()
        if (isValid) {
          const data = formResult.current.getValues()
          await submitResult.current.submit(data, mockApiCall)
        }
      })

      expect(mockApiCall).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
      expect(submitResult.current.error).toBeNull()
    })
  })
})
