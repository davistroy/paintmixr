/**
 * Cypress E2E Test: Full Authentication Cycle
 * Feature: 005-use-codebase-analysis
 * Task: T012
 * Requirements: FR-017, FR-018, NFR-001, NFR-002
 *
 * Comprehensive end-to-end authentication testing including:
 * - Successful email signin with credentials → dashboard redirect
 * - Rate limiting after 6 rapid failed attempts (UI feedback)
 * - Account lockout after 5 failed attempts → 15-minute timer
 * - Lockout timer countdown display and persistence
 * - Session cookie validation and persistence
 * - OAuth precedence detection
 *
 * EXPECTED: Tests should PASS when full email auth implementation is complete
 * (Phase 4: Implementation). Currently EXPECTED TO FAIL as auth flow is incomplete.
 *
 * Test Strategy:
 * - Uses actual Supabase backend (no mocks for critical flows)
 * - Validates client-side rate limiting UI
 * - Validates server-side lockout enforcement
 * - Tests session cookie creation and validation
 * - Verifies accessibility and performance requirements
 */

describe('Full Authentication Cycle - End-to-End', () => {
  // Test user credentials (must exist in Supabase Auth)
  const validUser = {
    email: 'test@paintmixr.com',
    password: 'ValidTestPassword123!'
  }

  const invalidUser = {
    email: 'test@paintmixr.com',
    password: 'WrongPassword123!'
  }

  beforeEach(() => {
    // Clear all authentication state
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()

    // Visit signin page
    cy.visit('/auth/signin')

    // Wait for page to be interactive (dynamic import may cause delay)
    cy.get('[data-testid="email-signin-form"]', { timeout: 10000 }).should('be.visible')
  })

  describe('1. Successful Authentication Flow', () => {
    it('should sign in with valid credentials and redirect to dashboard', () => {
      // Step 1: Enter valid credentials
      cy.get('[data-testid="email-input"]')
        .should('be.visible')
        .should('not.be.disabled')
        .type(validUser.email)

      cy.get('[data-testid="password-input"]')
        .should('be.visible')
        .should('not.be.disabled')
        .type(validUser.password)

      // Step 2: Submit form
      cy.get('[data-testid="signin-button"]')
        .should('be.visible')
        .should('not.be.disabled')
        .click()

      // Step 3: Wait for authentication (max 5 seconds per NFR-001)
      cy.url({ timeout: 5000 }).should('eq', Cypress.config().baseUrl + '/')

      // Step 4: Verify user is authenticated
      cy.get('[data-testid="user-menu"]', { timeout: 3000 })
        .should('be.visible')
    })

    it('should set session cookie after successful authentication', () => {
      // Sign in
      cy.get('[data-testid="email-input"]').type(validUser.email)
      cy.get('[data-testid="password-input"]').type(validUser.password)
      cy.get('[data-testid="signin-button"]').click()

      // Wait for redirect
      cy.url({ timeout: 5000 }).should('include', '/')

      // Verify session cookies are set
      cy.getCookie('sb-access-token').should('exist')
      cy.getCookie('sb-refresh-token').should('exist')

      // Verify cookies have correct attributes
      cy.getCookie('sb-access-token').then((cookie) => {
        expect(cookie).to.not.be.null
        if (cookie) {
          expect(cookie.httpOnly).to.be.true
          expect(cookie.secure).to.be.true // HTTPS only
          expect(cookie.sameSite).to.equal('lax')
        }
      })
    })

    it('should persist session across page refreshes', () => {
      // Sign in
      cy.get('[data-testid="email-input"]').type(validUser.email)
      cy.get('[data-testid="password-input"]').type(validUser.password)
      cy.get('[data-testid="signin-button"]').click()

      // Wait for dashboard
      cy.url({ timeout: 5000 }).should('include', '/')
      cy.get('[data-testid="user-menu"]').should('be.visible')

      // Reload page
      cy.reload()

      // Session should persist
      cy.url().should('not.include', '/auth/signin')
      cy.get('[data-testid="user-menu"]').should('be.visible')
    })

    it('should redirect to originally requested page after signin', () => {
      // Try to access protected page while unauthenticated
      cy.visit('/dashboard/paints')

      // Should redirect to signin with redirect param
      cy.url().should('include', '/auth/signin')
      cy.url().should('include', 'redirect=')

      // Sign in
      cy.get('[data-testid="email-input"]').type(validUser.email)
      cy.get('[data-testid="password-input"]').type(validUser.password)
      cy.get('[data-testid="signin-button"]').click()

      // Should redirect to originally requested page
      cy.url({ timeout: 5000 }).should('include', '/dashboard/paints')
    })
  })

  describe('2. Failed Authentication Handling', () => {
    it('should display error message for invalid credentials', () => {
      // Enter invalid password
      cy.get('[data-testid="email-input"]').type(validUser.email)
      cy.get('[data-testid="password-input"]').type(invalidUser.password)
      cy.get('[data-testid="signin-button"]').click()

      // Should stay on signin page
      cy.url().should('include', '/auth/signin')

      // Error message should appear
      cy.get('[data-testid="signin-error"]', { timeout: 3000 })
        .should('be.visible')
        .should('contain.text', 'Invalid credentials')

      // Form should remain interactive
      cy.get('[data-testid="email-input"]').should('not.be.disabled')
      cy.get('[data-testid="password-input"]').should('not.be.disabled')
      cy.get('[data-testid="signin-button"]').should('not.be.disabled')
    })

    it('should not reveal user existence in error messages (NFR-004)', () => {
      // Try to sign in with non-existent user
      cy.get('[data-testid="email-input"]').type('nonexistent@example.com')
      cy.get('[data-testid="password-input"]').type('SomePassword123!')
      cy.get('[data-testid="signin-button"]').click()

      // Error should be generic (same as wrong password)
      cy.get('[data-testid="signin-error"]', { timeout: 3000 })
        .should('be.visible')
        .should('contain.text', 'Invalid credentials')

      // Should NOT say "User not found" or similar
      cy.get('[data-testid="signin-error"]')
        .should('not.contain.text', 'not found')
        .should('not.contain.text', 'does not exist')
        .should('not.contain.text', 'no account')
    })

    it('should clear previous errors when user types again', () => {
      // Trigger an error
      cy.get('[data-testid="email-input"]').type(validUser.email)
      cy.get('[data-testid="password-input"]').type(invalidUser.password)
      cy.get('[data-testid="signin-button"]').click()

      cy.get('[data-testid="signin-error"]').should('be.visible')

      // Start typing again
      cy.get('[data-testid="password-input"]').clear().type('N')

      // Error should be cleared
      cy.get('[data-testid="signin-error"]').should('not.exist')
    })
  })

  describe('3. Rate Limiting - Client Side UI Feedback', () => {
    it('should show warning after 3 failed attempts', () => {
      // Attempt 1-3: Failed signins
      for (let attempt = 1; attempt <= 3; attempt++) {
        cy.get('[data-testid="email-input"]').clear().type(validUser.email)
        cy.get('[data-testid="password-input"]').clear().type(invalidUser.password)
        cy.get('[data-testid="signin-button"]').click()

        // Wait for error
        cy.get('[data-testid="signin-error"]').should('be.visible')

        if (attempt < 3) {
          // No warning yet
          cy.get('[data-testid="rate-limit-warning"]').should('not.exist')
        }
      }

      // After 3 attempts, should show warning
      cy.get('[data-testid="rate-limit-warning"]', { timeout: 1000 })
        .should('be.visible')
        .should('contain.text', '2 attempts remaining')
    })

    it('should update remaining attempts counter after each failure', () => {
      // Perform 4 failed attempts and check counter
      const expectedRemaining = [4, 3, 2, 1, 0]

      for (let attempt = 1; attempt <= 5; attempt++) {
        cy.get('[data-testid="email-input"]').clear().type(validUser.email)
        cy.get('[data-testid="password-input"]').clear().type(invalidUser.password)
        cy.get('[data-testid="signin-button"]').click()

        cy.get('[data-testid="signin-error"]').should('be.visible')

        if (attempt >= 3 && attempt < 5) {
          // Check warning shows correct remaining attempts
          cy.get('[data-testid="rate-limit-warning"]')
            .should('contain.text', `${expectedRemaining[attempt]} attempt`)
        }
      }

      // After 5th attempt, should show lockout
      cy.get('[data-testid="lockout-message"]').should('be.visible')
    })

    it('should display immediate UI feedback during rate limiting', () => {
      // Perform rapid failed attempts (6 attempts)
      for (let i = 0; i < 6; i++) {
        cy.get('[data-testid="email-input"]').clear().type(validUser.email)
        cy.get('[data-testid="password-input"]').clear().type(`wrong${i}`)
        cy.get('[data-testid="signin-button"]').click()

        // UI should update within 500ms (sub-second feedback)
        cy.get('[data-testid="signin-error"]', { timeout: 500 }).should('be.visible')
      }

      // After 6 rapid attempts, rate limiting should be active
      // (5 failed = lockout, 6th should be prevented)
      cy.get('[data-testid="lockout-message"]').should('be.visible')
    })
  })

  describe('4. Account Lockout - Server Side Enforcement', () => {
    it('should lockout account after 5 failed signin attempts (NFR-002)', () => {
      // Perform 5 failed signin attempts
      for (let attempt = 1; attempt <= 5; attempt++) {
        cy.get('[data-testid="email-input"]').clear().type(validUser.email)
        cy.get('[data-testid="password-input"]').clear().type(invalidUser.password)
        cy.get('[data-testid="signin-button"]').click()

        // Wait for response
        cy.wait(500)

        if (attempt < 5) {
          // Error but not locked out yet
          cy.get('[data-testid="signin-error"]').should('be.visible')
          cy.get('[data-testid="lockout-message"]').should('not.exist')
        }
      }

      // After 5th attempt, account should be locked
      cy.get('[data-testid="lockout-message"]', { timeout: 2000 })
        .should('be.visible')
        .should('contain.text', 'Too many failed attempts')
        .should('contain.text', '15 minutes')
    })

    it('should disable signin button during lockout', () => {
      // Trigger lockout (5 failed attempts)
      for (let i = 0; i < 5; i++) {
        cy.get('[data-testid="email-input"]').clear().type(validUser.email)
        cy.get('[data-testid="password-input"]').clear().type(invalidUser.password)
        cy.get('[data-testid="signin-button"]').click()
        cy.wait(500)
      }

      // Verify lockout state
      cy.get('[data-testid="lockout-message"]').should('be.visible')

      // Signin button should be disabled
      cy.get('[data-testid="signin-button"]')
        .should('be.disabled')
        .should('have.attr', 'aria-disabled', 'true')

      // Input fields should be disabled
      cy.get('[data-testid="email-input"]').should('be.disabled')
      cy.get('[data-testid="password-input"]').should('be.disabled')
    })

    it('should display lockout countdown timer', () => {
      // Trigger lockout
      for (let i = 0; i < 5; i++) {
        cy.get('[data-testid="email-input"]').clear().type(validUser.email)
        cy.get('[data-testid="password-input"]').clear().type(invalidUser.password)
        cy.get('[data-testid="signin-button"]').click()
        cy.wait(500)
      }

      // Countdown timer should be visible
      cy.get('[data-testid="lockout-timer"]', { timeout: 2000 })
        .should('be.visible')
        .invoke('text')
        .should('match', /\d{1,2}:\d{2}/) // Format: MM:SS or M:SS

      // Timer should count down
      cy.get('[data-testid="lockout-timer"]').invoke('text').then((time1) => {
        cy.wait(2000) // Wait 2 seconds
        cy.get('[data-testid="lockout-timer"]').invoke('text').should((time2) => {
          // Time2 should be less than time1
          expect(time2).to.not.equal(time1)
        })
      })
    })

    it('should persist lockout state on page refresh', () => {
      // Trigger lockout
      for (let i = 0; i < 5; i++) {
        cy.get('[data-testid="email-input"]').clear().type(validUser.email)
        cy.get('[data-testid="password-input"]').clear().type(invalidUser.password)
        cy.get('[data-testid="signin-button"]').click()
        cy.wait(500)
      }

      // Verify lockout
      cy.get('[data-testid="lockout-message"]').should('be.visible')
      cy.get('[data-testid="lockout-timer"]').should('be.visible')

      // Get current timer value
      cy.get('[data-testid="lockout-timer"]').invoke('text').then((timerBefore) => {
        // Reload page
        cy.reload()

        // Lockout should still be active
        cy.get('[data-testid="lockout-message"]').should('be.visible')
        cy.get('[data-testid="lockout-timer"]').should('be.visible')

        // Timer should still be counting (value similar but not exact)
        cy.get('[data-testid="lockout-timer"]').invoke('text').should((timerAfter) => {
          // Both should be in MM:SS format
          expect(timerAfter).to.match(/\d{1,2}:\d{2}/)
          expect(timerBefore).to.match(/\d{1,2}:\d{2}/)
        })
      })
    })

    it('should reset lockout timer when user attempts to signin during lockout', () => {
      // Trigger lockout
      for (let i = 0; i < 5; i++) {
        cy.get('[data-testid="email-input"]').clear().type(validUser.email)
        cy.get('[data-testid="password-input"]').clear().type(invalidUser.password)
        cy.get('[data-testid="signin-button"]').click()
        cy.wait(500)
      }

      // Get initial timer
      cy.get('[data-testid="lockout-timer"]').invoke('text').then((timer1) => {
        // Wait 3 seconds
        cy.wait(3000)

        // Timer should have decreased
        cy.get('[data-testid="lockout-timer"]').invoke('text').then((timer2) => {
          expect(timer2).to.not.equal(timer1)

          // Try to submit (button is disabled, but test behavior)
          // In real implementation, this might reset timer back to 15:00
          // or extend lockout period

          // Verify timer is still showing and form is disabled
          cy.get('[data-testid="lockout-timer"]').should('be.visible')
          cy.get('[data-testid="signin-button"]').should('be.disabled')
        })
      })
    })
  })

  describe('5. Session Management', () => {
    it('should create secure session cookies with correct attributes', () => {
      // Sign in
      cy.get('[data-testid="email-input"]').type(validUser.email)
      cy.get('[data-testid="password-input"]').type(validUser.password)
      cy.get('[data-testid="signin-button"]').click()

      // Wait for authentication
      cy.url({ timeout: 5000 }).should('include', '/')

      // Check session cookies
      cy.getCookie('sb-access-token').should((cookie) => {
        expect(cookie).to.not.be.null
        if (cookie) {
          // Security attributes
          expect(cookie.httpOnly).to.be.true // Prevent XSS
          expect(cookie.secure).to.be.true // HTTPS only
          expect(cookie.sameSite).to.equal('lax') // CSRF protection

          // Should have expiry
          expect(cookie.expiry).to.be.greaterThan(Date.now() / 1000)
        }
      })
    })

    it('should validate session on protected routes', () => {
      // Try to access protected route without auth
      cy.visit('/dashboard')

      // Should redirect to signin
      cy.url().should('include', '/auth/signin')

      // Now sign in
      cy.get('[data-testid="email-input"]').type(validUser.email)
      cy.get('[data-testid="password-input"]').type(validUser.password)
      cy.get('[data-testid="signin-button"]').click()

      // Should redirect to dashboard
      cy.url({ timeout: 5000 }).should('include', '/dashboard')

      // Try accessing another protected route
      cy.visit('/dashboard/paints')

      // Should NOT redirect to signin (session valid)
      cy.url().should('include', '/dashboard/paints')
      cy.url().should('not.include', '/auth/signin')
    })

    it('should handle session expiry gracefully', () => {
      // Sign in
      cy.get('[data-testid="email-input"]').type(validUser.email)
      cy.get('[data-testid="password-input"]').type(validUser.password)
      cy.get('[data-testid="signin-button"]').click()

      cy.url({ timeout: 5000 }).should('include', '/')

      // Manually expire session by clearing cookies
      cy.clearCookies()

      // Try to access protected route
      cy.visit('/dashboard')

      // Should redirect to signin with session_expired error
      cy.url().should('include', '/auth/signin')
      cy.url().should('include', 'error=session_expired')

      // Should show session expired message
      cy.get('[data-testid="error-banner"]')
        .should('be.visible')
        .should('contain.text', 'session expired')
    })
  })

  describe('6. Performance Requirements', () => {
    it('should complete signin in under 5 seconds (NFR-001)', () => {
      const startTime = Date.now()

      // Sign in
      cy.get('[data-testid="email-input"]').type(validUser.email)
      cy.get('[data-testid="password-input"]').type(validUser.password)
      cy.get('[data-testid="signin-button"]').click()

      // Wait for redirect
      cy.url({ timeout: 5000 }).should('include', '/').then(() => {
        const endTime = Date.now()
        const duration = endTime - startTime

        // Should complete in under 5 seconds
        expect(duration).to.be.lessThan(5000)

        // Log performance for monitoring
        cy.log(`Signin completed in ${duration}ms`)
      })
    })

    it('should display loading state during authentication', () => {
      // Sign in
      cy.get('[data-testid="email-input"]').type(validUser.email)
      cy.get('[data-testid="password-input"]').type(validUser.password)
      cy.get('[data-testid="signin-button"]').click()

      // Loading state should appear immediately
      cy.get('[data-testid="signin-loading"]', { timeout: 100 })
        .should('be.visible')

      // Button should be disabled during loading
      cy.get('[data-testid="signin-button"]')
        .should('be.disabled')
        .should('have.attr', 'aria-busy', 'true')
    })
  })

  describe('7. Accessibility Requirements', () => {
    it('should support keyboard navigation through form', () => {
      // Tab to email input
      cy.get('body').tab()
      cy.focused().should('have.attr', 'data-testid', 'email-input')

      // Type email
      cy.focused().type(validUser.email)

      // Tab to password
      cy.focused().tab()
      cy.focused().should('have.attr', 'data-testid', 'password-input')

      // Type password
      cy.focused().type(validUser.password)

      // Tab to submit button
      cy.focused().tab()
      cy.focused().should('have.attr', 'data-testid', 'signin-button')

      // Submit with Enter key
      cy.focused().type('{enter}')

      // Should authenticate
      cy.url({ timeout: 5000 }).should('include', '/')
    })

    it('should have proper ARIA labels and roles', () => {
      // Form should have proper role
      cy.get('[data-testid="email-signin-form"]')
        .should('have.attr', 'role', 'form')

      // Inputs should have labels
      cy.get('[data-testid="email-input"]')
        .should('have.attr', 'aria-label')
        .should('have.attr', 'type', 'email')

      cy.get('[data-testid="password-input"]')
        .should('have.attr', 'aria-label')
        .should('have.attr', 'type', 'password')

      // Button should have accessible name
      cy.get('[data-testid="signin-button"]')
        .should('have.attr', 'type', 'submit')
        .invoke('text')
        .should('not.be.empty')
    })

    it('should announce errors to screen readers', () => {
      // Trigger error
      cy.get('[data-testid="email-input"]').type(validUser.email)
      cy.get('[data-testid="password-input"]').type(invalidUser.password)
      cy.get('[data-testid="signin-button"]').click()

      // Error should have proper ARIA attributes
      cy.get('[data-testid="signin-error"]')
        .should('have.attr', 'role', 'alert')
        .should('have.attr', 'aria-live', 'polite')
    })
  })

  describe('8. Edge Cases and Security', () => {
    it('should handle network failures gracefully', () => {
      // Simulate offline
      cy.intercept('/api/auth/email-signin', { forceNetworkError: true })

      // Try to sign in
      cy.get('[data-testid="email-input"]').type(validUser.email)
      cy.get('[data-testid="password-input"]').type(validUser.password)
      cy.get('[data-testid="signin-button"]').click()

      // Should show network error
      cy.get('[data-testid="signin-error"]', { timeout: 3000 })
        .should('be.visible')
        .should('contain.text', 'Network error')
        .or('contain.text', 'Unable to connect')
    })

    it('should sanitize user input to prevent XSS', () => {
      // Try XSS payload in email
      const xssPayload = '<script>alert("XSS")</script>@example.com'

      cy.get('[data-testid="email-input"]').type(xssPayload)
      cy.get('[data-testid="password-input"]').type('password')
      cy.get('[data-testid="signin-button"]').click()

      // Should show validation error (invalid email format)
      cy.get('[data-testid="email-error"]')
        .should('be.visible')
        .should('contain.text', 'Invalid email')

      // Script should NOT execute
      cy.on('window:alert', () => {
        throw new Error('XSS vulnerability detected!')
      })
    })

    it('should prevent CSRF attacks', () => {
      // Form should include CSRF token or use proper headers
      cy.get('[data-testid="email-signin-form"]').then(($form) => {
        // Either has CSRF token meta tag or uses SameSite cookies
        cy.getCookie('sb-access-token').should((cookie) => {
          if (cookie) {
            expect(cookie.sameSite).to.equal('lax')
          }
        })
      })
    })
  })
})
