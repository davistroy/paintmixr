/**
 * Cypress E2E Test: Email Authentication Flow
 * Feature: 004-add-email-auth
 *
 * Tests the complete email/password authentication flow including:
 * - Successful signin with redirect to dashboard
 * - Invalid password handling with error display
 * - Rate limiting with 5 failed attempts lockout
 * - Session persistence across page refresh
 * - Signout functionality with redirect
 *
 * Expected: FAIL initially - email auth form not yet implemented
 *
 * This test follows TDD approach and will fail until the full email
 * authentication flow is implemented in future tasks.
 */

describe('Email Authentication Flow', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'ValidPassword123!',
    invalidPassword: 'WrongPassword123!'
  }

  beforeEach(() => {
    // Clear all auth state before each test
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.visit('/auth/signin')
  })

  /**
   * Test 1: Successful Signin Flow
   *
   * Scenario: User enters valid credentials
   * Expected: Successful authentication and redirect to dashboard
   */
  it('should successfully sign in with valid credentials and redirect to dashboard', () => {
    // Verify we're on the signin page
    cy.url().should('include', '/auth/signin')

    // Email auth form should be visible
    cy.get('[data-testid="email-signin-form"]')
      .should('be.visible')

    // Enter valid email
    cy.get('[data-testid="email-input"]')
      .should('be.visible')
      .type(testUser.email)

    // Enter valid password
    cy.get('[data-testid="password-input"]')
      .should('be.visible')
      .type(testUser.password)

    // Mock successful signin API response
    cy.intercept('POST', '/api/auth/signin', {
      statusCode: 200,
      body: {
        success: true,
        redirectUrl: '/'
      }
    }).as('signinRequest')

    // Mock authenticated session
    cy.intercept('GET', '**/auth/v1/user*', {
      statusCode: 200,
      body: {
        id: 'test-user-id',
        email: testUser.email,
        email_confirmed_at: new Date().toISOString()
      }
    }).as('userRequest')

    // Submit the form
    cy.get('[data-testid="signin-button"]')
      .should('be.visible')
      .should('not.be.disabled')
      .click()

    // Wait for signin request
    cy.wait('@signinRequest')

    // Should redirect to dashboard (home page)
    cy.url().should('eq', Cypress.config().baseUrl + '/')

    // User should be authenticated - user menu visible
    cy.get('[data-testid="user-menu"]').should('be.visible')
  })

  /**
   * Test 2: Invalid Password Handling
   *
   * Scenario: User enters incorrect password
   * Expected: Error message displayed, stays on signin page
   */
  it('should display error message for invalid password and stay on signin page', () => {
    // Enter valid email
    cy.get('[data-testid="email-input"]').type(testUser.email)

    // Enter invalid password
    cy.get('[data-testid="password-input"]').type(testUser.invalidPassword)

    // Mock failed signin API response
    cy.intercept('POST', '/api/auth/signin', {
      statusCode: 401,
      body: {
        success: false,
        error: 'Invalid email or password'
      }
    }).as('failedSignin')

    // Submit the form
    cy.get('[data-testid="signin-button"]').click()

    // Wait for failed request
    cy.wait('@failedSignin')

    // Should stay on signin page
    cy.url().should('include', '/auth/signin')

    // Error message should be displayed
    cy.get('[data-testid="signin-error"]')
      .should('be.visible')
      .should('contain.text', 'Invalid email or password')

    // Form should still be interactive
    cy.get('[data-testid="email-input"]').should('be.visible')
    cy.get('[data-testid="password-input"]').should('be.visible')
    cy.get('[data-testid="signin-button"]').should('not.be.disabled')
  })

  /**
   * Test 3: Rate Limiting - 5 Failed Attempts Lockout
   *
   * Scenario: User fails signin 5 times consecutively
   * Expected: Lockout message displayed, button disabled for 15 minutes
   */
  it('should lockout user after 5 failed signin attempts with disabled button', () => {
    // Mock failed signin responses
    cy.intercept('POST', '/api/auth/signin', {
      statusCode: 401,
      body: {
        success: false,
        error: 'Invalid email or password'
      }
    }).as('failedSignin')

    // Attempt signin 5 times with invalid password
    for (let attempt = 1; attempt <= 5; attempt++) {
      // Clear previous values
      cy.get('[data-testid="email-input"]').clear()
      cy.get('[data-testid="password-input"]').clear()

      // Enter credentials
      cy.get('[data-testid="email-input"]').type(testUser.email)
      cy.get('[data-testid="password-input"]').type(testUser.invalidPassword)

      // Submit form
      cy.get('[data-testid="signin-button"]').click()

      // Wait for response
      cy.wait('@failedSignin')

      if (attempt < 5) {
        // Before 5th attempt - error message but button still enabled
        cy.get('[data-testid="signin-error"]')
          .should('be.visible')
          .should('contain.text', 'Invalid email or password')

        cy.get('[data-testid="signin-button"]').should('not.be.disabled')
      }
    }

    // After 5 failed attempts - lockout should trigger
    cy.get('[data-testid="lockout-message"]')
      .should('be.visible')
      .should('contain.text', 'Too many failed attempts')
      .should('contain.text', '15 minutes')

    // Signin button should be disabled
    cy.get('[data-testid="signin-button"]')
      .should('be.disabled')
      .should('have.attr', 'aria-disabled', 'true')

    // Attempting to type and submit should not work
    cy.get('[data-testid="email-input"]').should('be.disabled')
    cy.get('[data-testid="password-input"]').should('be.disabled')

    // Lockout countdown timer should be visible
    cy.get('[data-testid="lockout-timer"]')
      .should('be.visible')
      .invoke('text')
      .should('match', /\d+:\d+/) // Format: MM:SS
  })

  /**
   * Test 4: Session Persistence Across Page Refresh
   *
   * Scenario: Authenticated user refreshes the page
   * Expected: Session remains valid, user stays authenticated
   */
  it('should persist authentication session across page refresh', () => {
    // Mock successful signin
    cy.intercept('POST', '/api/auth/signin', {
      statusCode: 200,
      body: {
        success: true,
        redirectUrl: '/'
      }
    }).as('signinRequest')

    // Mock authenticated user session
    cy.intercept('GET', '**/auth/v1/user*', {
      statusCode: 200,
      body: {
        id: 'test-user-id',
        email: testUser.email,
        email_confirmed_at: new Date().toISOString()
      }
    }).as('userRequest')

    // Sign in
    cy.get('[data-testid="email-input"]').type(testUser.email)
    cy.get('[data-testid="password-input"]').type(testUser.password)
    cy.get('[data-testid="signin-button"]').click()

    cy.wait('@signinRequest')

    // Should redirect to home
    cy.url().should('eq', Cypress.config().baseUrl + '/')
    cy.get('[data-testid="user-menu"]').should('be.visible')

    // Reload the page
    cy.reload()

    // Session should persist - still authenticated
    cy.url().should('not.include', '/auth/signin')
    cy.get('[data-testid="user-menu"]').should('be.visible')

    // User data should still be accessible
    cy.get('[data-testid="user-menu"]').click()
    cy.get('[data-testid="user-email"]')
      .should('be.visible')
      .should('contain.text', testUser.email)

    // Navigate to different page
    cy.visit('/dashboard')

    // Should still be authenticated
    cy.url().should('not.include', '/auth/signin')
    cy.get('[data-testid="user-menu"]').should('be.visible')
  })

  /**
   * Test 5: Signout Functionality
   *
   * Scenario: Authenticated user signs out
   * Expected: Session cleared, redirected to signin page
   */
  it('should signout user and redirect to signin page with cleared session', () => {
    // Mock successful signin
    cy.intercept('POST', '/api/auth/signin', {
      statusCode: 200,
      body: {
        success: true,
        redirectUrl: '/'
      }
    }).as('signinRequest')

    // Mock authenticated user
    cy.intercept('GET', '**/auth/v1/user*', {
      statusCode: 200,
      body: {
        id: 'test-user-id',
        email: testUser.email
      }
    }).as('userRequest')

    // Sign in first
    cy.get('[data-testid="email-input"]').type(testUser.email)
    cy.get('[data-testid="password-input"]').type(testUser.password)
    cy.get('[data-testid="signin-button"]').click()

    cy.wait('@signinRequest')

    // Verify authenticated
    cy.url().should('eq', Cypress.config().baseUrl + '/')
    cy.get('[data-testid="user-menu"]').should('be.visible')

    // Mock signout API
    cy.intercept('POST', '/api/auth/signout', {
      statusCode: 200,
      body: { success: true }
    }).as('signoutRequest')

    // Click signout button
    cy.get('[data-testid="signout-button"]').click()

    // Wait for signout
    cy.wait('@signoutRequest')

    // Should redirect to signin page
    cy.url().should('include', '/auth/signin')

    // Signin form should be visible
    cy.get('[data-testid="email-signin-form"]').should('be.visible')

    // User menu should not exist
    cy.get('[data-testid="user-menu"]').should('not.exist')

    // Session storage should be cleared
    cy.window().then((win) => {
      const authToken = win.localStorage.getItem('supabase.auth.token')
      expect(authToken).to.be.null
    })

    // Attempting to access protected route should redirect to signin
    cy.visit('/')
    cy.url().should('include', '/auth/signin')
  })

  /**
   * Additional Test: Form Validation
   *
   * Scenario: User submits form with invalid/empty inputs
   * Expected: Validation errors displayed
   */
  it('should validate form inputs before submission', () => {
    // Submit empty form
    cy.get('[data-testid="signin-button"]').click()

    // Should show validation errors
    cy.get('[data-testid="email-error"]')
      .should('be.visible')
      .should('contain.text', 'Email is required')

    cy.get('[data-testid="password-error"]')
      .should('be.visible')
      .should('contain.text', 'Password is required')

    // Enter invalid email format
    cy.get('[data-testid="email-input"]').type('invalid-email')
    cy.get('[data-testid="signin-button"]').click()

    cy.get('[data-testid="email-error"]')
      .should('be.visible')
      .should('contain.text', 'Invalid email format')

    // Enter valid email, short password
    cy.get('[data-testid="email-input"]').clear().type(testUser.email)
    cy.get('[data-testid="password-input"]').type('short')
    cy.get('[data-testid="signin-button"]').click()

    cy.get('[data-testid="password-error"]')
      .should('be.visible')
      .should('contain.text', 'Password must be at least 8 characters')
  })

  /**
   * Additional Test: Loading State
   *
   * Scenario: Form submission shows loading state
   * Expected: Button disabled with loading indicator during submission
   */
  it('should show loading state during signin request', () => {
    // Mock delayed signin response
    cy.intercept('POST', '/api/auth/signin', (req) => {
      req.reply({
        delay: 1000, // 1 second delay
        statusCode: 200,
        body: {
          success: true,
          redirectUrl: '/'
        }
      })
    }).as('signinRequest')

    // Enter credentials
    cy.get('[data-testid="email-input"]').type(testUser.email)
    cy.get('[data-testid="password-input"]').type(testUser.password)

    // Submit form
    cy.get('[data-testid="signin-button"]').click()

    // Button should be disabled with loading state
    cy.get('[data-testid="signin-button"]')
      .should('be.disabled')
      .should('have.attr', 'aria-busy', 'true')

    // Loading indicator should be visible
    cy.get('[data-testid="signin-loading"]').should('be.visible')

    // Wait for request to complete
    cy.wait('@signinRequest')

    // Loading should disappear
    cy.get('[data-testid="signin-loading"]').should('not.exist')
  })

  /**
   * Additional Test: Redirect Preservation
   *
   * Scenario: User tries to access protected page, gets redirected to signin,
   *           then successfully signs in
   * Expected: After signin, user is redirected to originally requested page
   */
  it('should redirect to originally requested page after successful signin', () => {
    // Try to access protected page while unauthenticated
    cy.visit('/dashboard/paints?view=collection')

    // Should redirect to signin with redirect parameter
    cy.url().should('include', '/auth/signin')
    cy.url().should('include', 'redirect=')

    // Mock successful signin
    cy.intercept('POST', '/api/auth/signin', {
      statusCode: 200,
      body: {
        success: true,
        redirectUrl: '/dashboard/paints?view=collection'
      }
    }).as('signinRequest')

    // Sign in
    cy.get('[data-testid="email-input"]').type(testUser.email)
    cy.get('[data-testid="password-input"]').type(testUser.password)
    cy.get('[data-testid="signin-button"]').click()

    cy.wait('@signinRequest')

    // Should redirect to originally requested page
    cy.url().should('include', '/dashboard/paints')
    cy.url().should('include', 'view=collection')
  })

  /**
   * Accessibility Test: Keyboard Navigation
   *
   * Scenario: User navigates form using keyboard only
   * Expected: All elements accessible via keyboard
   */
  it('should support keyboard navigation for accessibility', () => {
    // Tab to email input
    cy.get('body').tab()
    cy.focused().should('have.attr', 'data-testid', 'email-input')

    // Type email
    cy.focused().type(testUser.email)

    // Tab to password input
    cy.focused().tab()
    cy.focused().should('have.attr', 'data-testid', 'password-input')

    // Type password
    cy.focused().type(testUser.password)

    // Tab to submit button
    cy.focused().tab()
    cy.focused().should('have.attr', 'data-testid', 'signin-button')

    // Enter key should submit form
    cy.intercept('POST', '/api/auth/signin', {
      statusCode: 200,
      body: { success: true, redirectUrl: '/' }
    }).as('signinRequest')

    cy.focused().type('{enter}')
    cy.wait('@signinRequest')
  })

  /**
   * Security Test: Password Field Type
   *
   * Scenario: Password input should be masked
   * Expected: Input type="password", with optional show/hide toggle
   */
  it('should mask password input for security', () => {
    // Password field should be type="password"
    cy.get('[data-testid="password-input"]')
      .should('have.attr', 'type', 'password')
      .should('have.attr', 'autocomplete', 'current-password')

    // Type password - should not be visible
    cy.get('[data-testid="password-input"]').type(testUser.password)

    // Password value should be masked in DOM
    cy.get('[data-testid="password-input"]')
      .invoke('val')
      .should('equal', testUser.password)
      .then((val) => {
        // Visual representation should be masked (dots/asterisks)
        // This is browser-controlled, we just verify type=password
        expect(val).to.equal(testUser.password)
      })

    // Optional: Check for show/hide password toggle if implemented
    cy.get('[data-testid="toggle-password-visibility"]').then(($toggle) => {
      if ($toggle.length) {
        cy.wrap($toggle).click()
        cy.get('[data-testid="password-input"]')
          .should('have.attr', 'type', 'text')
      }
    })
  })
})

/**
 * Advanced Email Auth Scenarios
 * Edge cases and security considerations
 */
describe('Email Authentication - Advanced Scenarios', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'ValidPassword123!'
  }

  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.visit('/auth/signin')
  })

  it('should prevent CSRF attacks with token validation', () => {
    // Mock API that validates CSRF token
    cy.intercept('POST', '/api/auth/signin', (req) => {
      const csrfToken = req.headers['x-csrf-token']

      if (!csrfToken) {
        req.reply({
          statusCode: 403,
          body: { error: 'CSRF token missing' }
        })
      } else {
        req.reply({
          statusCode: 200,
          body: { success: true, redirectUrl: '/' }
        })
      }
    }).as('csrfCheck')

    // Form should include CSRF token
    cy.get('[data-testid="email-signin-form"]')
      .should('have.attr', 'data-csrf-token')

    cy.get('[data-testid="email-input"]').type(testUser.email)
    cy.get('[data-testid="password-input"]').type(testUser.password)
    cy.get('[data-testid="signin-button"]').click()

    cy.wait('@csrfCheck')
  })

  it('should handle network errors gracefully', () => {
    cy.intercept('POST', '/api/auth/signin', {
      forceNetworkError: true
    }).as('networkError')

    cy.get('[data-testid="email-input"]').type(testUser.email)
    cy.get('[data-testid="password-input"]').type(testUser.password)
    cy.get('[data-testid="signin-button"]').click()

    // Should show network error message
    cy.get('[data-testid="signin-error"]')
      .should('be.visible')
      .should('contain.text', 'Network error')
      .or('contain.text', 'Unable to connect')
  })

  it('should clear sensitive data on signout', () => {
    // Sign in first
    cy.intercept('POST', '/api/auth/signin', {
      statusCode: 200,
      body: { success: true, redirectUrl: '/' }
    })

    cy.get('[data-testid="email-input"]').type(testUser.email)
    cy.get('[data-testid="password-input"]').type(testUser.password)
    cy.get('[data-testid="signin-button"]').click()

    cy.url().should('eq', Cypress.config().baseUrl + '/')

    // Sign out
    cy.intercept('POST', '/api/auth/signout', {
      statusCode: 200,
      body: { success: true }
    })

    cy.get('[data-testid="signout-button"]').click()

    // Verify all auth data cleared
    cy.window().then((win) => {
      // No auth tokens
      expect(win.localStorage.getItem('supabase.auth.token')).to.be.null
      expect(win.sessionStorage.length).to.equal(0)

      // No sensitive cookies
      cy.getCookie('sb-access-token').should('not.exist')
      cy.getCookie('sb-refresh-token').should('not.exist')
    })
  })
})
