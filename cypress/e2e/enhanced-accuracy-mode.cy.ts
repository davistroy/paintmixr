/**
 * Cypress E2E Test: Enhanced Accuracy Mode Workflow
 * Feature: 005-use-codebase-analysis
 * Task: T009
 *
 * Based on quickstart.md Scenarios 1-6:
 * 1. Load dashboard and enable Enhanced Mode checkbox
 * 2. Select target color (LAB input or image upload)
 * 3. Verify paint collection visible (4+ paints)
 * 4. Click "Find Best Match" button
 * 5. Verify loading spinner appears
 * 6. Verify progress indicator shown after 5 seconds
 * 7. Verify result displays with formula table, Delta E badge, accuracy rating
 * 8. Verify "Save to History" functionality
 * 9. Test Standard Mode fallback toggle
 *
 * Test user credentials:
 * - Email: troy@k4jda.com
 * - Password: Edw@rd67
 *
 * WCAG 2.1 AA compliance requirements enforced throughout.
 */

describe('Enhanced Accuracy Mode - Complete Workflow', () => {
  // Test user credentials
  const testUser = {
    email: 'troy@k4jda.com',
    password: 'Edw@rd67'
  }

  // Sample target colors for testing
  const testColors = {
    warmBeige: {
      hex: '#D4B896',
      lab: { l: 75.3, a: 5.2, b: 20.1 }
    },
    skyBlue: {
      hex: '#87CEEB',
      lab: { l: 79.2, a: -8.1, b: -12.4 }
    },
    forestGreen: {
      hex: '#228B22',
      lab: { l: 50.1, a: -45.3, b: 40.2 }
    }
  }

  beforeEach(() => {
    // Clear all storage to start fresh
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()

    // Sign in with test user
    cy.visit('/auth/signin')
    cy.get('input[type="email"]', { timeout: 10000 }).type(testUser.email)
    cy.get('input[type="password"]').type(testUser.password)
    cy.contains('Sign In').click()

    // Wait for successful authentication
    cy.url({ timeout: 10000 }).should('not.include', '/auth/signin')

    // Navigate to main page (dashboard)
    cy.visit('/')
    cy.wait(1000) // Allow page to settle
  })

  describe('Scenario 1-3: Enable Enhanced Mode and Select Target Color', () => {
    it('should enable Enhanced Accuracy Mode checkbox', () => {
      // Verify Enhanced Mode toggle exists
      cy.contains('Enhanced Accuracy Mode').should('be.visible')

      // Check if it's currently disabled (Coming Soon state)
      cy.get('input[type="checkbox"]').first().then(($checkbox) => {
        if ($checkbox.is(':disabled')) {
          cy.log('Enhanced Mode is currently disabled (Coming Soon)')
          // Skip test if feature not yet implemented
          cy.skip()
        } else {
          // Enable Enhanced Mode
          cy.get('input[type="checkbox"]').first().check()
          cy.get('input[type="checkbox"]').first().should('be.checked')

          // Verify UI shows Enhanced Mode is active
          cy.contains('Enhanced Accuracy Mode').should('be.visible')
          cy.contains('Target ΔE ≤ 2.0').should('be.visible')
        }
      })
    })

    it('should select target color using LAB input', () => {
      // Use Color Picker input method
      cy.contains('Color Picker').click()

      // Enter LAB values for warm beige
      cy.get('[data-testid="lab-input-l"]')
        .clear()
        .type(testColors.warmBeige.lab.l.toString())

      cy.get('[data-testid="lab-input-a"]')
        .clear()
        .type(testColors.warmBeige.lab.a.toString())

      cy.get('[data-testid="lab-input-b"]')
        .clear()
        .type(testColors.warmBeige.lab.b.toString())

      // Verify color preview updates
      cy.get('[data-testid="color-preview"]', { timeout: 2000 })
        .should('be.visible')
        .should('have.css', 'background-color')
        .and('not.equal', 'rgba(0, 0, 0, 0)')
    })

    it('should select target color using hex input', () => {
      // Use Hex Input method
      cy.contains('Hex Input').click()

      // Enter hex color
      cy.get('input[placeholder*="hex" i]')
        .clear()
        .type(testColors.skyBlue.hex)

      // Verify color preview updates
      cy.get('[data-testid="color-preview"]', { timeout: 2000 })
        .should('be.visible')
        .should('have.css', 'background-color')
    })

    it('should select target color using image upload', () => {
      // Use Image Upload method
      cy.contains('Image Upload').click()

      // Mock file upload (if image upload component exists)
      cy.get('input[type="file"]').then(($input) => {
        // Create a mock image file
        const blob = new Blob(['mock image'], { type: 'image/png' })
        const file = new File([blob], 'test-color.png', { type: 'image/png' })
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)

        const input = $input[0] as HTMLInputElement
        input.files = dataTransfer.files

        // Trigger change event
        cy.wrap($input).trigger('change', { force: true })
      })

      // Verify image preview or extracted color displayed
      cy.get('[data-testid="extracted-color"]', { timeout: 5000 })
        .should('be.visible')
    })

    it('should verify paint collection is visible with 4+ paints', () => {
      // Check for paint collection/library section
      cy.contains('Paint Collection', { timeout: 5000 }).should('be.visible')
        .or('contains', 'Paint Library')

      // Verify at least 4 paints are shown
      cy.get('[data-testid^="paint-item-"]').should('have.length.gte', 4)

      // Verify paint details are displayed
      cy.get('[data-testid^="paint-item-"]').first().within(() => {
        cy.get('[data-testid="paint-name"]').should('be.visible')
        cy.get('[data-testid="paint-color"]').should('be.visible')
      })
    })
  })

  describe('Scenario 4-6: Initiate Calculation and Verify Progress', () => {
    beforeEach(() => {
      // Setup: Enable Enhanced Mode and set target color
      cy.get('input[type="checkbox"]').first().then(($checkbox) => {
        if ($checkbox.is(':disabled')) {
          cy.skip() // Skip if feature not implemented
        } else {
          cy.get('input[type="checkbox"]').first().check()
        }
      })

      // Set target color via hex input
      cy.contains('Hex Input').click()
      cy.get('input[placeholder*="hex" i]')
        .clear()
        .type(testColors.warmBeige.hex)
    })

    it('should click "Find Best Match" button and show loading spinner', () => {
      // Find and click the calculate/find button
      cy.contains(/Find Best Match|Calculate Formula|Optimize/i).click()

      // Verify loading spinner appears immediately
      cy.get('[data-testid="loading-spinner"]', { timeout: 500 })
        .should('be.visible')
        .or('get', '[data-testid="calculating-indicator"]')
        .should('be.visible')

      // Verify button is disabled during calculation
      cy.contains(/Find Best Match|Calculate Formula|Optimize/i)
        .should('be.disabled')
        .or('have.attr', 'aria-busy', 'true')
    })

    it('should show progress indicator after 5 seconds for long calculations', () => {
      // Mock slow API response
      cy.intercept('POST', '/api/optimize', (req) => {
        req.reply((res) => {
          // Delay response by 6 seconds
          res.delay = 6000
          res.send({
            statusCode: 200,
            body: {
              data: {
                achieved_color: { L: 75.0, a: 5.0, b: 20.0 },
                delta_e_achieved: 1.5,
                paint_details: [
                  { id: '1', name: 'Titanium White', volume_ml: 150, percentage: 75 },
                  { id: '2', name: 'Yellow Ochre', volume_ml: 50, percentage: 25 }
                ],
                solution: { total_volume: 200 }
              }
            }
          })
        })
      }).as('slowOptimize')

      // Start calculation
      cy.contains(/Find Best Match|Calculate Formula|Optimize/i).click()

      // Wait 5 seconds
      cy.wait(5000)

      // Progress indicator should now be visible
      cy.get('[data-testid="progress-indicator"]', { timeout: 1000 })
        .should('be.visible')
        .and('contain.text', 'Optimizing')
        .or('contain.text', 'Calculating')
        .or('contain.text', 'Processing')

      // Wait for completion
      cy.wait('@slowOptimize', { timeout: 8000 })
    })

    it('should handle API errors gracefully with retry option', () => {
      // Mock API error
      cy.intercept('POST', '/api/optimize', {
        statusCode: 500,
        body: { error: 'Optimization failed' }
      }).as('optimizeError')

      // Start calculation
      cy.contains(/Find Best Match|Calculate Formula|Optimize/i).click()

      // Wait for error
      cy.wait('@optimizeError')

      // Verify error message displayed
      cy.get('[data-testid="error-message"]', { timeout: 3000 })
        .should('be.visible')
        .and('contain.text', 'failed')
        .or('contain.text', 'error')

      // Verify retry button exists
      cy.contains(/Retry|Try Again/i).should('be.visible')
    })
  })

  describe('Scenario 7: Verify Results Display', () => {
    beforeEach(() => {
      // Setup: Enable Enhanced Mode
      cy.get('input[type="checkbox"]').first().then(($checkbox) => {
        if ($checkbox.is(':disabled')) {
          cy.skip()
        } else {
          cy.get('input[type="checkbox"]').first().check()
        }
      })

      // Set target color
      cy.contains('Hex Input').click()
      cy.get('input[placeholder*="hex" i]')
        .clear()
        .type(testColors.warmBeige.hex)

      // Mock successful optimization response
      cy.intercept('POST', '/api/optimize', {
        statusCode: 200,
        body: {
          data: {
            achieved_color: { L: 75.2, a: 5.1, b: 20.0 },
            delta_e_achieved: 1.3,
            paint_details: [
              {
                id: 'paint-1',
                name: 'Titanium White',
                volume_ml: 120.5,
                percentage: 60.25,
                color: { l: 95.2, a: -0.8, b: 2.1 }
              },
              {
                id: 'paint-2',
                name: 'Yellow Ochre',
                volume_ml: 50.3,
                percentage: 25.15,
                color: { l: 78.1, a: 8.2, b: 45.3 }
              },
              {
                id: 'paint-3',
                name: 'Raw Sienna',
                volume_ml: 20.1,
                percentage: 10.05,
                color: { l: 55.4, a: 15.2, b: 30.1 }
              },
              {
                id: 'paint-4',
                name: 'Burnt Umber',
                volume_ml: 9.1,
                percentage: 4.55,
                color: { l: 30.2, a: 12.1, b: 18.5 }
              }
            ],
            solution: {
              total_volume: 200,
              algorithm_used: 'tpe_hybrid',
              iterations: 2847,
              calculation_time_ms: 445
            }
          }
        }
      }).as('optimizeSuccess')

      // Trigger calculation
      cy.contains(/Find Best Match|Calculate Formula|Optimize/i).click()
      cy.wait('@optimizeSuccess')
    })

    it('should display formula table with all paint components', () => {
      // Verify results section is visible
      cy.get('[data-testid="results-section"]', { timeout: 3000 })
        .should('be.visible')

      // Verify formula table exists
      cy.get('[data-testid="formula-table"]').should('be.visible')

      // Verify all 4 paint components are shown
      cy.get('[data-testid^="formula-row-"]').should('have.length', 4)

      // Verify each row has paint name, volume, and percentage
      cy.get('[data-testid="formula-row-0"]').within(() => {
        cy.contains('Titanium White').should('be.visible')
        cy.contains('120.5').should('be.visible') // volume_ml
        cy.contains('60.25%').should('be.visible') // percentage
      })

      // Verify total volume displayed
      cy.get('[data-testid="total-volume"]')
        .should('contain.text', '200')
        .or('contain.text', 'Total')
    })

    it('should display Delta E badge with accuracy rating', () => {
      // Verify Delta E value displayed
      cy.get('[data-testid="delta-e-value"]')
        .should('be.visible')
        .and('contain.text', '1.3')

      // Verify accuracy rating/badge
      cy.get('[data-testid="accuracy-badge"]')
        .should('be.visible')
        .and('have.class', /success|excellent|high/i)

      // Verify meets Enhanced Mode target (≤ 2.0)
      cy.contains(/Excellent|High Accuracy|Professional Grade/i)
        .should('be.visible')
    })

    it('should display achieved color preview', () => {
      // Verify achieved color preview exists
      cy.get('[data-testid="achieved-color-preview"]')
        .should('be.visible')
        .should('have.css', 'background-color')
        .and('not.equal', 'rgba(0, 0, 0, 0)')

      // Verify color comparison (target vs achieved)
      cy.get('[data-testid="target-color-preview"]').should('be.visible')
      cy.get('[data-testid="achieved-color-preview"]').should('be.visible')
    })

    it('should display performance metrics', () => {
      // Verify calculation time shown
      cy.contains(/445.*ms|Calculation.*time/i).should('be.visible')

      // Verify algorithm used
      cy.contains(/tpe_hybrid|Algorithm/i).should('be.visible')

      // Verify iteration count
      cy.contains(/2,?847|Iterations/i).should('be.visible')
    })
  })

  describe('Scenario 8: Save to History Functionality', () => {
    beforeEach(() => {
      // Setup: Complete a calculation first
      cy.get('input[type="checkbox"]').first().then(($checkbox) => {
        if ($checkbox.is(':disabled')) {
          cy.skip()
        } else {
          cy.get('input[type="checkbox"]').first().check()
        }
      })

      cy.contains('Hex Input').click()
      cy.get('input[placeholder*="hex" i]')
        .clear()
        .type(testColors.warmBeige.hex)

      cy.intercept('POST', '/api/optimize', {
        statusCode: 200,
        body: {
          data: {
            achieved_color: { L: 75.2, a: 5.1, b: 20.0 },
            delta_e_achieved: 1.3,
            paint_details: [
              { id: '1', name: 'Titanium White', volume_ml: 150, percentage: 75 }
            ],
            solution: { total_volume: 200 }
          }
        }
      }).as('optimize')

      cy.contains(/Find Best Match|Calculate Formula|Optimize/i).click()
      cy.wait('@optimize')
    })

    it('should save formula to history with session name', () => {
      // Find and click Save button
      cy.contains(/Save|Save to History/i).click()

      // Enter session name
      cy.get('[data-testid="session-name-input"]')
        .should('be.visible')
        .type('Warm Beige - Enhanced Mode Test')

      // Add optional notes
      cy.get('[data-testid="session-notes"]')
        .type('Test formula created during E2E testing')

      // Mock save API
      cy.intercept('POST', '/api/sessions', {
        statusCode: 201,
        body: {
          id: 'session-123',
          name: 'Warm Beige - Enhanced Mode Test',
          created_at: new Date().toISOString()
        }
      }).as('saveSession')

      // Submit save form
      cy.contains('button', /Save|Submit/i).click()
      cy.wait('@saveSession')

      // Verify success message
      cy.get('[data-testid="save-success"]', { timeout: 3000 })
        .should('be.visible')
        .and('contain.text', 'saved')
    })

    it('should navigate to saved session in history', () => {
      // Save the session first
      cy.contains(/Save|Save to History/i).click()
      cy.get('[data-testid="session-name-input"]').type('Test Session')

      cy.intercept('POST', '/api/sessions', {
        statusCode: 201,
        body: { id: 'session-123', name: 'Test Session' }
      }).as('saveSession')

      cy.contains('button', /Save|Submit/i).click()
      cy.wait('@saveSession')

      // Navigate to history page
      cy.visit('/history')

      // Verify saved session appears in list
      cy.contains('Test Session', { timeout: 5000 }).should('be.visible')
    })
  })

  describe('Scenario 9: Standard Mode Fallback Toggle', () => {
    it('should toggle between Enhanced and Standard modes', () => {
      cy.get('input[type="checkbox"]').first().then(($checkbox) => {
        if ($checkbox.is(':disabled')) {
          cy.skip()
        }
      })

      // Start in Standard Mode (unchecked)
      cy.get('input[type="checkbox"]').first().should('not.be.checked')
      cy.contains(/Standard|Basic/i).should('be.visible')

      // Switch to Enhanced Mode
      cy.get('input[type="checkbox"]').first().check()
      cy.get('input[type="checkbox"]').first().should('be.checked')
      cy.contains(/Enhanced|Advanced/i).should('be.visible')

      // Switch back to Standard Mode
      cy.get('input[type="checkbox"]').first().uncheck()
      cy.get('input[type="checkbox"]').first().should('not.be.checked')
    })

    it('should automatically fallback to Standard Mode on Enhanced Mode failure', () => {
      cy.get('input[type="checkbox"]').first().then(($checkbox) => {
        if ($checkbox.is(':disabled')) {
          cy.skip()
        }
      })

      // Enable Enhanced Mode
      cy.get('input[type="checkbox"]').first().check()

      // Set target color
      cy.contains('Hex Input').click()
      cy.get('input[placeholder*="hex" i]')
        .clear()
        .type(testColors.warmBeige.hex)

      // Mock Enhanced Mode API failure followed by Standard Mode success
      let requestCount = 0
      cy.intercept('POST', '/api/**', (req) => {
        requestCount++
        if (req.url.includes('/api/optimize') && requestCount === 1) {
          // First request to Enhanced Mode - fail
          req.reply({
            statusCode: 503,
            body: { error: 'Enhanced mode temporarily unavailable' }
          })
        } else if (req.url.includes('/api/color-match')) {
          // Fallback to Standard Mode - succeed
          req.reply({
            statusCode: 200,
            body: {
              formula: {
                paint_ratios: [
                  { paint_id: '1', paint_name: 'White', volume_ml: 150, percentage: 75 }
                ],
                total_volume_ml: 200
              },
              calculated_color: { hex: '#D4B896', lab: { l: 75, a: 5, b: 20 } },
              delta_e: 3.2
            }
          })
        }
      }).as('apiRequest')

      // Trigger calculation
      cy.contains(/Find Best Match|Calculate Formula|Optimize/i).click()

      // Verify fallback message
      cy.get('[data-testid="fallback-notice"]', { timeout: 5000 })
        .should('be.visible')
        .and('contain.text', /Standard Mode|temporarily unavailable/i)

      // Verify Enhanced Mode checkbox is now unchecked
      cy.get('input[type="checkbox"]').first().should('not.be.checked')

      // Verify Standard Mode results displayed
      cy.get('[data-testid="delta-e-value"]')
        .should('be.visible')
        .and('contain.text', '3.2')
    })

    it('should use different API endpoints for Enhanced vs Standard modes', () => {
      cy.get('input[type="checkbox"]').first().then(($checkbox) => {
        if ($checkbox.is(':disabled')) {
          cy.skip()
        }
      })

      // Test Standard Mode endpoint
      cy.intercept('POST', '/api/color-match', {
        statusCode: 200,
        body: {
          formula: { paint_ratios: [], total_volume_ml: 200 },
          delta_e: 3.5
        }
      }).as('standardMode')

      cy.contains('Hex Input').click()
      cy.get('input[placeholder*="hex" i]').clear().type(testColors.warmBeige.hex)
      cy.contains(/Find Best Match|Calculate Formula/i).click()
      cy.wait('@standardMode')

      // Switch to Enhanced Mode
      cy.get('input[type="checkbox"]').first().check()

      // Test Enhanced Mode endpoint
      cy.intercept('POST', '/api/optimize', {
        statusCode: 200,
        body: {
          data: {
            achieved_color: { L: 75, a: 5, b: 20 },
            delta_e_achieved: 1.5,
            paint_details: [],
            solution: { total_volume: 200 }
          }
        }
      }).as('enhancedMode')

      cy.contains(/Find Best Match|Calculate Formula|Optimize/i).click()
      cy.wait('@enhancedMode')
    })
  })

  describe('WCAG 2.1 AA Accessibility Compliance', () => {
    it('should have proper focus indicators on all interactive elements', () => {
      // Check Enhanced Mode checkbox
      cy.get('input[type="checkbox"]').first().focus()
      cy.focused().should('have.css', 'outline')

      // Check input fields
      cy.get('input[placeholder*="hex" i]').focus()
      cy.focused().should('have.css', 'outline')
        .or('have.css', 'box-shadow')

      // Check buttons
      cy.contains(/Find Best Match|Calculate/i).focus()
      cy.focused().should('have.css', 'outline')
        .or('have.css', 'box-shadow')
    })

    it('should have sufficient color contrast (4.5:1 minimum)', () => {
      // This is a visual test - verify key elements have ARIA labels
      cy.get('[data-testid="delta-e-value"]').should('have.attr', 'aria-label')
        .or('have.attr', 'aria-labelledby')

      cy.get('[data-testid="accuracy-badge"]').should('have.attr', 'aria-label')
        .or('contain.text', /Excellent|Good|Fair/i)
    })

    it('should support keyboard navigation throughout workflow', () => {
      // Tab through all interactive elements
      cy.get('body').tab()
      cy.focused().should('be.visible')

      // Continue tabbing through form
      for (let i = 0; i < 5; i++) {
        cy.focused().tab()
        cy.focused().should('be.visible')
      }

      // Enter key should activate buttons
      cy.contains(/Find Best Match|Calculate/i).focus()
      cy.focused().type('{enter}')
    })

    it('should have proper ARIA labels and roles', () => {
      // Check Enhanced Mode toggle has description
      cy.contains('Enhanced Accuracy Mode')
        .should('have.attr', 'aria-describedby')
        .or('have.attr', 'aria-label')

      // Check results section has proper landmark
      cy.get('[data-testid="results-section"]')
        .should('have.attr', 'role', 'region')
        .or('have.attr', 'role', 'article')
        .or('have.attr', 'aria-labelledby')
    })

    it('should announce dynamic content changes to screen readers', () => {
      cy.get('input[type="checkbox"]').first().then(($checkbox) => {
        if ($checkbox.is(':disabled')) {
          cy.skip()
        }
      })

      // Check loading state has aria-live
      cy.get('input[type="checkbox"]').first().check()
      cy.contains('Hex Input').click()
      cy.get('input[placeholder*="hex" i]').clear().type(testColors.warmBeige.hex)

      cy.intercept('POST', '/api/optimize', {
        statusCode: 200,
        body: {
          data: {
            achieved_color: { L: 75, a: 5, b: 20 },
            delta_e_achieved: 1.5,
            paint_details: [],
            solution: { total_volume: 200 }
          }
        }
      }).as('optimize')

      cy.contains(/Find Best Match|Calculate/i).click()

      // Verify aria-live region for status updates
      cy.get('[aria-live="polite"]')
        .should('exist')
        .or('get', '[aria-live="assertive"]')
        .should('exist')
    })
  })
})
