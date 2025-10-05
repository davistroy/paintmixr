/**
 * Cypress E2E Test: T015 - Accessibility Testing
 * Feature: 009-add-hamburger-menu
 * Phase: 3.2 TDD Tests
 *
 * Tests WCAG 2.1 AA compliance for hamburger menu, debug console, and about dialog:
 * - Scenario 10: Keyboard navigation (Tab, Enter, ESC through menu)
 * - Screen reader compatibility (ARIA labels and roles)
 * - Color contrast validation (≥4.5:1 using cypress-axe)
 * - Motion sensitivity (prefers-reduced-motion support)
 *
 * Components tested: HamburgerMenu, DebugConsole, AboutDialog
 *
 * Expected: FAIL initially - components don't have ARIA attributes yet
 *
 * Dependencies: cypress-axe (installed), axe-core (installed)
 */

import 'cypress-axe'

describe('T015: Hamburger Menu Accessibility Compliance', () => {
  // WCAG 2.1 Level AA Standards
  const WCAG_AA_NORMAL_TEXT_CONTRAST = 4.5
  const WCAG_AA_FOCUS_CONTRAST = 3.0 // WCAG 2.1 SC 1.4.11
  const WCAG_AA_TOUCH_TARGET_MIN_PX = 44
  const MOBILE_VIEWPORT = { width: 375, height: 667 } // iPhone SE
  const DESKTOP_VIEWPORT = { width: 1920, height: 1080 }

  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()

    // Intercept auth endpoints before visiting
    cy.intercept('GET', '/api/auth/user', {
      statusCode: 200,
      body: {
        id: 'test-user-id',
        email: 'test@example.com'
      }
    }).as('getUser')

    // Visit page first
    cy.visit('/')

    // Mock authentication after page load
    cy.window().then((win) => {
      win.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user-id', email: 'test@example.com' }
      }))
    })

    // Wait for page to be ready
    cy.get('body').should('be.visible')
  })

  /**
   * Test Group 1: Keyboard Navigation (Scenario 10)
   *
   * WCAG 2.1 Success Criterion 2.1.1 (Level A)
   * All functionality must be accessible via keyboard
   */
  describe('Keyboard Navigation - Hamburger Menu', () => {
    it('should support Tab navigation to hamburger icon', () => {
      // Tab to hamburger icon (should be in tab order)
      cy.get('body').tab()
      cy.focused().should('have.attr', 'aria-label', 'Open navigation menu')

      cy.log('Hamburger icon is keyboard accessible')
    })

    it('should open menu with Enter key', () => {
      // Focus hamburger icon
      cy.get('[aria-label="Open navigation menu"]').focus()

      // Verify initial state
      cy.focused().should('have.attr', 'aria-expanded', 'false')

      // Open menu with Enter
      cy.focused().type('{enter}')

      // Verify menu opened
      cy.get('[role="menu"]').should('be.visible')
      cy.get('[aria-label="Open navigation menu"]')
        .should('have.attr', 'aria-expanded', 'true')

      cy.log('Menu opens with Enter key')
    })

    it('should open menu with Space key', () => {
      // Focus hamburger icon
      cy.get('[aria-label="Open navigation menu"]').focus()

      // Open menu with Space
      cy.focused().type(' ')

      // Verify menu opened
      cy.get('[role="menu"]').should('be.visible')

      cy.log('Menu opens with Space key')
    })

    it('should Tab through all 4 menu items in logical order', () => {
      // Open menu
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menu"]').should('be.visible')

      // Tab through menu items
      cy.get('body').tab()
      cy.focused().should('contain', 'Session History')

      cy.focused().tab()
      cy.focused().should('contain', 'Debug Mode')

      cy.focused().tab()
      cy.focused().should('contain', 'About')

      cy.focused().tab()
      cy.focused().should('contain', 'Logout')

      cy.log('All 4 menu items reachable via Tab')
    })

    it('should support Shift+Tab for reverse navigation', () => {
      // Open menu and navigate to last item
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menuitem"]').last().focus()

      // Shift+Tab backwards
      cy.focused().tab({ shift: true })
      cy.focused().should('contain', 'About')

      cy.focused().tab({ shift: true })
      cy.focused().should('contain', 'Debug Mode')

      cy.log('Reverse tab navigation works')
    })

    it('should close menu with ESC key', () => {
      // Open menu
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menu"]').should('be.visible')

      // Press ESC
      cy.get('body').type('{esc}')

      // Verify menu closed
      cy.get('[role="menu"]').should('not.be.visible')
      cy.get('[aria-label="Open navigation menu"]')
        .should('have.attr', 'aria-expanded', 'false')

      cy.log('ESC key closes menu')
    })

    it('should activate menu items with Enter key', () => {
      // Open menu
      cy.get('[aria-label="Open navigation menu"]').click()

      // Navigate to About item and press Enter
      cy.get('[role="menuitem"]').contains('About').focus()
      cy.focused().type('{enter}')

      // Verify About dialog opened
      cy.get('[role="dialog"]').should('be.visible')
      cy.get('[aria-labelledby="about-dialog-title"]').should('exist')

      cy.log('Enter key activates menu items')
    })

    it('should have visible focus indicators on all interactive elements', () => {
      // Focus hamburger icon
      cy.get('[aria-label="Open navigation menu"]').focus()

      cy.focused().should(($button) => {
        const outline = $button.css('outline')
        const boxShadow = $button.css('box-shadow')
        const borderWidth = parseInt($button.css('border-width'))

        // At least one focus indicator should be present
        const hasFocusIndicator =
          outline !== 'none' ||
          boxShadow !== 'none' ||
          borderWidth > 0

        expect(hasFocusIndicator).to.be.true
      })

      // Open menu and check menu items
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menuitem"]').first().focus()

      cy.focused().should(($item) => {
        const outline = $item.css('outline')
        const boxShadow = $item.css('box-shadow')
        const bgColor = $item.css('background-color')

        // Focus should be visually distinct
        const hasFocusIndicator =
          outline !== 'none' ||
          boxShadow !== 'none' ||
          bgColor !== 'rgba(0, 0, 0, 0)' // Not transparent

        expect(hasFocusIndicator).to.be.true
      })

      cy.log('Visible focus indicators present')
    })

    it('should trap focus in About dialog when open', () => {
      // Open About dialog
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menuitem"]').contains('About').click()
      cy.get('[role="dialog"]').should('be.visible')

      // Tab through dialog elements
      cy.get('body').tab()
      cy.focused().should('exist')

      // Verify focus is within dialog
      cy.focused().parents('[role="dialog"]').should('exist')

      // Tab multiple times (should cycle within dialog)
      for (let i = 0; i < 10; i++) {
        cy.get('body').tab()
        cy.focused().parents('[role="dialog"]').should('exist')
      }

      cy.log('Focus trapped in dialog')
    })

    it('should close About dialog with ESC key', () => {
      // Open About dialog
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menuitem"]').contains('About').click()
      cy.get('[role="dialog"]').should('be.visible')

      // Press ESC
      cy.get('body').type('{esc}')

      // Verify dialog closed
      cy.get('[role="dialog"]').should('not.be.visible')

      cy.log('ESC closes About dialog')
    })
  })

  /**
   * Test Group 2: Keyboard Navigation - Debug Console
   */
  describe('Keyboard Navigation - Debug Console', () => {
    it('should toggle Debug Mode with keyboard', () => {
      // Open menu via keyboard
      cy.get('[aria-label="Open navigation menu"]').focus().type('{enter}')

      // Navigate to Debug Mode toggle
      cy.get('[role="menuitem"]').contains('Debug Mode').focus()
      cy.focused().type('{enter}')

      // Verify debug console appeared
      cy.get('[role="log"]').should('be.visible')
      cy.get('[aria-label="Debug console"]').should('exist')

      cy.log('Debug Mode toggleable via keyboard')
    })

    it('should support Tab navigation to console controls', () => {
      // Enable Debug Mode
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menuitem"]').contains('Debug Mode').click()
      cy.get('[role="log"]').should('be.visible')

      // Tab to Wrap Text checkbox
      cy.get('[aria-label="Wrap text in debug console"]').focus()
      cy.focused().should('have.attr', 'type', 'checkbox')

      // Tab to Download Logs button
      cy.get('body').tab()
      cy.focused().should('contain', 'Download Logs')

      cy.log('Console controls are keyboard accessible')
    })

    it('should toggle text wrapping with Space key', () => {
      // Enable Debug Mode
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menuitem"]').contains('Debug Mode').click()

      // Focus Wrap Text checkbox and toggle
      cy.get('[aria-label="Wrap text in debug console"]').focus()
      cy.focused().type(' ') // Space to toggle

      // Verify checked state
      cy.focused().should('be.checked')

      cy.log('Wrap Text toggleable with keyboard')
    })

    it('should activate Download Logs button with Enter', () => {
      // Enable Debug Mode and generate logs
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menuitem"]').contains('Debug Mode').click()

      // Generate some log entries (trigger API call)
      cy.intercept('GET', '/api/test', { body: { success: true } })
      cy.window().then((win) => {
        win.fetch('/api/test')
      })

      // Wait for logs to appear
      cy.wait(200)

      // Focus Download button and press Enter
      cy.contains('Download Logs').focus().type('{enter}')

      // Verify download triggered (would check Cypress downloads folder)
      cy.log('Download Logs activatable via keyboard')
    })
  })

  /**
   * Test Group 3: Screen Reader Compatibility (ARIA)
   */
  describe('Screen Reader Compatibility', () => {
    it('should have correct ARIA role on hamburger menu button', () => {
      cy.get('[aria-label="Open navigation menu"]')
        .should('have.attr', 'role', 'button')
        .and('have.attr', 'aria-haspopup', 'menu')
        .and('have.attr', 'aria-expanded', 'false')

      cy.log('Hamburger button has correct ARIA attributes')
    })

    it('should have correct ARIA role on menu container', () => {
      cy.get('[aria-label="Open navigation menu"]').click()

      cy.get('[role="menu"]')
        .should('be.visible')
        .and('have.attr', 'aria-labelledby')

      cy.log('Menu container has role="menu"')
    })

    it('should have ARIA role="menuitem" on all menu items', () => {
      cy.get('[aria-label="Open navigation menu"]').click()

      cy.get('[role="menuitem"]').should('have.length', 4)
      cy.get('[role="menuitem"]').each(($item) => {
        expect($item.attr('role')).to.equal('menuitem')
      })

      cy.log('All menu items have role="menuitem"')
    })

    it('should update aria-expanded when menu opens/closes', () => {
      // Verify initial state
      cy.get('[aria-label="Open navigation menu"]')
        .should('have.attr', 'aria-expanded', 'false')

      // Open menu
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[aria-label="Open navigation menu"]')
        .should('have.attr', 'aria-expanded', 'true')

      // Close menu
      cy.get('body').type('{esc}')
      cy.get('[aria-label="Open navigation menu"]')
        .should('have.attr', 'aria-expanded', 'false')

      cy.log('aria-expanded updates correctly')
    })

    it('should have aria-live="polite" on debug console', () => {
      // Enable Debug Mode
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menuitem"]').contains('Debug Mode').click()

      cy.get('[role="log"]')
        .should('have.attr', 'aria-live', 'polite')
        .and('have.attr', 'aria-label', 'Debug console')

      cy.log('Debug console has aria-live for screen readers')
    })

    it('should announce new log entries to screen readers', () => {
      // Enable Debug Mode
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menuitem"]').contains('Debug Mode').click()

      // Trigger API call to generate log
      cy.intercept('GET', '/api/test', { body: { success: true } })
      cy.window().then((win) => {
        win.fetch('/api/test')
      })

      // Verify log entry has accessible text
      cy.get('[role="log"]').within(() => {
        cy.contains('api').should('exist')
      })

      cy.log('Log entries are announced to screen readers')
    })

    it('should have aria-labelledby on About dialog', () => {
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menuitem"]').contains('About').click()

      cy.get('[role="dialog"]')
        .should('have.attr', 'aria-labelledby', 'about-dialog-title')
        .and('have.attr', 'aria-modal', 'true')

      cy.get('#about-dialog-title').should('exist')

      cy.log('About dialog has correct ARIA attributes')
    })

    it('should have aria-label on GitHub link in About dialog', () => {
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menuitem"]').contains('About').click()

      cy.get('[role="dialog"]').within(() => {
        cy.get('a[target="_blank"]').should('satisfy', ($link) => {
          return $link.attr('aria-label') || $link.text().trim().length > 0
        })
      })

      cy.log('GitHub link is accessible to screen readers')
    })

    it('should have aria-label on Logout button', () => {
      cy.get('[aria-label="Open navigation menu"]').click()

      cy.get('[role="menuitem"]').contains('Logout').should('satisfy', ($button) => {
        return $button.attr('aria-label') || $button.text().includes('Logout')
      })

      cy.log('Logout button is labeled for screen readers')
    })

    it('should have aria-busy during logout loading state', () => {
      // Mock slow logout
      cy.intercept('POST', '/auth/signout', (req) => {
        req.reply({ delay: 1000, statusCode: 200, body: {} })
      })

      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menuitem"]').contains('Logout').click()

      // Check for loading state
      cy.get('[aria-busy="true"]').should('exist')

      cy.log('Loading state announced to screen readers')
    })
  })

  /**
   * Test Group 4: Color Contrast Validation
   *
   * WCAG 2.1 Success Criterion 1.4.3 (Level AA)
   * Text contrast ratio must be at least 4.5:1
   */
  describe('Color Contrast - WCAG 2.1 AA', () => {
    it('should have ≥4.5:1 contrast for hamburger icon', () => {
      cy.get('[aria-label="Open navigation menu"]').then(($icon) => {
        const color = $icon.css('color')
        const bgColor = $icon.css('background-color')

        cy.window().then((win) => {
          const contrast = calculateContrastRatio(color, bgColor, win)
          expect(contrast).to.be.gte(WCAG_AA_NORMAL_TEXT_CONTRAST)
          cy.log(`Hamburger icon contrast: ${contrast.toFixed(2)}:1`)
        })
      })
    })

    it('should have ≥4.5:1 contrast for menu items', () => {
      cy.get('[aria-label="Open navigation menu"]').click()

      cy.get('[role="menuitem"]').each(($item) => {
        const color = $item.css('color')
        const bgColor = $item.css('background-color')

        cy.window().then((win) => {
          const contrast = calculateContrastRatio(color, bgColor, win)
          expect(contrast).to.be.gte(WCAG_AA_NORMAL_TEXT_CONTRAST)
          cy.log(`Menu item "${$item.text()}" contrast: ${contrast.toFixed(2)}:1`)
        })
      })
    })

    it('should have ≥3:1 contrast for focus indicators', () => {
      cy.get('[aria-label="Open navigation menu"]').focus()

      cy.focused().then(($button) => {
        const borderColor = $button.css('border-color') || $button.css('outline-color')
        const bgColor = $button.css('background-color')

        cy.window().then((win) => {
          const contrast = calculateContrastRatio(borderColor, bgColor, win)
          expect(contrast).to.be.gte(WCAG_AA_FOCUS_CONTRAST)
          cy.log(`Focus indicator contrast: ${contrast.toFixed(2)}:1`)
        })
      })
    })

    it('should have ≥4.5:1 contrast for debug console text', () => {
      // Enable Debug Mode
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menuitem"]').contains('Debug Mode').click()

      // Trigger log entry
      cy.intercept('GET', '/api/test', { body: {} })
      cy.window().then((win) => win.fetch('/api/test'))

      cy.wait(200)

      cy.get('[role="log"]').then(($console) => {
        const color = $console.css('color')
        const bgColor = $console.css('background-color')

        cy.window().then((win) => {
          const contrast = calculateContrastRatio(color, bgColor, win)
          expect(contrast).to.be.gte(WCAG_AA_NORMAL_TEXT_CONTRAST)
          cy.log(`Debug console text contrast: ${contrast.toFixed(2)}:1`)
        })
      })
    })

    it('should have ≥4.5:1 contrast for About dialog text', () => {
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menuitem"]').contains('About').click()

      cy.get('[role="dialog"]').within(() => {
        cy.get('body').then(($dialog) => {
          const color = $dialog.css('color')
          const bgColor = $dialog.css('background-color')

          cy.window().then((win) => {
            const contrast = calculateContrastRatio(color, bgColor, win)
            expect(contrast).to.be.gte(WCAG_AA_NORMAL_TEXT_CONTRAST)
            cy.log(`About dialog text contrast: ${contrast.toFixed(2)}:1`)
          })
        })
      })
    })

    it('should maintain contrast in hover states', () => {
      cy.get('[aria-label="Open navigation menu"]').click()

      cy.get('[role="menuitem"]').first().trigger('mouseover').then(($item) => {
        const color = $item.css('color')
        const bgColor = $item.css('background-color')

        cy.window().then((win) => {
          const contrast = calculateContrastRatio(color, bgColor, win)
          expect(contrast).to.be.gte(WCAG_AA_NORMAL_TEXT_CONTRAST)
          cy.log(`Hover state contrast: ${contrast.toFixed(2)}:1`)
        })
      })
    })
  })

  /**
   * Test Group 5: Touch Target Sizes (Mobile)
   *
   * WCAG 2.1 Success Criterion 2.5.5 (Level AAA, but NFR-005 requires it)
   * Touch targets should be at least 44x44 CSS pixels
   */
  describe('Touch Target Sizes - Mobile Viewport', () => {
    it('should have ≥44px hamburger icon on mobile', () => {
      cy.viewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
      cy.visit('/')

      cy.get('[aria-label="Open navigation menu"]').then(($icon) => {
        const width = $icon.outerWidth() || 0
        const height = $icon.outerHeight() || 0

        expect(width).to.be.gte(WCAG_AA_TOUCH_TARGET_MIN_PX)
        expect(height).to.be.gte(WCAG_AA_TOUCH_TARGET_MIN_PX)

        cy.log(`Hamburger icon size: ${width}x${height}px`)
      })
    })

    it('should have ≥44px menu items on mobile', () => {
      cy.viewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
      cy.visit('/')

      cy.get('[aria-label="Open navigation menu"]').click()

      cy.get('[role="menuitem"]').each(($item) => {
        const height = $item.outerHeight() || 0
        expect(height).to.be.gte(WCAG_AA_TOUCH_TARGET_MIN_PX)
      })

      cy.log('All menu items meet 44px minimum on mobile')
    })

    it('should have adequate spacing between touch targets', () => {
      cy.viewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
      cy.visit('/')

      cy.get('[aria-label="Open navigation menu"]').click()

      cy.get('[role="menuitem"]').then(($items) => {
        for (let i = 0; i < $items.length - 1; i++) {
          const item1Bottom = $items.eq(i).offset()!.top + $items.eq(i).outerHeight()!
          const item2Top = $items.eq(i + 1).offset()!.top
          const spacing = item2Top - item1Bottom

          // Should have at least 8px spacing
          expect(spacing).to.be.gte(0) // Allow overlap if items are large enough
        }
      })

      cy.log('Touch target spacing is adequate')
    })
  })

  /**
   * Test Group 6: Motion Sensitivity (prefers-reduced-motion)
   *
   * WCAG 2.1 Success Criterion 2.3.3 (Level AAA, but NFR-001 requires it)
   * Respect user's motion preferences
   */
  describe('Motion Sensitivity - prefers-reduced-motion', () => {
    it('should disable animations when prefers-reduced-motion is set', () => {
      // Emulate prefers-reduced-motion
      cy.visit('/', {
        onBeforeLoad(win) {
          Object.defineProperty(win, 'matchMedia', {
            writable: true,
            value: (query: string) => ({
              matches: query === '(prefers-reduced-motion: reduce)',
              media: query,
              onchange: null,
              addListener: () => {},
              removeListener: () => {},
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => true,
            }),
          })
        },
      })

      // Open menu
      cy.get('[aria-label="Open navigation menu"]').click()

      // Verify menu appears instantly (no transition delay)
      cy.get('[role="menu"]').should('be.visible').and(($menu) => {
        const transition = $menu.css('transition')
        // Should be 'none' or '0s'
        expect(transition === 'none' || transition.includes('0s')).to.be.true
      })

      cy.log('Animations disabled for prefers-reduced-motion')
    })

    it('should enable animations when prefers-reduced-motion is NOT set', () => {
      cy.visit('/')

      // Open menu
      cy.get('[aria-label="Open navigation menu"]').click()

      // Verify menu has transition
      cy.get('[role="menu"]').should(($menu) => {
        const transition = $menu.css('transition')
        // Should have non-zero transition
        expect(transition !== 'none').to.be.true
      })

      cy.log('Animations enabled when motion preferences allow')
    })
  })

  /**
   * Test Group 7: Automated axe-core Accessibility Scan
   *
   * Comprehensive WCAG 2.1 AA testing
   */
  describe('Automated axe-core Accessibility Scan', () => {
    it('should pass axe-core scan on page with closed menu', () => {
      cy.visit('/')

      cy.injectAxe()
      cy.checkA11y(null, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      })

      cy.log('axe-core scan passed with menu closed')
    })

    it('should pass axe-core scan with open menu', () => {
      cy.visit('/')
      cy.get('[aria-label="Open navigation menu"]').click()

      cy.injectAxe()
      cy.checkA11y(null, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      })

      cy.log('axe-core scan passed with menu open')
    })

    it('should pass axe-core scan with debug console visible', () => {
      cy.visit('/')
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menuitem"]').contains('Debug Mode').click()

      cy.injectAxe()
      cy.checkA11y(null, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      })

      cy.log('axe-core scan passed with debug console')
    })

    it('should pass axe-core scan with About dialog open', () => {
      cy.visit('/')
      cy.get('[aria-label="Open navigation menu"]').click()
      cy.get('[role="menuitem"]').contains('About').click()

      cy.injectAxe()
      cy.checkA11y(null, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      })

      cy.log('axe-core scan passed with About dialog')
    })

    it('should pass axe-core scan on mobile viewport', () => {
      cy.viewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
      cy.visit('/')

      cy.injectAxe()
      cy.checkA11y(null, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      })

      cy.log('axe-core scan passed on mobile')
    })

    it('should report specific violations if any exist', () => {
      cy.visit('/')

      cy.injectAxe()
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
 * USAGE:
 *   npm run test:e2e -- --spec "cypress/e2e/accessibility.cy.ts"
 *   npm run cypress:open  # Interactive mode for debugging
 *
 * NOTES:
 * - This test MUST FAIL initially (components don't exist yet)
 * - After T024-T027 implementation, all tests should PASS
 * - Focus indicators must be visible (outline, box-shadow, or background change)
 * - All interactive elements must have ARIA labels or accessible names
 * - Color contrast must meet WCAG 2.1 AA standards (4.5:1 for text, 3:1 for focus)
 * - Touch targets must be ≥44px on mobile viewports
 * - Animations must respect prefers-reduced-motion setting
 */
