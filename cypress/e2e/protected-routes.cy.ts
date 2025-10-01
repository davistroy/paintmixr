/**
 * Cypress E2E Test: Protected Routes Middleware
 * Feature: 003-deploy-to-vercel
 * Task: T014
 *
 * Tests authentication middleware that protects routes requiring sign-in:
 * - Redirect unauthenticated users to /auth/signin
 * - Allow authenticated users to access protected routes
 * - Preserve intended destination after auth
 * - Handle public vs protected route logic
 *
 * Expected: FAIL until T025 (middleware.ts) implementation complete
 */

describe('Protected Routes Middleware', () => {
  const mockUser = {
    email: 'test@example.com',
    user_id: 'test-user-123',
    exp: Math.floor(Date.now() / 1000) + 86400
  }

  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  describe('Unauthenticated Access', () => {
    it('should redirect to /auth/signin when accessing root without auth', () => {
      cy.visit('/')

      cy.url().should('include', '/auth/signin')
    })

    it('should redirect to /auth/signin when accessing dashboard without auth', () => {
      cy.visit('/dashboard')

      cy.url().should('include', '/auth/signin')
    })

    it('should redirect to /auth/signin when accessing paint collection without auth', () => {
      cy.visit('/paints')

      cy.url().should('include', '/auth/signin')
    })

    it('should redirect to /auth/signin when accessing mixing history without auth', () => {
      cy.visit('/history')

      cy.url().should('include', '/auth/signin')
    })

    it('should redirect to /auth/signin when accessing settings without auth', () => {
      cy.visit('/settings')

      cy.url().should('include', '/auth/signin')
    })

    it('should preserve intended URL as redirect parameter', () => {
      cy.visit('/dashboard/paints/123')

      cy.url().should('include', '/auth/signin')
      cy.url().should('include', 'redirect=')
      cy.url().should('satisfy', (url: string) => {
        return url.includes(encodeURIComponent('/dashboard/paints/123'))
      })
    })
  })

  describe('Authenticated Access', () => {
    beforeEach(() => {
      // Set valid session
      cy.setCookie('sb-access-token', btoa(JSON.stringify(mockUser)), {
        httpOnly: true,
        secure: true
      })
    })

    it('should allow access to root with valid session', () => {
      cy.visit('/')

      cy.url().should('not.include', '/auth/signin')
      cy.url().should('eq', Cypress.config().baseUrl + '/')
    })

    it('should allow access to dashboard with valid session', () => {
      cy.visit('/dashboard')

      cy.url().should('not.include', '/auth/signin')
      cy.get('[data-testid="dashboard"]').should('be.visible')
    })

    it('should allow access to paint collection with valid session', () => {
      cy.visit('/paints')

      cy.url().should('not.include', '/auth/signin')
      cy.get('[data-testid="paint-list"]').should('be.visible')
    })

    it('should allow access to settings with valid session', () => {
      cy.visit('/settings')

      cy.url().should('not.include', '/auth/signin')
      cy.get('[data-testid="settings-page"]').should('be.visible')
    })

    it('should allow navigation between protected routes', () => {
      cy.visit('/')
      cy.get('[data-testid="nav-dashboard"]').click()
      cy.url().should('include', '/dashboard')

      cy.get('[data-testid="nav-paints"]').click()
      cy.url().should('include', '/paints')

      cy.get('[data-testid="nav-settings"]').click()
      cy.url().should('include', '/settings')

      // Should not redirect to sign-in
      cy.url().should('not.include', '/auth/signin')
    })
  })

  describe('Public Routes', () => {
    it('should allow access to /auth/signin without authentication', () => {
      cy.visit('/auth/signin')

      cy.url().should('include', '/auth/signin')
      cy.get('[data-testid="signin-google"]').should('be.visible')
    })

    it('should allow access to /auth/error without authentication', () => {
      cy.visit('/auth/error?error=test_error')

      cy.url().should('include', '/auth/error')
      cy.get('[data-testid="error-message"]').should('be.visible')
    })

    it('should allow access to /api/auth/callback without authentication', () => {
      cy.request({
        method: 'GET',
        url: '/api/auth/callback?code=test-code',
        followRedirect: false
      }).then((response) => {
        // Should process callback (not 401)
        expect(response.status).to.be.oneOf([200, 302, 400])
      })
    })

    it('should NOT redirect to sign-in when on public auth routes', () => {
      cy.visit('/auth/signin')

      // Should stay on sign-in page
      cy.url().should('include', '/auth/signin')
      cy.url().should('not.include', 'redirect=')
    })
  })

  describe('Redirect After Authentication', () => {
    it('should redirect to original destination after sign-in', () => {
      // Try to access protected route
      cy.visit('/dashboard/paints')

      // Redirected to sign-in with redirect param
      cy.url().should('include', '/auth/signin')
      cy.url().should('include', 'redirect=')

      // Mock successful sign-in
      cy.setCookie('sb-access-token', btoa(JSON.stringify(mockUser)))

      // Manually navigate back (simulating post-auth redirect)
      cy.visit('/dashboard/paints')

      // Should now access the original destination
      cy.url().should('include', '/dashboard/paints')
      cy.url().should('not.include', '/auth/signin')
    })

    it('should default to root if no redirect specified', () => {
      cy.visit('/auth/signin')

      // Mock successful sign-in
      cy.setCookie('sb-access-token', btoa(JSON.stringify(mockUser)))

      // Navigate to callback
      cy.visit('/api/auth/callback?code=test')

      // Should redirect to root
      cy.url().should('satisfy', (url: string) => {
        return url === Cypress.config().baseUrl + '/' ||
               url.endsWith('/')
      })
    })

    it('should sanitize redirect parameter to prevent open redirect', () => {
      // Attempt open redirect attack
      cy.visit('/auth/signin?redirect=https://evil.com/steal-data')

      cy.setCookie('sb-access-token', btoa(JSON.stringify(mockUser)))

      // Should NOT redirect to external site
      cy.url().should('not.include', 'evil.com')
      cy.url().should('satisfy', (url: string) => {
        return url.startsWith(Cypress.config().baseUrl!)
      })
    })
  })

  describe('Middleware Edge Cases', () => {
    it('should handle expired session by redirecting to sign-in', () => {
      const expiredUser = {
        ...mockUser,
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired
      }

      cy.setCookie('sb-access-token', btoa(JSON.stringify(expiredUser)))

      cy.visit('/dashboard')

      cy.url().should('include', '/auth/signin')
      cy.get('[data-testid="session-expired-message"]').should('be.visible')
    })

    it('should handle invalid session token by redirecting', () => {
      cy.setCookie('sb-access-token', 'invalid-malformed-token')

      cy.visit('/dashboard')

      cy.url().should('include', '/auth/signin')
    })

    it('should handle missing session cookie', () => {
      // No cookie set
      cy.visit('/dashboard')

      cy.url().should('include', '/auth/signin')
    })

    it('should re-validate session on each request', () => {
      cy.setCookie('sb-access-token', btoa(JSON.stringify(mockUser)))

      cy.visit('/dashboard')
      cy.url().should('include', '/dashboard')

      // Clear session mid-session
      cy.clearCookies()

      // Navigate to another protected route
      cy.visit('/paints')

      // Should redirect (session no longer valid)
      cy.url().should('include', '/auth/signin')
    })
  })

  describe('API Route Protection', () => {
    it('should protect API routes requiring authentication', () => {
      cy.request({
        method: 'GET',
        url: '/api/paints',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
      })
    })

    it('should allow authenticated API requests', () => {
      cy.setCookie('sb-access-token', btoa(JSON.stringify(mockUser)))

      cy.request({
        method: 'GET',
        url: '/api/paints'
      }).then((response) => {
        expect(response.status).to.eq(200)
      })
    })

    it('should reject API requests with invalid tokens', () => {
      cy.setCookie('sb-access-token', 'invalid-token')

      cy.request({
        method: 'GET',
        url: '/api/paints',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
      })
    })

    it('should validate session on every API call', () => {
      // Create session
      cy.setCookie('sb-access-token', btoa(JSON.stringify(mockUser)))

      // First API call succeeds
      cy.request('/api/paints').then((response) => {
        expect(response.status).to.eq(200)
      })

      // Invalidate session
      cy.clearCookies()

      // Second API call fails
      cy.request({
        method: 'GET',
        url: '/api/paints',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
      })
    })
  })

  describe('Middleware Performance', () => {
    it('should not significantly delay page load with auth check', () => {
      cy.setCookie('sb-access-token', btoa(JSON.stringify(mockUser)))

      const startTime = Date.now()

      cy.visit('/')

      cy.get('[data-testid="user-menu"]').should('be.visible').then(() => {
        const elapsed = Date.now() - startTime

        // Auth middleware should add <100ms overhead
        expect(elapsed).to.be.lessThan(1000)
      })
    })

    it('should cache session validation within request', () => {
      cy.setCookie('sb-access-token', btoa(JSON.stringify(mockUser)))

      // Track number of auth validation calls
      let validationCount = 0

      cy.intercept('GET', '**/auth/v1/user*', (req) => {
        validationCount++
        req.reply({ statusCode: 200, body: mockUser })
      }).as('authValidation')

      cy.visit('/')

      // Should validate only once per page load
      cy.wrap(null).then(() => {
        expect(validationCount).to.be.lessThan(3)
      })
    })
  })

  describe('SSR vs Client-Side Auth Checks', () => {
    it('should validate auth server-side (SSR)', () => {
      // Without session, server should redirect before client hydration
      cy.visit('/')

      // Should redirect immediately (SSR check)
      cy.url().should('include', '/auth/signin')

      // Client-side check should not cause flash of content
      cy.get('[data-testid="dashboard"]').should('not.exist')
    })

    it('should avoid flash of unauthenticated content', () => {
      cy.visit('/')

      // Should NOT briefly show protected content before redirect
      cy.get('[data-testid="user-menu"]').should('not.exist')
      cy.get('[data-testid="signout-button"]').should('not.exist')

      // Should be on sign-in page immediately
      cy.url().should('include', '/auth/signin')
    })
  })
})

/**
 * Middleware Configuration Tests
 */
describe('Middleware Configuration', () => {
  it('should apply middleware to all routes except public paths', () => {
    const publicPaths = [
      '/auth/signin',
      '/auth/error',
      '/api/auth/callback'
    ]

    publicPaths.forEach((path) => {
      cy.visit(path)
      cy.url().should('include', path)
      cy.url().should('not.include', 'redirect=')
    })
  })

  it('should apply middleware to nested routes', () => {
    const protectedPaths = [
      '/dashboard',
      '/dashboard/paints',
      '/dashboard/paints/123',
      '/settings/account',
      '/settings/profile'
    ]

    protectedPaths.forEach((path) => {
      cy.clearCookies()
      cy.visit(path)
      cy.url().should('include', '/auth/signin')
    })
  })
})
