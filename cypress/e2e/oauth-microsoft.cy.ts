/**
 * Cypress E2E Test: Microsoft OAuth Flow
 * Feature: 003-deploy-to-vercel
 * Task: T010
 *
 * Tests Microsoft (Azure AD) OAuth authentication flow including:
 * - Sign-in with Microsoft button
 * - Azure AD OAuth redirect
 * - Callback processing
 * - Session establishment
 *
 * Expected: FAIL until T016-T025 implementation complete
 */

describe('Microsoft OAuth Authentication', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('should display sign-in page with Microsoft OAuth button', () => {
    cy.visit('/auth/signin')

    cy.url().should('include', '/auth/signin')

    cy.get('[data-testid="signin-microsoft"]')
      .should('be.visible')
      .should('contain.text', 'Sign in with Microsoft')
  })

  it('should initiate Microsoft OAuth flow on button click', () => {
    cy.visit('/auth/signin')

    cy.get('[data-testid="signin-microsoft"]').click()

    // Check for OAuth redirect to Microsoft/Azure
    cy.url().should('satisfy', (url: string) => {
      return url.includes('supabase.co/auth') ||
             url.includes('login.microsoftonline.com') ||
             url.includes('login.live.com')
    })
  })

  it('should handle successful Microsoft OAuth callback', () => {
    cy.intercept('GET', '**/auth/v1/callback*', {
      statusCode: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': 'sb-access-token=mock-ms-token; HttpOnly; Secure'
      }
    }).as('msCallback')

    cy.visit('/api/auth/callback?code=mock-ms-auth-code&provider=azure')

    cy.wait('@msCallback')

    cy.url().should('eq', Cypress.config().baseUrl + '/')
  })

  it('should establish session after Microsoft auth', () => {
    cy.setCookie('sb-access-token', 'mock-ms-jwt-token', {
      httpOnly: true,
      secure: true
    })

    cy.visit('/')

    cy.url().should('not.include', '/auth/signin')
    cy.get('[data-testid="user-menu"]').should('be.visible')
  })

  it('should handle Microsoft OAuth errors', () => {
    cy.visit('/api/auth/callback?error=consent_required&provider=azure')

    cy.url().should('include', '/auth/error')
    cy.get('[data-testid="error-message"]')
      .should('contain.text', 'consent_required')
  })

  it('should support both personal and work Microsoft accounts', () => {
    cy.visit('/auth/signin')

    // Microsoft button should indicate both account types supported
    cy.get('[data-testid="signin-microsoft"]')
      .should('be.visible')

    // Verify tooltip or help text
    cy.get('[data-testid="signin-microsoft"]')
      .trigger('mouseover')

    cy.get('[data-testid="microsoft-help-text"]')
      .should('contain.text', 'personal')
      .or('contain.text', 'work')
  })

  it('should display Microsoft branding correctly', () => {
    cy.visit('/auth/signin')

    cy.get('[data-testid="signin-microsoft"]')
      .find('img, svg')
      .should('exist')
  })

  it('should handle Microsoft-specific error codes', () => {
    // Test common Microsoft OAuth errors
    const msErrors = [
      'invalid_client',
      'invalid_grant',
      'interaction_required',
      'temporarily_unavailable'
    ]

    msErrors.forEach(errorCode => {
      cy.visit(`/api/auth/callback?error=${errorCode}&provider=azure`)
      cy.url().should('include', '/auth/error')
      cy.get('[data-testid="error-message"]').should('be.visible')
    })
  })
})

/**
 * Microsoft OAuth Advanced Tests
 */
describe('Microsoft OAuth Advanced Scenarios', () => {
  it('should handle Azure AD tenant-specific sign-in', () => {
    cy.visit('/auth/signin')

    cy.get('[data-testid="signin-microsoft"]').click()

    // Azure AD supports tenant isolation
    cy.url().should('satisfy', (url: string) => {
      return url.includes('common') || url.includes('organizations')
    })
  })

  it('should complete Microsoft OAuth flow in under 5 seconds', () => {
    const startTime = Date.now()

    cy.visit('/auth/signin')
    cy.get('[data-testid="signin-microsoft"]').click()

    cy.url().should('satisfy', () => {
      const elapsed = Date.now() - startTime
      return elapsed < 5000
    })
  })

  it('should have accessible Microsoft sign-in button', () => {
    cy.visit('/auth/signin')

    cy.get('[data-testid="signin-microsoft"]')
      .should('have.attr', 'role', 'button')
      .should('have.attr', 'aria-label')
      .should('not.have.attr', 'disabled')
  })

  it('should show loading state during Microsoft OAuth', () => {
    cy.visit('/auth/signin')

    cy.get('[data-testid="signin-microsoft"]').click()

    cy.get('[data-testid="signin-loading"]').should('be.visible')
  })

  it('should disable button after click', () => {
    cy.visit('/auth/signin')

    cy.get('[data-testid="signin-microsoft"]').click()
    cy.get('[data-testid="signin-microsoft"]').should('be.disabled')
  })
})

/**
 * Cross-Provider Tests: Microsoft + Google
 */
describe('Microsoft OAuth with Multiple Providers', () => {
  it('should display both Microsoft and Google buttons', () => {
    cy.visit('/auth/signin')

    cy.get('[data-testid="signin-google"]').should('be.visible')
    cy.get('[data-testid="signin-microsoft"]').should('be.visible')
    cy.get('[data-testid="signin-facebook"]').should('be.visible')
  })

  it('should maintain separation between provider buttons', () => {
    cy.visit('/auth/signin')

    // Verify visual separation
    cy.get('[data-testid="signin-google"]')
      .should('not.have.class', 'merged')

    cy.get('[data-testid="signin-microsoft"]')
      .should('not.have.class', 'merged')
  })
})
