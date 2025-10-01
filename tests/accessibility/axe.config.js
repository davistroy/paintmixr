// Axe accessibility testing configuration
module.exports = {
  rules: {
    // Core accessibility rules
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'aria-labels': { enabled: true },
    'focus-management': { enabled: true },
    'semantic-structure': { enabled: true },

    // WCAG 2.1 AA compliance
    'wcag2a': { enabled: true },
    'wcag2aa': { enabled: true },
    'wcag21aa': { enabled: true },

    // Paint mixing specific rules
    'color-picker-accessibility': {
      enabled: true,
      selector: '[data-testid*="color-picker"]',
      checks: ['aria-label', 'keyboard-navigable', 'color-contrast']
    },

    'optimization-controls-accessibility': {
      enabled: true,
      selector: '[data-testid*="optimization-controls"]',
      checks: ['form-labels', 'validation-messages', 'button-states']
    },

    'results-table-accessibility': {
      enabled: true,
      selector: '[role="table"]',
      checks: ['table-headers', 'table-caption', 'row-headers']
    },

    // High contrast mode support
    'high-contrast-mode': {
      enabled: true,
      checks: ['forced-colors-mode', 'color-scheme']
    },

    // Mobile accessibility
    'touch-target-size': {
      enabled: true,
      minimumSize: 44 // pixels
    },

    'mobile-navigation': {
      enabled: true,
      checks: ['swipe-gestures', 'orientation-support']
    }
  },

  // Tags to include in testing
  tags: [
    'wcag2a',
    'wcag2aa',
    'wcag21aa',
    'best-practice',
    'section508'
  ],

  // Global configuration
  locale: 'en',

  // Performance settings
  timeout: 10000,

  // Reporting options
  reporter: 'v2',
  reporterOptions: {
    outputDir: './tests/accessibility/reports',
    outputFormat: ['html', 'json'],
    createReportFile: true
  },

  // Custom checks for paint mixing application
  checks: {
    'lab-color-announcements': {
      impact: 'serious',
      messages: {
        pass: 'LAB color values are properly announced to screen readers',
        fail: 'LAB color values must be announced with proper units and context'
      },
      evaluate: function(node) {
        const labInputs = node.querySelectorAll('[data-testid*="lab"]');
        return Array.from(labInputs).every(input => {
          const label = input.getAttribute('aria-label') || '';
          return label.includes('Lightness') || label.includes('axis') || label.includes('range');
        });
      }
    },

    'delta-e-accessibility': {
      impact: 'moderate',
      messages: {
        pass: 'Delta E values are accessible to screen readers',
        fail: 'Delta E values need proper labeling and context'
      },
      evaluate: function(node) {
        const deltaElements = node.querySelectorAll('[data-testid*="delta-e"]');
        return Array.from(deltaElements).every(element => {
          return element.hasAttribute('aria-label') ||
                 element.hasAttribute('aria-labelledby') ||
                 element.hasAttribute('aria-describedby');
        });
      }
    },

    'optimization-progress-announcements': {
      impact: 'serious',
      messages: {
        pass: 'Optimization progress is announced to assistive technologies',
        fail: 'Optimization progress must be announced using aria-live regions'
      },
      evaluate: function(node) {
        const progressElements = node.querySelectorAll('[data-testid*="progress"]');
        return Array.from(progressElements).some(element => {
          return element.hasAttribute('aria-live') ||
                 element.hasAttribute('role') && element.getAttribute('role') === 'status';
        });
      }
    },

    'paint-volume-precision': {
      impact: 'moderate',
      messages: {
        pass: 'Paint volume precision is clearly communicated',
        fail: 'Paint volumes should indicate 0.1ml precision for enhanced accuracy'
      },
      evaluate: function(node) {
        const volumeElements = node.querySelectorAll('[data-testid*="volume"]');
        return Array.from(volumeElements).every(element => {
          const text = element.textContent || '';
          const ariaLabel = element.getAttribute('aria-label') || '';
          return (text + ariaLabel).includes('ml') || (text + ariaLabel).includes('milliliter');
        });
      }
    }
  },

  // Exclude certain elements from testing
  exclude: [
    '.third-party-widget',
    '[data-testid="color-wheel-canvas"]', // Canvas elements handled separately
    '.advertisement',
    '.analytics-tracker'
  ],

  // Include specific selectors for comprehensive testing
  include: [
    '[data-testid*="color-picker"]',
    '[data-testid*="optimization"]',
    '[data-testid*="paint"]',
    '[role="main"]',
    '[role="navigation"]',
    '[role="complementary"]',
    'form',
    'table',
    'button',
    'input',
    'select',
    'textarea'
  ],

  // Custom error handling
  onError: function(error) {
    console.error('Accessibility testing error:', error);
    return true; // Continue testing despite errors
  },

  // Environment-specific settings
  environment: {
    // Mock window.matchMedia for testing responsive accessibility
    matchMedia: true,

    // Mock high contrast mode detection
    prefersContrast: 'high',

    // Mock reduced motion preference
    prefersReducedMotion: false,

    // Mock screen reader detection
    screenReader: true
  }
};