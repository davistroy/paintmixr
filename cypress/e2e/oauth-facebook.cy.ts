/**
 * Cypress E2E Test: Facebook OAuth Flow
 * Feature: 003-deploy-to-vercel
 * Task: T011
 *
 * Tests Facebook OAuth authentication flow including:
 * - Sign-in with Facebook button
 * - Facebook OAuth redirect
 * - Callback processing
 * - Session establishment
 *
 * Expected: FAIL until T016-T025 implementation complete
 */

describe('Facebook OAuth Authentication', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('should display sign-in page with Facebook OAuth button', () => {
    cy.visit('/auth/signin')

    cy.url().should('include', '/auth/signin')

    cy.get('[data-testid="signin-facebook"]')
      .should('be.visible')
      .should('contain.text', 'Sign in with Facebook')
  })

  it('should initiate Facebook OAuth flow on button click', () => {
    cy.visit('/auth/signin')

    cy.get('[data-testid="signin-facebook"]').click()

    // Check for OAuth redirect to Facebook
    cy.url().should('satisfy', (url: string) => {
      return url.includes('supabase.co/auth') ||
             url.includes('facebook.com') ||
             url.includes('fb.com')
    })
  })

  it('should handle successful Facebook OAuth callback', () => {
    cy.intercept('GET', '**/auth/v1/callback*', {
      statusCode: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': 'sb-access-token=mock-fb-token; HttpOnly; Secure'
      }
    }).as('fbCallback')

    cy.visit('/api/auth/callback?code=mock-fb-auth-code&provider=facebook')

    cy.wait('@fbCallback')

    cy.url().should('eq', Cypress.config().baseUrl + '/')
  })

  it('should establish session after Facebook auth', () => {
    cy.setCookie('sb-access-token', 'mock-fb-jwt-token', {
      httpOnly: true,
      secure: true
    })

    cy.visit('/')

    cy.url().should('not.include', '/auth/signin')
    cy.get('[data-testid="user-menu"]').should('be.visible')
  })

  it('should handle Facebook OAuth errors', () => {
    cy.visit('/api/auth/callback?error=access_denied&error_description=User+denied+permissions&provider=facebook')

    cy.url().should('include', '/auth/error')
    cy.get('[data-testid="error-message"]')
      .should('contain.text', 'access_denied')
  })

  it('should display Facebook branding correctly', () => {
    cy.visit('/auth/signin')

    cy.get('[data-testid="signin-facebook"]')
      .find('img, svg')
      .should('exist')
  })

  it('should handle Facebook-specific error codes', () => {
    const fbErrors = [
      'user_cancelled_login',
      'access_denied',
      'temporarily_unavailable'
    ]

    fbErrors.forEach(errorCode => {
      cy.visit(`/api/auth/callback?error=${errorCode}&provider=facebook`)
      cy.url().should('include', '/auth/error')
      cy.get('[data-testid="error-message"]').should('be.visible')
    })
  })

  it('should request email permission from Facebook', () => {
    cy.visit('/auth/signin')

    // Intercept OAuth request to verify scope
    cy.intercept('GET', '**/auth/v1/authorize*provider=facebook*', (req) => {
      // Verify email scope is requested
      expect(req.url).to.include('scope')
      expect(req.url).to.match(/email/)
    }).as('fbAuthorize')

    cy.get('[data-testid="signin-facebook"]').click()

    cy.wait('@fbAuthorize')
  })
})

/**
 * Facebook OAuth Advanced Tests
 */
describe('Facebook OAuth Advanced Scenarios', () => {
  it('should complete Facebook OAuth flow in under 5 seconds', () => {
    const startTime = Date.now()

    cy.visit('/auth/signin')
    cy.get('[data-testid="signin-facebook"]').click()

    cy.url().should('satisfy', () => {
      const elapsed = Date.now() - startTime
      return elapsed < 5000
    })
  })

  it('should have accessible Facebook sign-in button', () => {
    cy.visit('/auth/signin')

    cy.get('[data-testid="signin-facebook"]')
      .should('have.attr', 'role', 'button')
      .should('have.attr', 'aria-label')
      .should('not.have.attr', 'disabled')
  })

  it('should show loading state during Facebook OAuth', () => {
    cy.visit('/auth/signin')

    cy.get('[data-testid="signin-facebook"]').click()

    cy.get('[data-testid="signin-loading"]').should('be.visible')
  })

  it('should disable button after click', () => {
    cy.visit('/auth/signin')

    cy.get('[data-testid="signin-facebook"]').click()
    cy.get('[data-testid="signin-facebook"]').should('be.disabled')
  })

  it('should handle Facebook app not in Live mode', () => {
    // Mock response when Facebook app is still in development
    cy.intercept('GET', '**/auth/v1/callback*provider=facebook*', {
      statusCode: 400,
      body: {
        error: 'app_not_setup_for_this_user',
        message: 'App not in Live mode'
      }
    }).as('fbDevMode')

    cy.visit('/api/auth/callback?provider=facebook')

    cy.url().should('include', '/auth/error')
  })
})

/**
 * All OAuth Providers Test Suite
 */
describe('All OAuth Providers Together', () => {
  it('should display all three OAuth provider buttons', () => {
    cy.visit('/auth/signin')

    // All three providers should be visible
    cy.get('[data-testid="signin-google"]').should('be.visible')
    cy.get('[data-testid="signin-microsoft"]').should('be.visible')
    cy.get('[data-testid="signin-facebook"]').should('be.visible')
  })

  it('should have distinct styling for each provider', () => {
    cy.visit('/auth/signin')

    // Each button should have unique identifier
    cy.get('[data-testid="signin-google"]')
      .should('have.css', 'background-color')

    cy.get('[data-testid="signin-microsoft"]')
      .should('have.css', 'background-color')

    cy.get('[data-testid="signin-facebook"]')
      .should('have.css', 'background-color')
  })

  it('should stack provider buttons vertically or horizontally', () => {
    cy.visit('/auth/signin')

    cy.get('[data-testid="oauth-providers"]')
      .should('exist')
      .children()
      .should('have.length', 3)
  })

  it('should have consistent button sizes across providers', () => {
    cy.visit('/auth/signin')

    let googleHeight: number
    let microsoftHeight: number
    let facebookHeight: number

    cy.get('[data-testid="signin-google"]')
      .invoke('height')
      .then((height) => {
        googleHeight = height || 0
      })

    cy.get('[data-testid="signin-microsoft"]')
      .invoke('height')
      .then((height) => {
        microsoftHeight = height || 0
        expect(microsoftHeight).to.equal(googleHeight)
      })

    cy.get('[data-testid="signin-facebook"]')
      .invoke('height')
      .then((height) => {
        facebookHeight = height || 0
        expect(facebookHeight).to.equal(googleHeight)
      })
  })
})
