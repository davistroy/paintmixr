/**
 * Contract Tests: API Client Utilities
 *
 * Tests for src/lib/api/client.ts
 * Validates shared API client contract from refactoring-contracts.md
 *
 * Expected: FAIL (module doesn't exist yet)
 */

import { APIError, apiRequest, apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/client'

describe('API Client Utilities Contract', () => {
  describe('APIError Class', () => {
    it('should create APIError with all required properties', () => {
      const error = new APIError(
        400,
        'validation_error',
        'Invalid input',
        { field: 'email' }
      )

      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('APIError')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('validation_error')
      expect(error.message).toBe('Invalid input')
      expect(error.details).toEqual({ field: 'email' })
    })

    it('should handle APIError without details', () => {
      const error = new APIError(500, 'server_error', 'Internal error')

      expect(error.statusCode).toBe(500)
      expect(error.code).toBe('server_error')
      expect(error.message).toBe('Internal error')
      expect(error.details).toBeUndefined()
    })

    it('should support all standard HTTP status codes', () => {
      const statusCodes = [400, 401, 403, 404, 429, 500, 502, 503]

      statusCodes.forEach(code => {
        const error = new APIError(code, 'test_error', 'Test message')
        expect(error.statusCode).toBe(code)
      })
    })

    it('should support all standard error codes', () => {
      const errorCodes = [
        'invalid_credentials',
        'account_locked',
        'oauth_precedence',
        'rate_limited',
        'validation_error',
        'missing_field',
        'network_error',
        'unknown_error'
      ]

      errorCodes.forEach(code => {
        const error = new APIError(400, code, 'Test message')
        expect(error.code).toBe(code)
      })
    })
  })

  describe('apiRequest - Base Request Handler', () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should make GET request with correct parameters', async () => {
      const mockData = { id: 1, name: 'Test' }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData
      })

      const response = await apiRequest('/api/test', { method: 'GET' })

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined,
        signal: undefined
      })
      expect(response.data).toEqual(mockData)
      expect(response.error).toBeUndefined()
    })

    it('should make POST request with body serialization', async () => {
      const requestBody = { email: 'test@example.com', password: 'secret' }
      const mockData = { redirectTo: '/dashboard' }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData
      })

      const response = await apiRequest('/api/auth', {
        method: 'POST',
        body: requestBody
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: undefined
      })
      expect(response.data).toEqual(mockData)
    })

    it('should pass custom headers through', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({})
      })

      await apiRequest('/api/test', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer token123' }
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123'
        },
        body: undefined,
        signal: undefined
      })
    })

    it('should support request cancellation with AbortSignal', async () => {
      const controller = new AbortController()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({})
      })

      await apiRequest('/api/test', {
        method: 'GET',
        signal: controller.signal
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined,
        signal: controller.signal
      })
    })

    it('should handle API errors with error response format', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'validation_error',
          message: 'Invalid email format',
          details: { field: 'email' }
        })
      })

      const response = await apiRequest('/api/test', { method: 'POST', body: {} })

      expect(response.data).toBeUndefined()
      expect(response.error).toEqual({
        code: 'validation_error',
        message: 'Invalid email format',
        details: { field: 'email' }
      })
    })

    it('should handle API errors without details', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'invalid_credentials',
          message: 'Invalid credentials'
        })
      })

      const response = await apiRequest('/api/auth', { method: 'POST', body: {} })

      expect(response.error).toEqual({
        code: 'invalid_credentials',
        message: 'Invalid credentials',
        details: undefined
      })
    })

    it('should handle network errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'))

      const response = await apiRequest('/api/test', { method: 'GET' })

      expect(response.data).toBeUndefined()
      expect(response.error).toEqual({
        code: 'network_error',
        message: 'Network request failed'
      })
    })

    it('should handle JSON parse errors as network errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => { throw new Error('Invalid JSON') }
      })

      const response = await apiRequest('/api/test', { method: 'GET' })

      expect(response.error?.code).toBe('network_error')
    })

    it('should preserve APIError when thrown', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'rate_limited',
          message: 'Too many requests'
        })
      })

      const response = await apiRequest('/api/test', { method: 'POST', body: {} })

      expect(response.error?.code).toBe('rate_limited')
      expect(response.error?.message).toBe('Too many requests')
    })
  })

  describe('Convenience Methods', () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    describe('apiGet', () => {
      it('should make GET request without signal', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ data: 'test' })
        })

        await apiGet('/api/data')

        expect(global.fetch).toHaveBeenCalledWith('/api/data', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          body: undefined,
          signal: undefined
        })
      })

      it('should make GET request with AbortSignal', async () => {
        const controller = new AbortController()
        ;(global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ data: 'test' })
        })

        await apiGet('/api/data', controller.signal)

        expect(global.fetch).toHaveBeenCalledWith('/api/data', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          body: undefined,
          signal: controller.signal
        })
      })

      it('should return typed response data', async () => {
        interface TestData { id: number; name: string }
        const mockData: TestData = { id: 1, name: 'Test' }
        ;(global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => mockData
        })

        const response = await apiGet<TestData>('/api/test')

        expect(response.data).toEqual(mockData)
      })
    })

    describe('apiPost', () => {
      it('should make POST request with body', async () => {
        const body = { name: 'New Item' }
        ;(global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ id: 1, ...body })
        })

        await apiPost('/api/items', body)

        expect(global.fetch).toHaveBeenCalledWith('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: undefined
        })
      })

      it('should make POST request with body and signal', async () => {
        const controller = new AbortController()
        const body = { test: 'data' }
        ;(global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({})
        })

        await apiPost('/api/test', body, controller.signal)

        expect(global.fetch).toHaveBeenCalledWith('/api/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        })
      })

      it('should return typed response data', async () => {
        interface CreateResponse { id: number; redirectTo: string }
        const mockData: CreateResponse = { id: 1, redirectTo: '/success' }
        ;(global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => mockData
        })

        const response = await apiPost<CreateResponse>('/api/create', {})

        expect(response.data).toEqual(mockData)
      })
    })

    describe('apiPut', () => {
      it('should make PUT request with body', async () => {
        const body = { name: 'Updated Item' }
        ;(global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ id: 1, ...body })
        })

        await apiPut('/api/items/1', body)

        expect(global.fetch).toHaveBeenCalledWith('/api/items/1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: undefined
        })
      })

      it('should make PUT request with signal', async () => {
        const controller = new AbortController()
        ;(global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({})
        })

        await apiPut('/api/items/1', { name: 'Test' }, controller.signal)

        expect(global.fetch).toHaveBeenCalledWith('/api/items/1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Test' }),
          signal: controller.signal
        })
      })
    })

    describe('apiDelete', () => {
      it('should make DELETE request without signal', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ success: true })
        })

        await apiDelete('/api/items/1')

        expect(global.fetch).toHaveBeenCalledWith('/api/items/1', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: undefined,
          signal: undefined
        })
      })

      it('should make DELETE request with signal', async () => {
        const controller = new AbortController()
        ;(global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({})
        })

        await apiDelete('/api/items/1', controller.signal)

        expect(global.fetch).toHaveBeenCalledWith('/api/items/1', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: undefined,
          signal: controller.signal
        })
      })
    })
  })

  describe('Request Cancellation', () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should support aborting GET requests', async () => {
      const controller = new AbortController()
      ;(global.fetch as jest.Mock).mockImplementation(() => {
        controller.abort()
        return Promise.reject(new DOMException('Aborted', 'AbortError'))
      })

      const response = await apiGet('/api/test', controller.signal)

      expect(response.error?.code).toBe('network_error')
    })

    it('should support aborting POST requests', async () => {
      const controller = new AbortController()
      ;(global.fetch as jest.Mock).mockImplementation(() => {
        controller.abort()
        return Promise.reject(new DOMException('Aborted', 'AbortError'))
      })

      const response = await apiPost('/api/test', {}, controller.signal)

      expect(response.error?.code).toBe('network_error')
    })

    it('should handle multiple concurrent requests with separate signals', async () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 1 })
        })
        .mockImplementation(() => {
          controller2.abort()
          return Promise.reject(new DOMException('Aborted', 'AbortError'))
        })

      const [response1, response2] = await Promise.all([
        apiGet('/api/test1', controller1.signal),
        apiGet('/api/test2', controller2.signal)
      ])

      expect(response1.data).toEqual({ id: 1 })
      expect(response2.error?.code).toBe('network_error')
    })
  })

  describe('Error Code Consistency', () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should use consistent error codes across authentication errors', async () => {
      const authErrors = [
        { code: 'invalid_credentials', message: 'Invalid credentials' },
        { code: 'account_locked', message: 'Account locked' },
        { code: 'oauth_precedence', message: 'Use OAuth provider' },
        { code: 'rate_limited', message: 'Too many requests' }
      ]

      for (const error of authErrors) {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => error
        })

        const response = await apiPost('/api/auth', {})
        expect(response.error?.code).toBe(error.code)
      }
    })

    it('should use consistent error codes across validation errors', async () => {
      const validationErrors = [
        { code: 'validation_error', message: 'Invalid format' },
        { code: 'missing_field', message: 'Required field missing' }
      ]

      for (const error of validationErrors) {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => error
        })

        const response = await apiPost('/api/validate', {})
        expect(response.error?.code).toBe(error.code)
      }
    })

    it('should use network_error for all network failures', async () => {
      const networkErrors = [
        new TypeError('Failed to fetch'),
        new Error('Connection refused'),
        new DOMException('Aborted', 'AbortError')
      ]

      for (const error of networkErrors) {
        ;(global.fetch as jest.Mock).mockRejectedValueOnce(error)

        const response = await apiGet('/api/test')
        expect(response.error?.code).toBe('network_error')
      }
    })
  })

  describe('Type Safety', () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should preserve response type information', async () => {
      interface UserData {
        id: number
        email: string
        name: string
      }

      const mockUser: UserData = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User'
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser
      })

      const response = await apiGet<UserData>('/api/user')

      if (response.data) {
        // TypeScript should recognize these properties
        expect(response.data.id).toBe(1)
        expect(response.data.email).toBe('test@example.com')
        expect(response.data.name).toBe('Test User')
      }
    })

    it('should handle array response types', async () => {
      interface Paint { id: number; name: string }
      const mockPaints: Paint[] = [
        { id: 1, name: 'Red' },
        { id: 2, name: 'Blue' }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPaints
      })

      const response = await apiGet<Paint[]>('/api/paints')

      expect(Array.isArray(response.data)).toBe(true)
      expect(response.data).toHaveLength(2)
    })
  })
})
