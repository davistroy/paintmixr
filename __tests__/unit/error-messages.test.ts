// __tests__/unit/error-messages.test.ts

import { translateApiError } from '@/lib/errors/user-messages'

describe('Error Message Translation', () => {
  describe('HTTP Status Code Translation', () => {
    it('should translate 401 to session expired message', () => {
      const message = translateApiError({ status: 401 })
      expect(message).toBe('Session expired. Please sign in again.')
    })

    it('should translate 500 to generic error message', () => {
      const message = translateApiError({ status: 500 })
      expect(message).toBe('Unable to complete request. Please try again.')
    })

    it('should translate 404 to not found message', () => {
      const message = translateApiError({ status: 404 })
      expect(message).toBe('The requested resource was not found.')
    })

    it('should return generic message for unknown status code', () => {
      const message = translateApiError({ status: 418 })
      expect(message).toBe('An unexpected error occurred.')
    })
  })

  describe('Named Error Code Translation', () => {
    it('should translate NETWORK_ERROR to connection message', () => {
      const message = translateApiError({ code: 'NETWORK_ERROR' })
      expect(message).toBe('Connection issue. Please check your internet connection.')
    })

    it('should translate TIMEOUT to timeout message', () => {
      const message = translateApiError({ code: 'TIMEOUT' })
      expect(message).toBe('Request timed out. Please try again.')
    })

    it('should return generic message for unknown error code', () => {
      const message = translateApiError({ code: 'UNKNOWN_ERROR' })
      expect(message).toBe('An unexpected error occurred.')
    })
  })

  describe('Priority and Fallback', () => {
    it('should prioritize status code over error code', () => {
      const message = translateApiError({ status: 401, code: 'NETWORK_ERROR' })
      expect(message).toBe('Session expired. Please sign in again.')
    })

    it('should use provided message as fallback', () => {
      const message = translateApiError({ message: 'Custom error message' })
      expect(message).toBe('Custom error message')
    })

    it('should return generic message when no error info provided', () => {
      const message = translateApiError({})
      expect(message).toBe('An unexpected error occurred.')
    })
  })
})
