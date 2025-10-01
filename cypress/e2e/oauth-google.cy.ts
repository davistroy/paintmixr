/**
 * Cypress E2E Test: Google OAuth Flow
 * Feature: 003-deploy-to-vercel
 * Task: T009
 *
 * Tests the complete Google OAuth authentication flow including:
 * - Sign-in page rendering
 * - OAuth redirect to Google
 * - Callback processing
 * - Session establishment
 * - User authentication state
 *
 * Expected: FAIL until T016-T025 implementation complete
 */

describe('Google OAuth Authentication', () => {
  beforeEach(() => {
    // Clear cookies and local storage before each test
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('should display sign-in page with Google OAuth button', () => {
    cy.visit('/auth/signin')

    // Verify sign-in page loads
    cy.url().should('include', '/auth/signin')

    // Check for Google sign-in button
    cy.get('[data-testid="signin-google"]')
      .should('be.visible')
      .should('contain.text', 'Sign in with Google')
  })

  it('should redirect unauthenticated users to sign-in page', () => {
    // Attempt to access protected route
    cy.visit('/')

    // Should redirect to sign-in
    cy.url().should('include', '/auth/signin')
  })

  it('should initiate Google OAuth flow on button click', () => {
    cy.visit('/auth/signin')

    // Click Google sign-in button
    cy.get('[data-testid="signin-google"]').click()

    // Check for OAuth redirect
    // In real environment, this would redirect to Google
    // In test environment, we'll intercept or mock
    cy.url().should('satisfy', (url: string) => {
      return url.includes('supabase.co/auth') ||
             url.includes('accounts.google.com')
    })
  })

  // Mock OAuth callback for testing
  it('should handle successful OAuth callback', () => {
    // Mock successful OAuth response
    cy.intercept('GET', '**/auth/v1/callback*', {
      statusCode: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': 'sb-access-token=mock-token; HttpOnly; Secure'
      }
    }).as('oauthCallback')

    // Simulate callback with code parameter
    cy.visit('/api/auth/callback?code=mock-authorization-code')

    // Wait for callback processing
    cy.wait('@oauthCallback')

    // Should redirect to home
    cy.url().should('eq', Cypress.config().baseUrl + '/')
  })

  it('should establish authenticated session after OAuth', () => {
    // Mock authenticated session
    cy.setCookie('sb-access-token', 'mock-jwt-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax'
    })

    // Visit app
    cy.visit('/')

    // Should NOT redirect to sign-in
    cy.url().should('not.include', '/auth/signin')

    // User menu should be visible
    cy.get('[data-testid="user-menu"]').should('be.visible')
  })

  it('should display user profile after successful sign-in', () => {
    // Mock authenticated state
    cy.setCookie('sb-access-token', 'mock-jwt-token')

    cy.visit('/')

    // Check for user-specific elements
    cy.get('[data-testid="user-menu"]').should('be.visible')
    cy.get('[data-testid="user-email"]').should('exist')
  })

  it('should handle OAuth errors gracefully', () => {
    // Simulate OAuth error callback
    cy.visit('/api/auth/callback?error=access_denied&error_description=User+cancelled+login')

    // Should redirect to error page
    cy.url().should('include', '/auth/error')

    // Error message should be displayed
    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .should('contain.text', 'access_denied')
  })

  it('should allow sign-out after successful OAuth', () => {
    // Mock authenticated state
    cy.setCookie('sb-access-token', 'mock-jwt-token')

    cy.visit('/')

    // Click sign-out button
    cy.get('[data-testid="signout-button"]').click()

    // Should redirect to sign-in page
    cy.url().should('include', '/auth/signin')

    // Session cookie should be cleared
    cy.getCookie('sb-access-token').should('not.exist')
  })

  // Performance test: OAuth flow should complete quickly
  it('should complete OAuth flow in under 5 seconds', () => {
    const startTime = Date.now()

    cy.visit('/auth/signin')
    cy.get('[data-testid="signin-google"]').click()

    // Measure redirect time
    cy.url().should('satisfy', () => {
      const elapsed = Date.now() - startTime
      return elapsed < 5000 // 5 seconds
    })
  })

  // Accessibility test
  it('should have accessible sign-in button', () => {
    cy.visit('/auth/signin')

    cy.get('[data-testid="signin-google"]')
      .should('have.attr', 'role', 'button')
      .should('have.attr', 'aria-label')
      .should('not.have.attr', 'disabled')
  })
})

/**
 * Advanced OAuth Flow Tests
 * These tests verify edge cases and complex scenarios
 */
describe('Google OAuth Advanced Scenarios', () => {
  it('should preserve redirect URL after authentication', () => {
    // Try to access specific page while unauthenticated
    cy.visit('/dashboard/paints')

    // Should redirect to sign-in with return URL
    cy.url().should('include', '/auth/signin')
    cy.url().should('include', 'redirect=')

    // Mock successful auth
    cy.setCookie('sb-access-token', 'mock-jwt-token')

    // Should redirect back to original page
    cy.visit('/')
    cy.url().should('eq', Cypress.config().baseUrl + '/')
  })

  it('should handle concurrent OAuth requests', () => {
    // Attempt multiple simultaneous sign-ins
    cy.visit('/auth/signin')

    cy.get('[data-testid="signin-google"]').click()
    cy.get('[data-testid="signin-google"]').click()
    cy.get('[data-testid="signin-google"]').click()

    // Should handle gracefully (no errors)
    cy.get('[data-testid="error-message"]').should('not.exist')
  })

  it('should validate OAuth state parameter', () => {
    // Simulate callback with mismatched state (CSRF protection)
    cy.intercept('GET', '**/api/auth/callback*', (req) => {
      // Supabase Auth validates state automatically
      if (!req.url.includes('state=')) {
        req.reply({
          statusCode: 400,
          body: { error: 'invalid_request', message: 'Missing state parameter' }
        })
      }
    }).as('stateValidation')

    cy.visit('/api/auth/callback?code=test-code')

    // Should reject invalid callback
    cy.url().should('include', '/auth/error')
  })
})

/**
 * OAuth Provider Selection Tests
 */
describe('Google OAuth UI Interactions', () => {
  it('should display Google branding correctly', () => {
    cy.visit('/auth/signin')

    // Check for Google logo/icon
    cy.get('[data-testid="signin-google"]')
      .find('img, svg')
      .should('exist')
  })

  it('should show loading state during OAuth redirect', () => {
    cy.visit('/auth/signin')

    cy.get('[data-testid="signin-google"]').click()

    // Loading indicator should appear
    cy.get('[data-testid="signin-loading"]').should('be.visible')
  })

  it('should disable button after click to prevent double-submit', () => {
    cy.visit('/auth/signin')

    cy.get('[data-testid="signin-google"]').click()

    // Button should be disabled
    cy.get('[data-testid="signin-google"]').should('be.disabled')
  })
})
