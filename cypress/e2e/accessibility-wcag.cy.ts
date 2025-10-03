/**
 * Cypress E2E Test: T030 - WCAG 2.1 AA Accessibility Compliance
 * Feature: 005-use-codebase-analysis
 * Phase: 3.2 TDD Tests
 *
 * Tests accessibility compliance against WCAG 2.1 Level AA standards:
 * - Color contrast ratios ≥4.5:1 for normal text
 * - Touch targets minimum 44px for mobile viewports
 * - Keyboard navigation for all interactive elements
 * - Screen reader labels and ARIA attributes
 * - Automated axe-core accessibility scanning
 *
 * Expected: FAIL initially - accessibility improvements not yet implemented
 *
 * Dependencies: cypress-axe (installed), axe-core (installed)
 */

// Import axe-core for accessibility testing
import 'cypress-axe'

describe('T030: WCAG 2.1 AA Accessibility Compliance', () => {
  // WCAG 2.1 Level AA Standards
  const WCAG_AA_NORMAL_TEXT_CONTRAST = 4.5  // For text <18pt or <14pt bold
  const WCAG_AA_LARGE_TEXT_CONTRAST = 3.0   // For text ≥18pt or ≥14pt bold
  const WCAG_AA_TOUCH_TARGET_MIN_PX = 44    // Minimum touch target size
  const MOBILE_VIEWPORT = { width: 375, height: 667 } // iPhone SE
  const TABLET_VIEWPORT = { width: 768, height: 1024 } // iPad
  const DESKTOP_VIEWPORT = { width: 1920, height: 1080 } // Desktop

  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  /**
   * Test 1: Color Contrast Ratios - Authentication Forms
   *
   * WCAG 2.1 Success Criterion 1.4.3 (Level AA)
   * Text contrast ratio must be at least 4.5:1
   */
  describe('Color Contrast - Authentication Forms', () => {
    it('should have 4.5:1 contrast ratio for all text on signin page', () => {
      cy.visit('/auth/signin')

      // Check email input label contrast
      cy.get('[data-testid="email-label"]').then(($label) => {
        const color = $label.css('color')
        const bgColor = $label.css('background-color')

        // Calculate contrast ratio (using helper function)
        cy.window().then((win) => {
          const contrast = calculateContrastRatio(color, bgColor, win)
          expect(contrast).to.be.gte(WCAG_AA_NORMAL_TEXT_CONTRAST)
          cy.log(`Email label contrast: ${contrast.toFixed(2)}:1`)
        })
      })

      // Check password input label contrast
      cy.get('[data-testid="password-label"]').then(($label) => {
        const color = $label.css('color')
        const bgColor = $label.css('background-color')

        cy.window().then((win) => {
          const contrast = calculateContrastRatio(color, bgColor, win)
          expect(contrast).to.be.gte(WCAG_AA_NORMAL_TEXT_CONTRAST)
          cy.log(`Password label contrast: ${contrast.toFixed(2)}:1`)
        })
      })

      // Check button text contrast
      cy.get('[data-testid="signin-button"]').then(($button) => {
        const color = $button.css('color')
        const bgColor = $button.css('background-color')

        cy.window().then((win) => {
          const contrast = calculateContrastRatio(color, bgColor, win)
          expect(contrast).to.be.gte(WCAG_AA_NORMAL_TEXT_CONTRAST)
          cy.log(`Button text contrast: ${contrast.toFixed(2)}:1`)
        })
      })

      // Check error message contrast
      cy.intercept('POST', '/api/auth/email-signin', {
        statusCode: 401,
        body: { success: false, error: 'Invalid credentials' }
      })

      cy.get('[data-testid="email-input"]').type('test@example.com')
      cy.get('[data-testid="password-input"]').type('wrong')
      cy.get('[data-testid="signin-button"]').click()

      cy.get('[data-testid="signin-error"]').should('be.visible').then(($error) => {
        const color = $error.css('color')
        const bgColor = $error.css('background-color')

        cy.window().then((win) => {
          const contrast = calculateContrastRatio(color, bgColor, win)
          expect(contrast).to.be.gte(WCAG_AA_NORMAL_TEXT_CONTRAST)
          cy.log(`Error message contrast: ${contrast.toFixed(2)}:1`)
        })
      })
    })

    it('should have sufficient contrast for link text', () => {
      cy.visit('/auth/signin')

      // Check "Forgot password?" link if exists
      cy.get('a').each(($link) => {
        const color = $link.css('color')
        const bgColor = $link.css('background-color')

        cy.window().then((win) => {
          const contrast = calculateContrastRatio(color, bgColor, win)
          expect(contrast).to.be.gte(WCAG_AA_NORMAL_TEXT_CONTRAST)
          cy.log(`Link contrast: ${contrast.toFixed(2)}:1 (${$link.text().trim()})`)
        })
      })
    })

    it('should maintain contrast in focus states', () => {
      cy.visit('/auth/signin')

      // Check focus state contrast for email input
      cy.get('[data-testid="email-input"]').focus().then(($input) => {
        const borderColor = $input.css('border-color')
        const bgColor = $input.css('background-color')

        cy.window().then((win) => {
          const contrast = calculateContrastRatio(borderColor, bgColor, win)
          // Focus indicators should have 3:1 contrast minimum (WCAG 2.1 SC 1.4.11)
          expect(contrast).to.be.gte(3.0)
          cy.log(`Focus border contrast: ${contrast.toFixed(2)}:1`)
        })
      })
    })
  })

  /**
   * Test 2: Touch Target Sizes - Mobile Viewport
   *
   * WCAG 2.1 Success Criterion 2.5.5 (Level AAA, but good practice)
   * Touch targets should be at least 44x44 CSS pixels
   */
  describe('Touch Target Sizes - Mobile', () => {
    it('should have 44px minimum touch targets on mobile signin page', () => {
      cy.viewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
      cy.visit('/auth/signin')

      // Check button size
      cy.get('[data-testid="signin-button"]').then(($button) => {
        const width = $button.outerWidth() || 0
        const height = $button.outerHeight() || 0

        expect(width).to.be.gte(WCAG_AA_TOUCH_TARGET_MIN_PX)
        expect(height).to.be.gte(WCAG_AA_TOUCH_TARGET_MIN_PX)

        cy.log(`Button size: ${width}x${height}px`)
      })

      // Check input fields have adequate tap area
      cy.get('[data-testid="email-input"]').then(($input) => {
        const height = $input.outerHeight() || 0
        expect(height).to.be.gte(WCAG_AA_TOUCH_TARGET_MIN_PX)
        cy.log(`Email input height: ${height}px`)
      })

      cy.get('[data-testid="password-input"]').then(($input) => {
        const height = $input.outerHeight() || 0
        expect(height).to.be.gte(WCAG_AA_TOUCH_TARGET_MIN_PX)
        cy.log(`Password input height: ${height}px`)
      })
    })

    it('should have adequate spacing between touch targets', () => {
      cy.viewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
      cy.visit('/auth/signin')

      // Measure spacing between inputs and button
      cy.get('[data-testid="password-input"]').then(($password) => {
        const passwordBottom = $password.offset()!.top + $password.outerHeight()!

        cy.get('[data-testid="signin-button"]').then(($button) => {
          const buttonTop = $button.offset()!.top
          const spacing = buttonTop - passwordBottom

          // Should have at least 8px spacing (common guideline)
          expect(spacing).to.be.gte(8)
          cy.log(`Button spacing: ${spacing}px`)
        })
      })
    })

    it('should maintain touch targets on tablet viewport', () => {
      cy.viewport(TABLET_VIEWPORT.width, TABLET_VIEWPORT.height)
      cy.visit('/auth/signin')

      cy.get('[data-testid="signin-button"]').then(($button) => {
        const width = $button.outerWidth() || 0
        const height = $button.outerHeight() || 0

        expect(height).to.be.gte(WCAG_AA_TOUCH_TARGET_MIN_PX)
        cy.log(`Tablet button size: ${width}x${height}px`)
      })
    })
  })

  /**
   * Test 3: Keyboard Navigation
   *
   * WCAG 2.1 Success Criterion 2.1.1 (Level A)
   * All functionality must be accessible via keyboard
   */
  describe('Keyboard Navigation', () => {
    it('should support tab navigation through all form elements', () => {
      cy.visit('/auth/signin')

      // Tab through form in logical order
      cy.get('body').realPress('Tab')
      cy.focused().should('have.attr', 'data-testid', 'email-input')

      cy.focused().realPress('Tab')
      cy.focused().should('have.attr', 'data-testid', 'password-input')

      cy.focused().realPress('Tab')
      cy.focused().should('have.attr', 'data-testid', 'signin-button')

      cy.log('Tab order verified')
    })

    it('should support shift+tab for reverse navigation', () => {
      cy.visit('/auth/signin')

      // Tab to button
      cy.get('[data-testid="signin-button"]').focus()

      // Shift+Tab backwards
      cy.focused().realPress(['Shift', 'Tab'])
      cy.focused().should('have.attr', 'data-testid', 'password-input')

      cy.focused().realPress(['Shift', 'Tab'])
      cy.focused().should('have.attr', 'data-testid', 'email-input')

      cy.log('Reverse tab order verified')
    })

    it('should submit form with Enter key from input fields', () => {
      cy.visit('/auth/signin')

      cy.intercept('POST', '/api/auth/email-signin', {
        statusCode: 200,
        body: { success: true }
      }).as('signin')

      cy.get('[data-testid="email-input"]').type('test@example.com')
      cy.get('[data-testid="password-input"]').type('ValidPassword123!')

      // Press Enter while focused on password field
      cy.focused().realPress('Enter')

      cy.wait('@signin')
      cy.log('Form submitted via keyboard')
    })

    it('should have visible focus indicators', () => {
      cy.visit('/auth/signin')

      // Focus email input
      cy.get('[data-testid="email-input"]').focus()

      // Verify focus indicator exists (outline, border, shadow, etc.)
      cy.focused().should(($input) => {
        const outline = $input.css('outline')
        const boxShadow = $input.css('box-shadow')
        const borderColor = $input.css('border-color')

        // At least one focus indicator should be present
        const hasFocusIndicator =
          outline !== 'none' ||
          boxShadow !== 'none' ||
          borderColor !== 'rgb(0, 0, 0)' // Not default black

        expect(hasFocusIndicator).to.be.true
      })

      cy.log('Focus indicators present')
    })

    it('should trap focus in modal dialogs (if present)', () => {
      // This test assumes a lockout modal or error dialog exists
      cy.visit('/auth/signin')

      // Trigger lockout modal (5 failed attempts)
      cy.intercept('POST', '/api/auth/email-signin', {
        statusCode: 429,
        body: { success: false, error: 'Too many attempts' }
      })

      cy.get('[data-testid="email-input"]').type('test@example.com')
      cy.get('[data-testid="password-input"]').type('wrong')
      cy.get('[data-testid="signin-button"]').click()

      // If modal appears, focus should be trapped
      cy.get('[role="dialog"]').should('exist').then(($modal) => {
        // Tab through modal elements
        cy.focused().realPress('Tab')

        // Focus should stay within modal
        cy.focused().should('exist')
        cy.focused().parents('[role="dialog"]').should('exist')

        cy.log('Focus trapped in modal')
      })
    })
  })

  /**
   * Test 4: Screen Reader Labels and ARIA
   *
   * WCAG 2.1 Success Criterion 4.1.2 (Level A)
   * Form inputs must have accessible names
   */
  describe('Screen Reader Labels and ARIA', () => {
    it('should have accessible labels for all form inputs', () => {
      cy.visit('/auth/signin')

      // Email input must have label or aria-label
      cy.get('[data-testid="email-input"]').should('satisfy', ($input) => {
        const hasLabel = $input.attr('aria-label') || $input.attr('aria-labelledby')
        const hasAssociatedLabel = Cypress.$(`label[for="${$input.attr('id')}"]`).length > 0
        return hasLabel || hasAssociatedLabel
      })

      // Password input must have label or aria-label
      cy.get('[data-testid="password-input"]').should('satisfy', ($input) => {
        const hasLabel = $input.attr('aria-label') || $input.attr('aria-labelledby')
        const hasAssociatedLabel = Cypress.$(`label[for="${$input.attr('id')}"]`).length > 0
        return hasLabel || hasAssociatedLabel
      })

      cy.log('All inputs have accessible labels')
    })

    it('should announce form errors to screen readers', () => {
      cy.visit('/auth/signin')

      cy.intercept('POST', '/api/auth/email-signin', {
        statusCode: 401,
        body: { success: false, error: 'Invalid credentials' }
      })

      cy.get('[data-testid="email-input"]').type('test@example.com')
      cy.get('[data-testid="password-input"]').type('wrong')
      cy.get('[data-testid="signin-button"]').click()

      // Error message should have aria-live or role="alert"
      cy.get('[data-testid="signin-error"]').should('be.visible').and('satisfy', ($error) => {
        const hasAriaLive = $error.attr('aria-live') === 'polite' || $error.attr('aria-live') === 'assertive'
        const hasAlertRole = $error.attr('role') === 'alert'
        return hasAriaLive || hasAlertRole
      })

      cy.log('Error messages announced to screen readers')
    })

    it('should have aria-invalid on invalid inputs', () => {
      cy.visit('/auth/signin')

      // Submit empty form
      cy.get('[data-testid="signin-button"]').click()

      // Invalid inputs should have aria-invalid="true"
      cy.get('[data-testid="email-input"]').should('have.attr', 'aria-invalid', 'true')
      cy.get('[data-testid="password-input"]').should('have.attr', 'aria-invalid', 'true')

      cy.log('Invalid inputs marked with aria-invalid')
    })

    it('should associate error messages with inputs via aria-describedby', () => {
      cy.visit('/auth/signin')

      // Submit form to trigger validation
      cy.get('[data-testid="signin-button"]').click()

      // Email input should reference error message
      cy.get('[data-testid="email-input"]').then(($input) => {
        const describedBy = $input.attr('aria-describedby')
        expect(describedBy).to.exist

        // Error message element should exist
        cy.get(`#${describedBy}`).should('be.visible')
      })

      cy.log('Error messages linked via aria-describedby')
    })

    it('should have proper button states for loading/disabled', () => {
      cy.visit('/auth/signin')

      // Mock slow API to trigger loading state
      cy.intercept('POST', '/api/auth/email-signin', (req) => {
        req.reply({ delay: 1000, statusCode: 200, body: { success: true } })
      }).as('signin')

      cy.get('[data-testid="email-input"]').type('test@example.com')
      cy.get('[data-testid="password-input"]').type('ValidPassword123!')
      cy.get('[data-testid="signin-button"]').click()

      // Button should have aria-busy during loading
      cy.get('[data-testid="signin-button"]')
        .should('have.attr', 'aria-busy', 'true')
        .and('be.disabled')

      cy.log('Loading state announced to screen readers')
    })
  })

  /**
   * Test 5: Automated Accessibility Scanning with axe-core
   *
   * Uses cypress-axe to run comprehensive WCAG 2.1 AA tests
   */
  describe('Automated axe-core Accessibility Scan', () => {
    it('should pass axe-core scan on signin page (WCAG 2.1 AA)', () => {
      cy.visit('/auth/signin')

      // Inject axe-core
      cy.injectAxe()

      // Run accessibility scan
      cy.checkA11y(null, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      })

      cy.log('axe-core scan passed for WCAG 2.1 AA')
    })

    it('should pass axe-core scan on error state', () => {
      cy.visit('/auth/signin')

      // Trigger error state
      cy.intercept('POST', '/api/auth/email-signin', {
        statusCode: 401,
        body: { success: false, error: 'Invalid credentials' }
      })

      cy.get('[data-testid="email-input"]').type('test@example.com')
      cy.get('[data-testid="password-input"]').type('wrong')
      cy.get('[data-testid="signin-button"]').click()

      // Wait for error to appear
      cy.get('[data-testid="signin-error"]').should('be.visible')

      cy.injectAxe()
      cy.checkA11y(null, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      })

      cy.log('axe-core scan passed with error state')
    })

    it('should pass axe-core scan on lockout state', () => {
      cy.visit('/auth/signin')

      // Trigger lockout
      cy.window().then((win) => {
        win.localStorage.setItem('auth_lockout_until', String(Date.now() + 900000))
      })

      cy.reload()

      cy.get('[data-testid="lockout-message"]').should('be.visible')

      cy.injectAxe()
      cy.checkA11y(null, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      })

      cy.log('axe-core scan passed with lockout state')
    })

    it('should pass axe-core scan on mobile viewport', () => {
      cy.viewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
      cy.visit('/auth/signin')

      cy.injectAxe()
      cy.checkA11y(null, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      })

      cy.log('axe-core scan passed on mobile viewport')
    })

    it('should report specific violations if any exist', () => {
      cy.visit('/auth/signin')

      cy.injectAxe()

      // Custom violation callback for detailed reporting
      cy.checkA11y(
        null,
        {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
          }
        },
        (violations) => {
          if (violations.length > 0) {
            cy.log(`ACCESSIBILITY VIOLATIONS FOUND: ${violations.length}`)

            violations.forEach((violation) => {
              cy.log(`[${violation.impact}] ${violation.id}: ${violation.description}`)
              cy.log(`  Help: ${violation.helpUrl}`)
              cy.log(`  Affected nodes: ${violation.nodes.length}`)

              violation.nodes.forEach((node, idx) => {
                cy.log(`    ${idx + 1}. ${node.html}`)
                cy.log(`       ${node.failureSummary}`)
              })
            })
          }
        }
      )
    })
  })
})

/**
 * Helper: Calculate Contrast Ratio
 *
 * Calculates WCAG contrast ratio between two colors
 * Formula: (L1 + 0.05) / (L2 + 0.05)
 * Where L is relative luminance
 */
function calculateContrastRatio(color1: string, color2: string, win: Window): number {
  const getLuminance = (color: string): number => {
    // Parse RGB values from CSS color string
    const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0]
    const [r, g, b] = rgb.map((val) => {
      const normalized = val / 255
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Installation Requirements:
 *
 * CYPRESS-AXE:
 *   npm install --save-dev cypress-axe axe-core
 *   Status: Already installed (verified in package.json)
 *
 * CYPRESS-REAL-EVENTS:
 *   npm install --save-dev cypress-real-events
 *   Needed for: realPress() keyboard simulation
 *   Status: MISSING - Install if keyboard tests fail
 *
 * Usage:
 *   npm run test:e2e -- --spec "cypress/e2e/accessibility-wcag.cy.ts"
 *   npm run cypress:open  # Interactive mode for debugging
 */
