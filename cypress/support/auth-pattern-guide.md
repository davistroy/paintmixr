# Cypress E2E Authentication Pattern Guide

## Working Pattern (Use This!)

```typescript
beforeEach(() => {
  // Step 1: Clear existing state
  cy.clearCookies()
  cy.clearLocalStorage()

  // Step 2: Intercept auth endpoints BEFORE visiting page
  cy.intercept('GET', '/api/auth/user', {
    statusCode: 200,
    body: {
      id: 'user-123',
      email: 'test@example.com'
    }
  }).as('getUser')

  // Step 3: Visit page FIRST (before setting localStorage)
  cy.visit('/')

  // Step 4: Mock authentication AFTER page load
  cy.window().then((win) => {
    win.localStorage.setItem('supabase.auth.token', JSON.stringify({
      access_token: 'mock-token',
      user: { id: 'user-123', email: 'test@example.com' }
    }))
  })

  // Step 5: Wait for page to be ready
  cy.get('body').should('be.visible')
})
```

## Why This Order Matters

### ❌ WRONG (Causes Timeouts)
```typescript
beforeEach(() => {
  cy.clearCookies()
  cy.clearLocalStorage()

  // Setting localStorage BEFORE visiting
  cy.window().then((win) => {
    win.localStorage.setItem('supabase.auth.token', '...')
  })

  // Then visiting page
  cy.visit('/')

  // Result: Timeout! Window doesn't exist yet
})
```

### ✅ CORRECT
```typescript
beforeEach(() => {
  cy.clearCookies()
  cy.clearLocalStorage()

  // Visit FIRST to create window
  cy.visit('/')

  // THEN set localStorage
  cy.window().then((win) => {
    win.localStorage.setItem('supabase.auth.token', '...')
  })

  // Result: Success!
})
```

## Common Intercepts

### Basic Auth
```typescript
cy.intercept('GET', '/api/auth/user', {
  statusCode: 200,
  body: {
    id: 'user-123',
    email: 'test@example.com'
  }
}).as('getUser')
```

### Logout Flow
```typescript
cy.intercept('POST', '**/auth/v1/logout*', {
  statusCode: 204
}).as('signOut')
```

### Session Check
```typescript
cy.intercept('GET', '**/auth/v1/user*', {
  statusCode: 200,
  body: {
    user: {
      id: 'user-123',
      email: 'test@example.com'
    }
  }
}).as('getSession')
```

## LocalStorage Format

### Supabase Auth Token
```typescript
{
  access_token: 'mock-token',
  refresh_token: 'mock-refresh-token', // Optional
  expires_in: 3600, // Optional
  user: {
    id: 'user-123',
    email: 'test@example.com',
    // Add other user fields as needed
  }
}
```

## Working Examples

### Example 1: Basic Auth Test
```typescript
describe('My Feature Tests', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', '/api/auth/user', { /* ... */ }).as('getUser')
    cy.visit('/')
    cy.window().then((win) => {
      win.localStorage.setItem('supabase.auth.token', JSON.stringify({ /* ... */ }))
    })
    cy.get('body').should('be.visible')
  })

  it('should display user content', () => {
    cy.get('[data-testid="user-name"]').should('contain', 'test@example.com')
  })
})
```

### Example 2: Logout Test
```typescript
describe('Logout Tests', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()

    // Intercept BOTH auth endpoints
    cy.intercept('GET', '/api/auth/user', { /* ... */ }).as('getUser')
    cy.intercept('POST', '**/auth/v1/logout*', { statusCode: 204 }).as('signOut')

    cy.visit('/')
    cy.window().then((win) => {
      win.localStorage.setItem('supabase.auth.token', JSON.stringify({ /* ... */ }))
    })
    cy.get('body').should('be.visible')
  })

  it('should logout successfully', () => {
    cy.get('[data-testid="logout-button"]').click()
    cy.wait('@signOut')
    cy.url().should('include', '/auth/signin')
  })
})
```

### Example 3: Protected Route Test
```typescript
describe('Protected Routes', () => {
  it('should redirect to signin when not authenticated', () => {
    cy.visit('/dashboard')
    cy.url().should('include', '/auth/signin')
  })

  it('should allow access when authenticated', () => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', '/api/auth/user', { /* ... */ }).as('getUser')
    cy.visit('/dashboard')
    cy.window().then((win) => {
      win.localStorage.setItem('supabase.auth.token', JSON.stringify({ /* ... */ }))
    })
    cy.get('[data-testid="dashboard-content"]').should('be.visible')
  })
})
```

## Troubleshooting

### Problem: Test times out waiting for element
**Solution:** Add wait for body to be ready
```typescript
cy.get('body').should('be.visible')
```

### Problem: "Cannot read property 'localStorage' of undefined"
**Solution:** Visit page BEFORE accessing window
```typescript
cy.visit('/')  // Must come first
cy.window().then((win) => { /* ... */ })
```

### Problem: Auth state not persisting
**Solution:** Set localStorage AFTER page load, not before
```typescript
cy.visit('/')  // First
cy.window().then((win) => {  // Then
  win.localStorage.setItem('supabase.auth.token', /* ... */)
})
```

### Problem: API calls return 401
**Solution:** Ensure intercept is set BEFORE visiting page
```typescript
cy.intercept('GET', '/api/auth/user', { /* ... */ }).as('getUser')  // First
cy.visit('/')  // Then
```

## Reference Files

### Working Example
- `cypress/e2e/hamburger-menu.cy.ts` - Fully working auth pattern

### Fixed Files
- `cypress/e2e/debug-mode.cy.ts` - Updated pattern
- `cypress/e2e/about-logout.cy.ts` - Updated pattern
- `cypress/e2e/accessibility.cy.ts` - Updated pattern
- `cypress/e2e/performance.cy.ts` - Updated pattern

### Custom Commands
- `cypress/support/commands.ts` - Reusable auth helper (cy.login())

## Best Practices

1. **Always use the same order:** Clear → Intercept → Visit → Mock → Wait
2. **Intercept early:** Set up intercepts before visiting page
3. **Wait for ready state:** Always wait for body or specific element
4. **Use test IDs:** Use `data-testid` for reliable element selection
5. **Mock minimal data:** Only include fields actually used by tests
6. **Clear state:** Always clear cookies and localStorage in beforeEach
7. **Document skips:** Add TODO comments for skipped tests

## Common Mistakes

❌ Setting localStorage before visiting page
❌ Not intercepting API endpoints
❌ Using wrong endpoint paths (`/auth/session` vs `/api/auth/user`)
❌ Not waiting for page to be ready
❌ Forgetting to clear state in beforeEach
❌ Missing data-testid attributes on elements

## Need Help?

See `/home/davistroy/dev/paintmixr/test-results/e2e-auth-fix-2025-10-05.md` for detailed fix documentation.
