// cypress/e2e/session-navigation-fix.cy.ts

describe('Session Navigation - Placeholder Handling (Issue #3)', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.get('input[type="email"]').type('troy@k4jda.com')
    cy.get('input[type="password"]').type('Edw@rd67')
    cy.contains('Sign In').click()
    cy.url().should('not.include', '/auth/signin')

    // Navigate to Session History
    cy.contains('Session History').click()
  })

  it('should show "coming soon" toast when clicking session card', () => {
    // Verify sessions are listed
    cy.get('[data-testid="session-card"]').should('have.length.greaterThan', 0)

    // Click first session card
    cy.get('[data-testid="session-card"]').first().click()

    // Verify toast appears immediately (no 5-second timeout)
    cy.contains('Session details view coming soon', { timeout: 1000 }).should('be.visible')

    // Verify no navigation occurred (still on history page)
    cy.url().should('include', '/history')

    // Verify no error or timeout
    cy.contains('timeout', { matchCase: false }).should('not.exist')
  })

  it('should not timeout or hang when clicking multiple cards', () => {
    // Click multiple cards in succession
    cy.get('[data-testid="session-card"]').eq(0).click()
    cy.contains('Session details view coming soon').should('be.visible')

    cy.get('[data-testid="session-card"]').eq(1).click()
    cy.contains('Session details view coming soon').should('be.visible')

    // Verify page remains responsive (no hanging)
    cy.contains('Session History').should('be.visible')
  })
})
