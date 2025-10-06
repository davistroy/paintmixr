/**
 * Contract Test: API Version Headers
 *
 * Validates that all API routes return X-API-Version header.
 *
 * Feature: 010-using-refactor-recommendations
 * Task: T028
 * Requirement: FR-028
 */

import { CURRENT_API_VERSION } from '@/lib/contracts/api-headers'

describe('API Version Headers Contract', () => {
  const API_ROUTES = [
    '/api/optimize',
    '/api/paints',
    '/api/sessions',
    '/api/auth/email-signin',
  ]

  describe.each(API_ROUTES)('Route: %s', (route) => {
    it('should return X-API-Version header', async () => {
      // This test will fail until T039 is implemented
      const response = await fetch(`http://localhost:3000${route}`, {
        method: route === '/api/optimize' ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: route === '/api/optimize' ? JSON.stringify({
          targetColor: { hex: '#FF0000', lab: { l: 50, a: 50, b: 0 } },
          availablePaints: [],
          mode: 'standard',
        }) : undefined,
      })

      expect(response.headers.get('X-API-Version')).toBe(CURRENT_API_VERSION)
    })

    it('should not return X-Deprecated header by default', async () => {
      const response = await fetch(`http://localhost:3000${route}`, {
        method: route === '/api/optimize' ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: route === '/api/optimize' ? JSON.stringify({
          targetColor: { hex: '#FF0000', lab: { l: 50, a: 50, b: 0 } },
          availablePaints: [],
          mode: 'standard',
        }) : undefined,
      })

      expect(response.headers.get('X-Deprecated')).toBeNull()
    })
  })

  describe('Cache-Control headers on GET routes', () => {
    const GET_ROUTES = ['/api/paints', '/api/sessions']

    it.each(GET_ROUTES)('%s should return Cache-Control header', async (route) => {
      // This test will fail until T041 is implemented
      const response = await fetch(`http://localhost:3000${route}`)

      const cacheControl = response.headers.get('Cache-Control')
      expect(cacheControl).toBeTruthy()
      expect(cacheControl).toContain('private')
      expect(cacheControl).toContain('max-age=')
    })
  })
})
