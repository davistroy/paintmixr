/**
 * Cypress E2E Test: T014 - About Dialog and Logout Functionality
 * Feature: 009-add-hamburger-menu
 * Phase: 3.2 TDD Tests
 *
 * Tests About dialog and logout features:
 * - Scenario 7: About dialog display (version, release date, developers, GitHub link)
 * - Scenario 8: Logout flow (signOut, redirect to /auth/signin)
 *
 * Expected: FAIL initially - AboutDialog and LogoutButton components don't exist yet (TDD approach)
 *
 * Dependencies: AboutDialog component, LogoutButton component, Supabase auth
 */

describe('T014: About Dialog and Logout Functionality', () => {
  beforeEach(() => {
    // Clear any existing state
    cy.clearCookies()
    cy.clearLocalStorage()

    // Intercept Supabase auth endpoints before visiting
    cy.intercept('POST', '**/auth/v1/logout*', {
      statusCode: 204
    }).as('signOut')

    cy.intercept('GET', '/api/auth/user', {
      statusCode: 200,
      body: {
        id: 'user-123',
        email: 'test@example.com'
      }
    }).as('getUser')

    // Visit page first
    cy.visit('/')

    // Mock authentication after page load
    cy.window().then((win) => {
      win.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'user-123', email: 'test@example.com' }
      }))
    })

    // Wait for page to be ready
    cy.get('body').should('be.visible')
  })

  /**
   * Scenario 7: About Dialog Display
   *
   * Verifies:
   * - About dialog opens from hamburger menu
   * - Dialog displays all 4 metadata fields (version, release date, developers, GitHub URL)
   * - GitHub link is clickable and opens in new tab
   * - Dialog closes on ESC key and outside click
   * - Hamburger menu is hidden while dialog is open
   */
  describe('Scenario 7: About Dialog Display', () => {
    it('should open About dialog when menu item is clicked', () => {
      // Open hamburger menu
      cy.get('[data-testid="hamburger-menu-icon"]').click()

      // Click "About" menu item
      cy.get('[data-testid="menu-item-about"]').click()

      // Verify About dialog opens
      cy.get('[data-testid="about-dialog"]')
        .should('be.visible')

      // Verify dialog has title
      cy.get('[data-testid="about-dialog-title"]')
        .should('be.visible')
        .and('contain.text', 'About')
    })

    it('should display version number from package.json', () => {
      // Open About dialog
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()

      // Verify version field is displayed
      cy.get('[data-testid="about-version"]')
        .should('be.visible')

      // Verify version label
      cy.get('[data-testid="about-version-label"]')
        .should('be.visible')
        .and('contain.text', 'Version')

      // Verify version value (should match package.json)
      cy.get('[data-testid="about-version-value"]')
        .should('be.visible')
        .and('match', /^\d+\.\d+\.\d+$/) // Semantic version format (e.g., "1.2.3")
        .and('not.contain', 'Unknown')
        .and('not.contain', 'undefined')
    })

    it('should display release date', () => {
      // Open About dialog
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()

      // Verify release date field
      cy.get('[data-testid="about-release-date"]')
        .should('be.visible')

      // Verify release date label
      cy.get('[data-testid="about-release-date-label"]')
        .should('be.visible')
        .and('contain.text', 'Release Date')

      // Verify release date value (ISO date format)
      cy.get('[data-testid="about-release-date-value"]')
        .should('be.visible')
        .and('match', /^\d{4}-\d{2}-\d{2}$/) // ISO date format (e.g., "2025-10-05")
    })

    it('should display developer credits', () => {
      // Open About dialog
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()

      // Verify developers field
      cy.get('[data-testid="about-developers"]')
        .should('be.visible')

      // Verify developers label
      cy.get('[data-testid="about-developers-label"]')
        .should('be.visible')
        .and('contain.text', 'Developers')

      // Verify developers value (should be a list or comma-separated names)
      cy.get('[data-testid="about-developers-value"]')
        .should('be.visible')
        .and('not.be.empty')
    })

    it('should display GitHub repository link', () => {
      // Open About dialog
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()

      // Verify GitHub field
      cy.get('[data-testid="about-github"]')
        .should('be.visible')

      // Verify GitHub label
      cy.get('[data-testid="about-github-label"]')
        .should('be.visible')
        .and('contain.text', 'GitHub')

      // Verify GitHub link
      cy.get('[data-testid="about-github-link"]')
        .should('be.visible')
        .and('have.attr', 'href')
        .and('match', /^https:\/\/github\.com\//) // GitHub URL format
    })

    it('should open GitHub link in new tab', () => {
      // Open About dialog
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()

      // Verify link has target="_blank"
      cy.get('[data-testid="about-github-link"]')
        .should('have.attr', 'target', '_blank')

      // Verify link has rel="noopener noreferrer" for security
      cy.get('[data-testid="about-github-link"]')
        .should('have.attr', 'rel')
        .and('include', 'noopener')
        .and('include', 'noreferrer')
    })

    it('should close dialog on ESC key press', () => {
      // Open About dialog
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()
      cy.get('[data-testid="about-dialog"]').should('be.visible')

      // Press ESC key
      cy.get('body').type('{esc}')

      // Verify dialog closes
      cy.get('[data-testid="about-dialog"]').should('not.exist')
    })

    it('should close dialog on outside click', () => {
      // Open About dialog
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()
      cy.get('[data-testid="about-dialog"]').should('be.visible')

      // Click outside dialog (on overlay)
      cy.get('[data-testid="about-dialog-overlay"]').click('topLeft')

      // Verify dialog closes
      cy.get('[data-testid="about-dialog"]').should('not.exist')
    })

    it('should close dialog on close button click', () => {
      // Open About dialog
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()
      cy.get('[data-testid="about-dialog"]').should('be.visible')

      // Click close button
      cy.get('[data-testid="about-dialog-close"]').click()

      // Verify dialog closes
      cy.get('[data-testid="about-dialog"]').should('not.exist')
    })

    it('should hide hamburger menu while dialog is open', () => {
      // Verify hamburger icon is visible
      cy.get('[data-testid="hamburger-menu-icon"]').should('be.visible')

      // Open About dialog
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()
      cy.get('[data-testid="about-dialog"]').should('be.visible')

      // Verify hamburger icon is hidden
      cy.get('[data-testid="hamburger-menu-icon"]').should('not.be.visible')
    })

    it('should show hamburger menu when dialog closes', () => {
      // Open and close About dialog
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()
      cy.get('[data-testid="about-dialog"]').should('be.visible')
      cy.get('[data-testid="hamburger-menu-icon"]').should('not.be.visible')

      // Close dialog
      cy.get('body').type('{esc}')
      cy.get('[data-testid="about-dialog"]').should('not.exist')

      // Verify hamburger icon reappears
      cy.get('[data-testid="hamburger-menu-icon"]').should('be.visible')
    })

    it('should display all 4 metadata fields simultaneously', () => {
      // Open About dialog
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()

      // Verify all 4 fields are visible at the same time
      cy.get('[data-testid="about-version"]').should('be.visible')
      cy.get('[data-testid="about-release-date"]').should('be.visible')
      cy.get('[data-testid="about-developers"]').should('be.visible')
      cy.get('[data-testid="about-github"]').should('be.visible')
    })
  })

  /**
   * Scenario 8: Logout Flow
   *
   * Verifies:
   * - Logout menu item calls supabase.auth.signOut()
   * - Session cookie is cleared
   * - User is redirected to /auth/signin
   * - Protected routes are inaccessible after logout
   * - Loading spinner shows during async operation
   */
  describe('Scenario 8: Logout Flow', () => {
    it('should show loading state when logout is clicked', () => {
      // Intercept signOut API call with delay
      cy.intercept('POST', '**/auth/v1/logout*', (req) => {
        req.reply({
          statusCode: 204,
          delay: 500 // Add delay to observe loading state
        })
      }).as('signOut')

      // Open hamburger menu
      cy.get('[data-testid="hamburger-menu-icon"]').click()

      // Click Logout
      cy.get('[data-testid="menu-item-logout"]').click()

      // Verify loading spinner appears
      cy.get('[data-testid="logout-loading"]')
        .should('be.visible')

      // Wait for signOut to complete
      cy.wait('@signOut')
    })

    it('should call supabase.auth.signOut() when logout clicked', () => {
      // Intercept signOut API call
      cy.intercept('POST', '**/auth/v1/logout*', {
        statusCode: 204
      }).as('signOut')

      // Open hamburger menu
      cy.get('[data-testid="hamburger-menu-icon"]').click()

      // Click Logout
      cy.get('[data-testid="menu-item-logout"]').click()

      // Verify signOut was called
      cy.wait('@signOut').its('request.method').should('equal', 'POST')
    })

    it('should redirect to /auth/signin after successful logout', () => {
      // Intercept signOut API call
      cy.intercept('POST', '**/auth/v1/logout*', {
        statusCode: 204
      }).as('signOut')

      // Open hamburger menu and click Logout
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-logout"]').click()

      // Wait for signOut to complete
      cy.wait('@signOut')

      // Verify redirect to signin page
      cy.url().should('include', '/auth/signin')
    })

    it('should clear authentication session on logout', () => {
      // Intercept signOut API call
      cy.intercept('POST', '**/auth/v1/logout*', {
        statusCode: 204
      }).as('signOut')

      // Verify user is authenticated initially
      cy.window().then((win) => {
        const authToken = win.localStorage.getItem('supabase.auth.token')
        expect(authToken).to.not.be.null
      })

      // Logout
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-logout"]').click()
      cy.wait('@signOut')

      // Verify auth token is cleared
      cy.window().then((win) => {
        const authToken = win.localStorage.getItem('supabase.auth.token')
        expect(authToken).to.be.null
      })
    })

    it('should clear session cookies on logout', () => {
      // Intercept signOut API call
      cy.intercept('POST', '**/auth/v1/logout*', {
        statusCode: 204
      }).as('signOut')

      // Logout
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-logout"]').click()
      cy.wait('@signOut')

      // Verify auth cookies are cleared
      cy.getCookies().should('have.length', 0)
    })

    it('should redirect to signin even if signOut API fails', () => {
      // Intercept signOut API call with error
      cy.intercept('POST', '**/auth/v1/logout*', {
        statusCode: 500,
        body: { error: 'Internal Server Error' }
      }).as('signOutError')

      // Open hamburger menu and click Logout
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-logout"]').click()

      // Wait for signOut to fail
      cy.wait('@signOutError')

      // Verify redirect to signin page (even with error)
      cy.url().should('include', '/auth/signin')
    })

    it('should make protected routes inaccessible after logout', () => {
      // Intercept signOut API call
      cy.intercept('POST', '**/auth/v1/logout*', {
        statusCode: 204
      }).as('signOut')

      // Logout
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-logout"]').click()
      cy.wait('@signOut')
      cy.url().should('include', '/auth/signin')

      // Try to access protected route
      cy.visit('/')

      // Should redirect back to signin
      cy.url().should('include', '/auth/signin')
    })

    it('should complete logout flow within 1 second', () => {
      // Intercept signOut API call
      cy.intercept('POST', '**/auth/v1/logout*', {
        statusCode: 204
      }).as('signOut')

      const startTime = Date.now()

      // Logout
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-logout"]').click()
      cy.wait('@signOut')
      cy.url().should('include', '/auth/signin')

      cy.then(() => {
        const duration = Date.now() - startTime
        expect(duration).to.be.lessThan(1000)
        cy.log(`Logout duration: ${duration}ms`)
      })
    })

    it('should close hamburger menu immediately when logout is clicked', () => {
      // Open hamburger menu
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="hamburger-menu-dropdown"]').should('be.visible')

      // Intercept signOut API call with delay
      cy.intercept('POST', '**/auth/v1/logout*', {
        statusCode: 204,
        delay: 500
      }).as('signOut')

      // Click Logout
      cy.get('[data-testid="menu-item-logout"]').click()

      // Verify menu closes immediately (doesn't wait for API)
      cy.get('[data-testid="hamburger-menu-dropdown"]').should('not.exist')
    })
  })

  /**
   * Additional Tests: Integration
   */
  describe('Integration Tests', () => {
    it('should navigate from About dialog back to homepage after closing', () => {
      // Open About dialog
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()
      cy.get('[data-testid="about-dialog"]').should('be.visible')

      // Close dialog
      cy.get('body').type('{esc}')

      // Verify still on homepage
      cy.url().should('not.include', '/about')
      cy.url().should('not.include', '/sessions')
    })

    it('should allow opening About dialog multiple times', () => {
      // Cycle 1: Open and close
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()
      cy.get('[data-testid="about-dialog"]').should('be.visible')
      cy.get('body').type('{esc}')
      cy.get('[data-testid="about-dialog"]').should('not.exist')

      // Cycle 2: Open and close again
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()
      cy.get('[data-testid="about-dialog"]').should('be.visible')
      cy.get('[data-testid="about-dialog-close"]').click()
      cy.get('[data-testid="about-dialog"]').should('not.exist')

      // Cycle 3: Open and close with outside click
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()
      cy.get('[data-testid="about-dialog"]').should('be.visible')
    })

    it('should prevent interaction with page content while About dialog is open', () => {
      // Open About dialog
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()
      cy.get('[data-testid="about-dialog"]').should('be.visible')

      // Try to click hamburger icon (should not be clickable)
      cy.get('[data-testid="hamburger-menu-icon"]').should('not.be.visible')

      // Try to click other page elements (should be blocked by overlay)
      cy.get('[data-testid="calculate-button"]').should('not.be.visible')
    })
  })

  /**
   * Additional Tests: Accessibility
   */
  describe('Accessibility', () => {
    it('should have proper ARIA attributes on About dialog', () => {
      // Open About dialog
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()

      // Verify ARIA attributes
      cy.get('[data-testid="about-dialog"]')
        .should('have.attr', 'role', 'dialog')
        .and('have.attr', 'aria-labelledby', 'about-dialog-title')
        .and('have.attr', 'aria-modal', 'true')
    })

    it('should trap focus within About dialog when open', () => {
      // Open About dialog
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()
      cy.get('[data-testid="about-dialog"]').should('be.visible')

      // Tab through dialog elements
      cy.get('body').tab()
      cy.focused().should('be.within', '[data-testid="about-dialog"]')

      cy.get('body').tab()
      cy.focused().should('be.within', '[data-testid="about-dialog"]')

      // Focus should cycle back to first focusable element
      cy.get('body').tab()
      cy.focused().should('be.within', '[data-testid="about-dialog"]')
    })

    it('should restore focus to hamburger icon after closing About dialog', () => {
      // Open About dialog from hamburger menu
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()
      cy.get('[data-testid="about-dialog"]').should('be.visible')

      // Close dialog with ESC
      cy.get('body').type('{esc}')

      // Verify focus returns to hamburger icon
      cy.focused().should('have.attr', 'data-testid', 'hamburger-menu-icon')
    })

    it('should have proper ARIA label on Logout button', () => {
      // Open hamburger menu
      cy.get('[data-testid="hamburger-menu-icon"]').click()

      // Verify Logout menu item has ARIA label
      cy.get('[data-testid="menu-item-logout"]')
        .should('have.attr', 'aria-label')
        .and('contain', 'Logout')
    })

    it('should announce logout loading state to screen readers', () => {
      // Intercept signOut with delay
      cy.intercept('POST', '**/auth/v1/logout*', {
        statusCode: 204,
        delay: 500
      }).as('signOut')

      // Logout
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-logout"]').click()

      // Verify loading state has ARIA live region
      cy.get('[data-testid="logout-loading"]')
        .should('have.attr', 'aria-live', 'polite')
        .and('have.attr', 'aria-busy', 'true')
    })
  })

  /**
   * Additional Tests: Error Handling
   */
  describe('Error Handling', () => {
    it('should handle missing package.json gracefully', () => {
      // Mock missing version (simulate error in app metadata)
      cy.intercept('GET', '/api/app-metadata', {
        statusCode: 200,
        body: {
          version: null,
          releaseDate: '2025-10-05',
          developers: ['Developer'],
          githubUrl: 'https://github.com/user/paintmixr'
        }
      }).as('getMetadata')

      // Open About dialog
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-about"]').click()

      // Verify fallback value is shown
      cy.get('[data-testid="about-version-value"]')
        .should('contain', 'Unknown')
        .or('contain', 'N/A')
    })

    it('should handle logout API timeout gracefully', () => {
      // Intercept signOut with timeout
      cy.intercept('POST', '**/auth/v1/logout*', {
        statusCode: 408,
        body: { error: 'Request Timeout' }
      }).as('signOutTimeout')

      // Logout
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-logout"]').click()
      cy.wait('@signOutTimeout')

      // Verify redirect still happens (graceful degradation)
      cy.url().should('include', '/auth/signin')
    })

    it('should handle logout network error gracefully', () => {
      // Intercept signOut with network error
      cy.intercept('POST', '**/auth/v1/logout*', {
        forceNetworkError: true
      }).as('signOutNetworkError')

      // Logout
      cy.get('[data-testid="hamburger-menu-icon"]').click()
      cy.get('[data-testid="menu-item-logout"]').click()

      // Verify redirect still happens
      cy.url().should('include', '/auth/signin')
    })
  })
})
