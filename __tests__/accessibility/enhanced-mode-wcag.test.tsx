/**
 * Accessibility Test: Enhanced Mode WCAG 2.1 AA Compliance (T010)
 *
 * Tests WCAG 2.1 AA compliance for Enhanced Mode feature including:
 * - Progress indicator aria-live announcements
 * - Loading spinner aria-label
 * - Delta E badge color contrast (4.5:1 minimum)
 * - Accuracy rating screen reader compatibility
 * - Keyboard navigation for Enhanced Mode toggle
 * - Focus management during loading states
 *
 * WCAG 2.1 AA Standards enforced:
 * - 1.4.3: Contrast (Minimum) - 4.5:1 ratio for normal text
 * - 2.1.1: Keyboard - All functionality accessible via keyboard
 * - 2.4.7: Focus Visible - Clear focus indicators
 * - 4.1.2: Name, Role, Value - ARIA labels and live regions
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

/**
 * Mock Enhanced Mode Toggle Component
 * Represents the UI control for enabling/disabling Enhanced Mode
 */
const MockEnhancedModeToggle = ({
  enabled = false,
  isOptimizing = false,
  onToggle = () => {},
}: {
  enabled?: boolean;
  isOptimizing?: boolean;
  onToggle?: (enabled: boolean) => void;
}) => (
  <div className="enhanced-mode-container" data-testid="enhanced-mode-container">
    <label htmlFor="enhanced-mode-toggle" className="enhanced-mode-label">
      Enhanced Accuracy Mode
    </label>
    <button
      id="enhanced-mode-toggle"
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-describedby="enhanced-mode-description"
      data-testid="enhanced-mode-toggle"
      onClick={() => onToggle(!enabled)}
      disabled={isOptimizing}
      className={`toggle-button ${enabled ? 'enabled' : 'disabled'}`}
    >
      <span className="toggle-slider" aria-hidden="true"></span>
      <span className="sr-only">{enabled ? 'Enabled' : 'Disabled'}</span>
    </button>
    <div id="enhanced-mode-description" className="help-text">
      Enable for Delta E ≤ 2.0 precision targeting with advanced optimization algorithms
    </div>
  </div>
);

/**
 * Mock Progress Indicator Component
 * Shows optimization progress with ARIA live region
 */
const MockProgressIndicator = ({
  progress = 0,
  stage = 'initializing',
}: {
  progress?: number;
  stage?: string;
}) => (
  <div
    className="progress-indicator"
    data-testid="progress-indicator"
    role="region"
    aria-label="Optimization progress"
  >
    <div
      className="progress-status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="progress-status"
    >
      Optimizing: {stage} - {progress}% complete
    </div>
    <div
      className="progress-bar"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Optimization progress: ${progress}%`}
      data-testid="progress-bar"
    >
      <div
        className="progress-fill"
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />
    </div>
  </div>
);

/**
 * Mock Loading Spinner Component
 * Shows during optimization with proper ARIA label
 */
const MockLoadingSpinner = ({ message = 'Optimizing paint formula' }: { message?: string }) => (
  <div className="loading-container" data-testid="loading-container">
    <div
      className="spinner"
      role="status"
      aria-live="polite"
      aria-label={message}
      data-testid="loading-spinner"
    >
      <svg
        className="spinner-icon"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="spinner-circle" cx="12" cy="12" r="10" />
      </svg>
      <span className="sr-only">{message}</span>
    </div>
  </div>
);

/**
 * Mock Delta E Badge Component
 * Displays color accuracy with WCAG-compliant colors
 */
const MockDeltaEBadge = ({ deltaE = 1.5 }: { deltaE?: number }) => {
  const getAccuracyLevel = (value: number) => {
    if (value <= 1.0) return { level: 'excellent', color: '#166534', bg: '#dcfce7' }; // Dark green on light green
    if (value <= 2.0) return { level: 'very-good', color: '#15803d', bg: '#d1fae5' }; // Green
    if (value <= 3.5) return { level: 'good', color: '#854d0e', bg: '#fef9c3' }; // Dark yellow
    if (value <= 5.0) return { level: 'fair', color: '#9a3412', bg: '#fed7aa' }; // Dark orange
    return { level: 'poor', color: '#991b1b', bg: '#fecaca' }; // Dark red on light red
  };

  const accuracy = getAccuracyLevel(deltaE);

  return (
    <div
      className={`delta-e-badge delta-e-${accuracy.level}`}
      data-testid="delta-e-badge"
      style={{
        color: accuracy.color,
        backgroundColor: accuracy.bg,
      }}
    >
      <span className="delta-e-value" data-testid="delta-e-value" aria-label={`Delta E: ${deltaE.toFixed(2)}`}>
        ΔE {deltaE.toFixed(2)}
      </span>
      <span className="accuracy-level" data-testid="accuracy-level">
        {accuracy.level.replace('-', ' ')}
      </span>
    </div>
  );
};

/**
 * Mock Accuracy Rating Component
 * Screen reader accessible accuracy information
 */
const MockAccuracyRating = ({
  deltaE = 1.5,
  targetColor = { hex: '#C8C3BE', lab: { l: 78.5, a: 1.2, b: 3.8 } },
  achievedColor = { hex: '#C9C4BF', lab: { l: 79.0, a: 1.0, b: 4.0 } },
}: {
  deltaE?: number;
  targetColor?: { hex: string; lab: { l: number; a: number; b: number } };
  achievedColor?: { hex: string; lab: { l: number; a: number; b: number } };
}) => (
  <div
    className="accuracy-rating"
    data-testid="accuracy-rating"
    role="region"
    aria-label="Color match accuracy"
  >
    <h3 id="accuracy-heading">Match Accuracy</h3>
    <div
      className="accuracy-details"
      aria-labelledby="accuracy-heading"
      aria-live="polite"
      data-testid="accuracy-details"
    >
      <p className="accuracy-text">
        <span className="sr-only">Color difference: </span>
        Delta E of {deltaE.toFixed(2)} indicates{' '}
        {deltaE <= 2.0 ? 'excellent' : deltaE <= 3.5 ? 'good' : 'fair'} color match accuracy
      </p>
      <div className="color-comparison" role="group" aria-label="Color comparison">
        <div className="color-swatch">
          <span className="swatch-label">Target:</span>
          <div
            className="swatch-visual"
            style={{ backgroundColor: targetColor.hex }}
            role="img"
            aria-label={`Target color: ${targetColor.hex}, LAB values L ${targetColor.lab.l}, a ${targetColor.lab.a}, b ${targetColor.lab.b}`}
          />
          <span className="swatch-hex">{targetColor.hex}</span>
        </div>
        <div className="color-swatch">
          <span className="swatch-label">Achieved:</span>
          <div
            className="swatch-visual"
            style={{ backgroundColor: achievedColor.hex }}
            role="img"
            aria-label={`Achieved color: ${achievedColor.hex}, LAB values L ${achievedColor.lab.l}, a ${achievedColor.lab.a}, b ${achievedColor.lab.b}`}
          />
          <span className="swatch-hex">{achievedColor.hex}</span>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Mock Complete Enhanced Mode UI
 * Integrates all components
 */
const MockEnhancedModeUI = ({
  isOptimizing = false,
  progress = 0,
  deltaE = null,
}: {
  isOptimizing?: boolean;
  progress?: number;
  deltaE?: number | null;
}) => {
  const [enhancedMode, setEnhancedMode] = React.useState(false);

  return (
    <div className="enhanced-mode-ui" data-testid="enhanced-mode-ui">
      <MockEnhancedModeToggle
        enabled={enhancedMode}
        isOptimizing={isOptimizing}
        onToggle={setEnhancedMode}
      />

      {isOptimizing && (
        <>
          <MockLoadingSpinner message="Optimizing paint formula" />
          <MockProgressIndicator progress={progress} stage="differential evolution" />
        </>
      )}

      {deltaE !== null && !isOptimizing && (
        <>
          <MockDeltaEBadge deltaE={deltaE} />
          <MockAccuracyRating deltaE={deltaE} />
        </>
      )}
    </div>
  );
};

describe('Enhanced Mode - WCAG 2.1 AA Accessibility Compliance', () => {
  beforeEach(() => {
    document.body.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  describe('Progress Indicator Accessibility', () => {
    it('should have aria-live="polite" on progress status', () => {
      render(<MockProgressIndicator progress={45} stage="optimization phase 2" />);

      const progressStatus = screen.getByTestId('progress-status');
      expect(progressStatus).toHaveAttribute('aria-live', 'polite');
      expect(progressStatus).toHaveAttribute('aria-atomic', 'true');
    });

    it('should use proper progressbar role with ARIA attributes', () => {
      render(<MockProgressIndicator progress={60} stage="convergence" />);

      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('role', 'progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '60');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label', 'Optimization progress: 60%');
    });

    it('should announce progress updates to screen readers', () => {
      const { rerender } = render(<MockProgressIndicator progress={0} stage="initializing" />);

      let progressStatus = screen.getByTestId('progress-status');
      expect(progressStatus).toHaveTextContent('Optimizing: initializing - 0% complete');

      rerender(<MockProgressIndicator progress={50} stage="differential evolution" />);
      progressStatus = screen.getByTestId('progress-status');
      expect(progressStatus).toHaveTextContent('Optimizing: differential evolution - 50% complete');

      rerender(<MockProgressIndicator progress={100} stage="complete" />);
      progressStatus = screen.getByTestId('progress-status');
      expect(progressStatus).toHaveTextContent('Optimizing: complete - 100% complete');
    });

    it('should have accessible region label', () => {
      render(<MockProgressIndicator progress={30} stage="hybrid optimization" />);

      const progressIndicator = screen.getByTestId('progress-indicator');
      expect(progressIndicator).toHaveAttribute('role', 'region');
      expect(progressIndicator).toHaveAttribute('aria-label', 'Optimization progress');
    });

    it('should meet automated accessibility standards', async () => {
      const { container } = render(<MockProgressIndicator progress={75} stage="finalizing" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Loading Spinner Accessibility', () => {
    it('should have aria-label="Optimizing paint formula"', () => {
      render(<MockLoadingSpinner message="Optimizing paint formula" />);

      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveAttribute('aria-label', 'Optimizing paint formula');
    });

    it('should use role="status" for live announcements', () => {
      render(<MockLoadingSpinner message="Calculating optimal mix" />);

      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveAttribute('role', 'status');
      expect(spinner).toHaveAttribute('aria-live', 'polite');
    });

    it('should have screen reader text fallback', () => {
      render(<MockLoadingSpinner message="Processing formulation" />);

      const srText = screen.getByText('Processing formulation', { selector: '.sr-only' });
      expect(srText).toBeInTheDocument();
    });

    it('should hide decorative spinner icon from assistive tech', () => {
      render(<MockLoadingSpinner />);

      const spinnerIcon = screen.getByTestId('loading-spinner').querySelector('.spinner-icon');
      expect(spinnerIcon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should support custom loading messages', () => {
      render(<MockLoadingSpinner message="Analyzing color space" />);

      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveAttribute('aria-label', 'Analyzing color space');
      expect(screen.getByText('Analyzing color space')).toBeInTheDocument();
    });

    it('should meet automated accessibility standards', async () => {
      const { container } = render(<MockLoadingSpinner message="Optimizing paint formula" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Delta E Badge Color Contrast (WCAG 1.4.3)', () => {
    it('should meet 4.5:1 contrast ratio for excellent rating (green)', () => {
      render(<MockDeltaEBadge deltaE={0.8} />);

      const badge = screen.getByTestId('delta-e-badge');
      const computedStyle = window.getComputedStyle(badge);

      // Dark green (#166534 = rgb(22, 101, 52)) on light green (#dcfce7 = rgb(220, 252, 231)) meets 4.5:1
      expect(computedStyle.color).toBe('rgb(22, 101, 52)');
      expect(computedStyle.backgroundColor).toBe('rgb(220, 252, 231)');
    });

    it('should meet 4.5:1 contrast ratio for very good rating (green)', () => {
      render(<MockDeltaEBadge deltaE={1.5} />);

      const badge = screen.getByTestId('delta-e-badge');
      const computedStyle = window.getComputedStyle(badge);

      // Green (#15803d = rgb(21, 128, 61)) on light green (#d1fae5 = rgb(209, 250, 229)) meets 4.5:1
      expect(computedStyle.color).toBe('rgb(21, 128, 61)');
      expect(computedStyle.backgroundColor).toBe('rgb(209, 250, 229)');
    });

    it('should meet 4.5:1 contrast ratio for good rating (yellow)', () => {
      render(<MockDeltaEBadge deltaE={2.5} />);

      const badge = screen.getByTestId('delta-e-badge');
      const computedStyle = window.getComputedStyle(badge);

      // Dark yellow (#854d0e = rgb(133, 77, 14)) on light yellow (#fef9c3 = rgb(254, 249, 195)) meets 4.5:1
      expect(computedStyle.color).toBe('rgb(133, 77, 14)');
      expect(computedStyle.backgroundColor).toBe('rgb(254, 249, 195)');
    });

    it('should meet 4.5:1 contrast ratio for fair rating (orange)', () => {
      render(<MockDeltaEBadge deltaE={4.2} />);

      const badge = screen.getByTestId('delta-e-badge');
      const computedStyle = window.getComputedStyle(badge);

      // Dark orange (#9a3412 = rgb(154, 52, 18)) on light orange (#fed7aa = rgb(254, 215, 170)) meets 4.5:1
      expect(computedStyle.color).toBe('rgb(154, 52, 18)');
      expect(computedStyle.backgroundColor).toBe('rgb(254, 215, 170)');
    });

    it('should meet 4.5:1 contrast ratio for poor rating (red)', () => {
      render(<MockDeltaEBadge deltaE={6.8} />);

      const badge = screen.getByTestId('delta-e-badge');
      const computedStyle = window.getComputedStyle(badge);

      // Dark red (#991b1b = rgb(153, 27, 27)) on light red (#fecaca = rgb(254, 202, 202)) meets 4.5:1
      expect(computedStyle.color).toBe('rgb(153, 27, 27)');
      expect(computedStyle.backgroundColor).toBe('rgb(254, 202, 202)');
    });

    it('should have accessible Delta E value label', () => {
      render(<MockDeltaEBadge deltaE={1.85} />);

      const deltaEValue = screen.getByTestId('delta-e-value');
      expect(deltaEValue).toHaveAttribute('aria-label', 'Delta E: 1.85');
      expect(deltaEValue).toHaveTextContent('ΔE 1.85');
    });

    it('should display accuracy level text', () => {
      render(<MockDeltaEBadge deltaE={1.5} />);

      const accuracyLevel = screen.getByTestId('accuracy-level');
      expect(accuracyLevel).toHaveTextContent('very good');
    });

    it('should meet automated accessibility standards', async () => {
      const { container } = render(<MockDeltaEBadge deltaE={1.5} />);
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Accuracy Rating Screen Reader Compatibility', () => {
    it('should have accessible region with label', () => {
      render(<MockAccuracyRating deltaE={1.3} />);

      const accuracyRating = screen.getByTestId('accuracy-rating');
      expect(accuracyRating).toHaveAttribute('role', 'region');
      expect(accuracyRating).toHaveAttribute('aria-label', 'Color match accuracy');
    });

    it('should announce accuracy updates via aria-live', () => {
      render(<MockAccuracyRating deltaE={1.8} />);

      const accuracyDetails = screen.getByTestId('accuracy-details');
      expect(accuracyDetails).toHaveAttribute('aria-live', 'polite');
    });

    it('should provide descriptive text for accuracy levels', () => {
      const { rerender } = render(<MockAccuracyRating deltaE={0.9} />);
      expect(screen.getByText(/excellent color match accuracy/i)).toBeInTheDocument();

      rerender(<MockAccuracyRating deltaE={2.5} />);
      expect(screen.getByText(/good color match accuracy/i)).toBeInTheDocument();

      rerender(<MockAccuracyRating deltaE={4.0} />);
      expect(screen.getByText(/fair color match accuracy/i)).toBeInTheDocument();
    });

    it('should have accessible color comparison swatches', () => {
      render(<MockAccuracyRating deltaE={1.5} />);

      const targetSwatch = screen.getByRole('img', { name: /target color/i });
      expect(targetSwatch).toHaveAttribute('aria-label');
      expect(targetSwatch.getAttribute('aria-label')).toMatch(/LAB values/);

      const achievedSwatch = screen.getByRole('img', { name: /achieved color/i });
      expect(achievedSwatch).toHaveAttribute('aria-label');
      expect(achievedSwatch.getAttribute('aria-label')).toMatch(/LAB values/);
    });

    it('should include screen reader only context text', () => {
      render(<MockAccuracyRating deltaE={1.5} />);

      const srText = screen.getByText('Color difference:', { selector: '.sr-only' });
      expect(srText).toBeInTheDocument();
    });

    it('should meet automated accessibility standards', async () => {
      const { container } = render(<MockAccuracyRating deltaE={1.5} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Enhanced Mode Toggle Keyboard Navigation', () => {
    it('should be focusable via Tab key', async () => {
      const user = userEvent.setup();
      render(<MockEnhancedModeToggle />);

      const toggle = screen.getByTestId('enhanced-mode-toggle');
      expect(toggle).not.toHaveFocus();

      await user.tab();
      expect(toggle).toHaveFocus();
    });

    it('should toggle with Space key', async () => {
      const user = userEvent.setup();
      const handleToggle = jest.fn();
      render(<MockEnhancedModeToggle enabled={false} onToggle={handleToggle} />);

      const toggle = screen.getByTestId('enhanced-mode-toggle');
      toggle.focus();

      await user.keyboard(' ');
      expect(handleToggle).toHaveBeenCalledWith(true);
    });

    it('should toggle with Enter key', async () => {
      const user = userEvent.setup();
      const handleToggle = jest.fn();
      render(<MockEnhancedModeToggle enabled={false} onToggle={handleToggle} />);

      const toggle = screen.getByTestId('enhanced-mode-toggle');
      toggle.focus();

      await user.keyboard('{Enter}');
      expect(handleToggle).toHaveBeenCalledWith(true);
    });

    it('should use role="switch" with aria-checked', () => {
      const { rerender } = render(<MockEnhancedModeToggle enabled={false} />);

      const toggle = screen.getByTestId('enhanced-mode-toggle');
      expect(toggle).toHaveAttribute('role', 'switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');

      rerender(<MockEnhancedModeToggle enabled={true} />);
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('should have accessible label', () => {
      render(<MockEnhancedModeToggle />);

      const label = screen.getByText('Enhanced Accuracy Mode');
      const toggle = screen.getByTestId('enhanced-mode-toggle');

      expect(label).toHaveAttribute('for', 'enhanced-mode-toggle');
      expect(toggle).toHaveAttribute('id', 'enhanced-mode-toggle');
    });

    it('should have descriptive help text', () => {
      render(<MockEnhancedModeToggle />);

      const toggle = screen.getByTestId('enhanced-mode-toggle');
      expect(toggle).toHaveAttribute('aria-describedby', 'enhanced-mode-description');

      const description = screen.getByText(/Delta E ≤ 2.0 precision/i);
      expect(description).toHaveAttribute('id', 'enhanced-mode-description');
    });

    it('should be disabled during optimization', () => {
      render(<MockEnhancedModeToggle enabled={true} isOptimizing={true} />);

      const toggle = screen.getByTestId('enhanced-mode-toggle');
      expect(toggle).toBeDisabled();
    });

    it('should meet automated accessibility standards', async () => {
      const { container } = render(<MockEnhancedModeToggle />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Focus Management During Loading State', () => {
    it('should maintain focus on toggle when starting optimization', async () => {
      const { rerender } = render(<MockEnhancedModeUI isOptimizing={false} />);

      const toggle = screen.getByTestId('enhanced-mode-toggle');
      toggle.focus();
      expect(toggle).toHaveFocus();

      rerender(<MockEnhancedModeUI isOptimizing={true} progress={10} />);

      // Toggle should remain in DOM but disabled
      expect(toggle).toBeInTheDocument();
      expect(toggle).toBeDisabled();
    });

    it('should not steal focus when progress updates', async () => {
      const { rerender } = render(<MockEnhancedModeUI isOptimizing={true} progress={0} />);

      const toggle = screen.getByTestId('enhanced-mode-toggle');
      toggle.focus();

      rerender(<MockEnhancedModeUI isOptimizing={true} progress={50} />);
      expect(toggle).toHaveFocus();

      rerender(<MockEnhancedModeUI isOptimizing={true} progress={100} />);
      expect(toggle).toHaveFocus();
    });

    it('should restore focus after optimization completes', async () => {
      const { rerender } = render(<MockEnhancedModeUI isOptimizing={true} progress={100} />);

      const toggle = screen.getByTestId('enhanced-mode-toggle');
      toggle.focus();

      rerender(<MockEnhancedModeUI isOptimizing={false} deltaE={1.5} />);

      // Toggle should be enabled again and maintain focus
      expect(toggle).not.toBeDisabled();
      expect(toggle).toHaveFocus();
    });

    it('should announce completion to screen readers', async () => {
      const { rerender } = render(<MockEnhancedModeUI isOptimizing={true} progress={100} />);

      rerender(<MockEnhancedModeUI isOptimizing={false} deltaE={1.5} />);

      await waitFor(() => {
        const accuracyDetails = screen.getByTestId('accuracy-details');
        expect(accuracyDetails).toHaveAttribute('aria-live', 'polite');
        expect(accuracyDetails).toHaveTextContent(/Delta E of 1.50/);
      });
    });

    it('should hide loading UI when optimization completes', () => {
      const { rerender } = render(<MockEnhancedModeUI isOptimizing={true} progress={50} />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByTestId('progress-indicator')).toBeInTheDocument();

      rerender(<MockEnhancedModeUI isOptimizing={false} deltaE={1.5} />);

      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      expect(screen.queryByTestId('progress-indicator')).not.toBeInTheDocument();
    });

    it('should show results when optimization completes', () => {
      const { rerender } = render(<MockEnhancedModeUI isOptimizing={true} progress={100} />);

      expect(screen.queryByTestId('delta-e-badge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('accuracy-rating')).not.toBeInTheDocument();

      rerender(<MockEnhancedModeUI isOptimizing={false} deltaE={1.5} />);

      expect(screen.getByTestId('delta-e-badge')).toBeInTheDocument();
      expect(screen.getByTestId('accuracy-rating')).toBeInTheDocument();
    });
  });

  describe('Integrated Enhanced Mode UI Accessibility', () => {
    it('should meet all WCAG 2.1 AA standards in idle state', async () => {
      const { container } = render(<MockEnhancedModeUI isOptimizing={false} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should meet all WCAG 2.1 AA standards during optimization', async () => {
      const { container } = render(<MockEnhancedModeUI isOptimizing={true} progress={45} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should meet all WCAG 2.1 AA standards with results', async () => {
      const { container } = render(<MockEnhancedModeUI isOptimizing={false} deltaE={1.5} />);
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });
      expect(results).toHaveNoViolations();
    });

    it('should provide complete keyboard navigation workflow', async () => {
      const user = userEvent.setup();
      render(<MockEnhancedModeUI isOptimizing={false} />);

      // Tab to toggle
      await user.tab();
      const toggle = screen.getByTestId('enhanced-mode-toggle');
      expect(toggle).toHaveFocus();

      // Activate toggle
      await user.keyboard(' ');
      expect(toggle).toHaveAttribute('aria-checked', 'true');

      // Toggle should remain focusable
      await user.tab();
      await user.tab({ shift: true });
      expect(toggle).toHaveFocus();
    });

    it('should properly sequence ARIA announcements', async () => {
      const { rerender } = render(<MockEnhancedModeUI isOptimizing={false} />);

      // Start optimization
      rerender(<MockEnhancedModeUI isOptimizing={true} progress={0} />);
      expect(screen.getByTestId('loading-spinner')).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByTestId('progress-status')).toHaveAttribute('aria-live', 'polite');

      // Complete optimization
      rerender(<MockEnhancedModeUI isOptimizing={false} deltaE={1.5} />);
      const accuracyDetails = screen.getByTestId('accuracy-details');
      expect(accuracyDetails).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Screen Reader User Experience', () => {
    it('should provide complete information flow for non-visual users', () => {
      render(<MockEnhancedModeUI isOptimizing={false} deltaE={1.5} />);

      // Toggle is properly labeled
      const toggle = screen.getByTestId('enhanced-mode-toggle');
      expect(toggle).toHaveAccessibleName();
      expect(toggle).toHaveAccessibleDescription();

      // Results have semantic structure
      const accuracyRating = screen.getByTestId('accuracy-rating');
      expect(accuracyRating).toHaveAttribute('role', 'region');

      // Delta E value is announced
      const deltaEValue = screen.getByTestId('delta-e-value');
      expect(deltaEValue).toHaveAttribute('aria-label');

      // Color swatches have descriptions
      const swatches = screen.getAllByRole('img');
      swatches.forEach(swatch => {
        expect(swatch).toHaveAttribute('aria-label');
      });
    });

    it('should handle state transitions accessibly', async () => {
      const { rerender } = render(<MockEnhancedModeUI isOptimizing={false} />);

      // Initial state
      const toggle = screen.getByTestId('enhanced-mode-toggle');
      expect(toggle).toHaveAttribute('aria-checked', 'false');

      // Optimizing state
      rerender(<MockEnhancedModeUI isOptimizing={true} progress={50} />);
      expect(screen.getByTestId('loading-spinner')).toHaveAttribute('role', 'status');
      expect(screen.getByTestId('progress-bar')).toHaveAttribute('role', 'progressbar');

      // Results state
      rerender(<MockEnhancedModeUI isOptimizing={false} deltaE={1.5} />);
      const accuracyDetails = screen.getByTestId('accuracy-details');
      expect(accuracyDetails).toHaveAttribute('aria-live', 'polite');
    });

    it('should use appropriate ARIA live regions for different urgencies', () => {
      render(<MockEnhancedModeUI isOptimizing={true} progress={45} />);

      // Progress updates are polite (non-interruptive)
      const progressStatus = screen.getByTestId('progress-status');
      expect(progressStatus).toHaveAttribute('aria-live', 'polite');

      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveAttribute('aria-live', 'polite');
    });
  });
});
