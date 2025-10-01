/**
 * Cypress E2E Test: Account Merging by Email
 * Feature: 003-deploy-to-vercel
 * Task: T012
 *
 * Tests automatic account merging when user signs in with different OAuth providers
 * using the same email address. Verifies that:
 * - User data is preserved across providers
 * - Multiple identities link to same user_id
 * - Paint collections remain accessible
 * - Session works with any linked provider
 *
 * Expected: FAIL until T016-T025 implementation complete
 */

describe('Account Merging by Email', () => {
  const testEmail = 'test@example.com'
  const mockUserData = {
    email: testEmail,
    name: 'Test User',
    user_id: 'mock-user-id-12345'
  }

  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('should create new user on first Google sign-in', () => {
    // Mock successful Google OAuth
    cy.intercept('GET', '**/auth/v1/callback*', (req) => {
      req.reply({
        statusCode: 302,
        headers: {
          'Location': '/',
          'Set-Cookie': `sb-access-token=${btoa(JSON.stringify(mockUserData))}; HttpOnly`
        }
      })
    }).as('firstSignIn')

    cy.visit('/auth/signin')
    cy.get('[data-testid="signin-google"]').click()

    cy.wait('@firstSignIn')

    // Verify user is authenticated
    cy.url().should('eq', Cypress.config().baseUrl + '/')
    cy.get('[data-testid="user-menu"]').should('be.visible')
    cy.get('[data-testid="user-email"]').should('contain', testEmail)
  })

  it('should preserve user data when signing in with different provider (same email)', () => {
    // Step 1: Sign in with Google
    cy.setCookie('sb-access-token', btoa(JSON.stringify({
      ...mockUserData,
      provider: 'google'
    })))

    cy.visit('/')

    // Create some user data (paint collection)
    cy.get('[data-testid="add-paint-button"]').click()
    cy.get('[data-testid="paint-name-input"]').type('Test Paint')
    cy.get('[data-testid="save-paint-button"]').click()

    // Verify paint saved
    cy.get('[data-testid="paint-list"]')
      .should('contain', 'Test Paint')

    // Step 2: Sign out
    cy.get('[data-testid="signout-button"]').click()
    cy.url().should('include', '/auth/signin')

    // Step 3: Sign in with Microsoft (same email)
    cy.intercept('GET', '**/auth/v1/callback*', (req) => {
      req.reply({
        statusCode: 302,
        headers: {
          'Location': '/',
          'Set-Cookie': `sb-access-token=${btoa(JSON.stringify({
            ...mockUserData,
            provider: 'azure'
          }))}; HttpOnly`
        }
      })
    }).as('microsoftSignIn')

    cy.get('[data-testid="signin-microsoft"]').click()

    cy.wait('@microsoftSignIn')

    // Step 4: Verify paint collection is STILL accessible
    cy.visit('/')
    cy.get('[data-testid="paint-list"]')
      .should('contain', 'Test Paint')

    // Same user_id should be used
    cy.get('[data-testid="user-email"]').should('contain', testEmail)
  })

  it('should link multiple OAuth identities to same user', () => {
    // Verify database state (requires API or DB query)
    cy.request({
      method: 'GET',
      url: '/api/user/identities',
      headers: {
        'Cookie': `sb-access-token=${btoa(JSON.stringify(mockUserData))}`
      }
    }).then((response) => {
      expect(response.status).to.eq(200)

      // Should have multiple identities
      expect(response.body.identities).to.be.an('array')
      expect(response.body.identities.length).to.be.gte(2)

      // All identities should share same user_id
      const userIds = response.body.identities.map((i: any) => i.user_id)
      const uniqueUserIds = [...new Set(userIds)]
      expect(uniqueUserIds.length).to.eq(1)

      // Providers should include google and azure
      const providers = response.body.identities.map((i: any) => i.provider)
      expect(providers).to.include('google')
      expect(providers).to.include('azure')
    })
  })

  it('should allow sign-in with any linked provider', () => {
    // Sign in with Google
    cy.visit('/auth/signin')
    cy.get('[data-testid="signin-google"]').click()
    cy.url().should('eq', Cypress.config().baseUrl + '/')

    // Sign out
    cy.get('[data-testid="signout-button"]').click()

    // Sign in with Microsoft (same email)
    cy.get('[data-testid="signin-microsoft"]').click()
    cy.url().should('eq', Cypress.config().baseUrl + '/')

    // Sign out
    cy.get('[data-testid="signout-button"]').click()

    // Sign in with Facebook (same email)
    cy.get('[data-testid="signin-facebook"]').click()
    cy.url().should('eq', Cypress.config().baseUrl + '/')
  })

  it('should NOT merge accounts with different emails', () => {
    const email1 = 'user1@example.com'
    const email2 = 'user2@example.com'

    // Sign in with Google (email1)
    cy.intercept('GET', '**/auth/v1/callback*provider=google*', {
      statusCode: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': `sb-access-token=${btoa(JSON.stringify({
          email: email1,
          user_id: 'user-1-id'
        }))}; HttpOnly`
      }
    }).as('googleSignIn')

    cy.visit('/auth/signin')
    cy.get('[data-testid="signin-google"]').click()
    cy.wait('@googleSignIn')

    // Create paint for user1
    cy.get('[data-testid="add-paint-button"]').click()
    cy.get('[data-testid="paint-name-input"]').type('User1 Paint')
    cy.get('[data-testid="save-paint-button"]').click()

    // Sign out
    cy.get('[data-testid="signout-button"]').click()

    // Sign in with Microsoft (email2 - DIFFERENT)
    cy.intercept('GET', '**/auth/v1/callback*provider=azure*', {
      statusCode: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': `sb-access-token=${btoa(JSON.stringify({
          email: email2,
          user_id: 'user-2-id'
        }))}; HttpOnly`
      }
    }).as('microsoftSignIn')

    cy.get('[data-testid="signin-microsoft"]').click()
    cy.wait('@microsoftSignIn')

    // User2 should NOT see User1's paint
    cy.get('[data-testid="paint-list"]')
      .should('not.contain', 'User1 Paint')
  })

  it('should maintain separate paint collections for different users', () => {
    // User A: Sign in with Google
    cy.visit('/auth/signin')
    cy.setCookie('sb-access-token', btoa(JSON.stringify({
      email: 'userA@example.com',
      user_id: 'user-a-id'
    })))

    cy.visit('/')
    cy.get('[data-testid="add-paint-button"]').click()
    cy.get('[data-testid="paint-name-input"]').type('User A Paint')
    cy.get('[data-testid="save-paint-button"]').click()

    // Sign out
    cy.clearCookies()

    // User B: Sign in with Microsoft
    cy.setCookie('sb-access-token', btoa(JSON.stringify({
      email: 'userB@example.com',
      user_id: 'user-b-id'
    })))

    cy.visit('/')

    // User B should have empty collection
    cy.get('[data-testid="paint-list"]')
      .should('not.contain', 'User A Paint')
  })

  it('should show all linked providers in user settings', () => {
    // Mock user with multiple identities
    cy.setCookie('sb-access-token', btoa(JSON.stringify({
      email: testEmail,
      user_id: 'multi-provider-user',
      identities: [
        { provider: 'google', email: testEmail },
        { provider: 'azure', email: testEmail },
        { provider: 'facebook', email: testEmail }
      ]
    })))

    cy.visit('/settings/account')

    // Should display all linked providers
    cy.get('[data-testid="linked-providers"]')
      .should('contain', 'Google')
      .should('contain', 'Microsoft')
      .should('contain', 'Facebook')
  })
})

/**
 * Edge Cases for Account Merging
 */
describe('Account Merging Edge Cases', () => {
  it('should handle email case-insensitivity', () => {
    // Sign in with lowercase email
    cy.intercept('GET', '**/auth/v1/callback*provider=google*', {
      statusCode: 302,
      headers: {
        'Set-Cookie': `sb-access-token=${btoa(JSON.stringify({
          email: 'test@example.com',
          user_id: 'test-user'
        }))}; HttpOnly`
      }
    }).as('googleLower')

    cy.visit('/auth/signin')
    cy.get('[data-testid="signin-google"]').click()
    cy.wait('@googleLower')

    cy.get('[data-testid="signout-button"]').click()

    // Sign in with uppercase email (same address)
    cy.intercept('GET', '**/auth/v1/callback*provider=azure*', {
      statusCode: 302,
      headers: {
        'Set-Cookie': `sb-access-token=${btoa(JSON.stringify({
          email: 'TEST@EXAMPLE.COM',
          user_id: 'test-user'  // Same user_id
        }))}; HttpOnly`
      }
    }).as('microsoftUpper')

    cy.get('[data-testid="signin-microsoft"]').click()
    cy.wait('@microsoftUpper')

    // Should be same user (accounts merged)
    cy.get('[data-testid="user-email"]')
      .should('contain', 'test@example.com')
  })

  it('should handle rapid provider switching', () => {
    // Quickly sign in with different providers
    const providers = ['google', 'microsoft', 'facebook']

    providers.forEach((provider) => {
      cy.visit('/auth/signin')
      cy.get(`[data-testid="signin-${provider}"]`).click()
      cy.url().should('not.include', '/auth/signin')
      cy.get('[data-testid="signout-button"]').click()
    })

    // Should have no errors
    cy.get('[data-testid="error-message"]').should('not.exist')
  })

  it('should preserve user metadata across merges', () => {
    // Sign in with Google (includes profile data)
    cy.intercept('GET', '**/auth/v1/callback*provider=google*', {
      statusCode: 302,
      headers: {
        'Set-Cookie': `sb-access-token=${btoa(JSON.stringify({
          email: 'test@example.com',
          user_id: 'test-user',
          name: 'John Doe',
          avatar: 'https://example.com/avatar.jpg'
        }))}; HttpOnly`
      }
    }).as('googleMeta')

    cy.visit('/auth/signin')
    cy.get('[data-testid="signin-google"]').click()
    cy.wait('@googleMeta')

    // Verify profile data displayed
    cy.get('[data-testid="user-name"]').should('contain', 'John Doe')
    cy.get('[data-testid="user-avatar"]')
      .should('have.attr', 'src', 'https://example.com/avatar.jpg')

    cy.get('[data-testid="signout-button"]').click()

    // Sign in with Microsoft (may have different metadata)
    cy.intercept('GET', '**/auth/v1/callback*provider=azure*', {
      statusCode: 302,
      headers: {
        'Set-Cookie': `sb-access-token=${btoa(JSON.stringify({
          email: 'test@example.com',
          user_id: 'test-user',  // Same user
          name: 'John Doe',  // Preserved
          avatar: 'https://example.com/avatar.jpg'  // Preserved
        }))}; HttpOnly`
      }
    }).as('microsoftMeta')

    cy.get('[data-testid="signin-microsoft"]').click()
    cy.wait('@microsoftMeta')

    // Profile data should still be available
    cy.get('[data-testid="user-name"]').should('contain', 'John Doe')
  })
})

/**
 * Supabase Auth Identities Validation
 */
describe('Supabase Identities Table Verification', () => {
  it('should create identity record on first provider sign-in', () => {
    // This test verifies database state
    cy.visit('/auth/signin')
    cy.get('[data-testid="signin-google"]').click()

    // Query identities via API
    cy.request('/api/debug/identities').then((response) => {
      expect(response.body.identities).to.have.length(1)
      expect(response.body.identities[0].provider).to.eq('google')
    })
  })

  it('should add second identity record on provider merge', () => {
    // Sign in with Google first
    cy.visit('/auth/signin')
    cy.get('[data-testid="signin-google"]').click()
    cy.get('[data-testid="signout-button"]').click()

    // Sign in with Microsoft (same email)
    cy.get('[data-testid="signin-microsoft"]').click()

    // Query identities via API
    cy.request('/api/debug/identities').then((response) => {
      expect(response.body.identities).to.have.length(2)

      const providers = response.body.identities.map((i: any) => i.provider)
      expect(providers).to.include('google')
      expect(providers).to.include('azure')
    })
  })
})
