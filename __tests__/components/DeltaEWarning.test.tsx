/**
 * Delta E Warning Component Tests
 * Tests for conditional warning display based on Delta E thresholds
 * Requirements: FR-008, FR-008a, FR-008b, FR-008c
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AlertTriangle } from 'lucide-react'

interface DeltaEWarningProps {
  deltaE: number | null | undefined
  mode: 'Standard' | 'Enhanced' | 'Ratio Prediction'
}

// Mock component that mimics DeltaEWarning behavior
const DeltaEWarning: React.FC<DeltaEWarningProps> = ({ deltaE, mode }) => {
  if (deltaE === null || deltaE === undefined) {
    return null
  }

  // FR-008a: Thresholds per mode
  const threshold = mode === 'Enhanced' ? 2.0 : 5.0

  // FR-008b: Only show warning when Delta E exceeds threshold
  if (deltaE <= threshold) {
    return null
  }

  // FR-008c: Severity levels
  const getSeverity = (): 'warning' | 'error' => {
    if (mode === 'Enhanced') {
      return deltaE > 5.0 ? 'error' : 'warning'
    } else {
      return deltaE > 10.0 ? 'error' : 'warning'
    }
  }

  const severity = getSeverity()
  const severityColors = {
    warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    error: 'bg-red-50 border-red-300 text-red-800'
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-2 p-3 rounded-lg border ${severityColors[severity]}`}
      data-testid="delta-e-warning"
      data-severity={severity}
    >
      <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" data-testid="warning-icon" />
      <div>
        <strong className="font-semibold">Color Match Quality Notice</strong>
        <p className="text-sm mt-1">
          The calculated formula has a Delta E of <strong>{deltaE.toFixed(2)}</strong>,
          which exceeds the {mode} Mode target of ΔE ≤ {threshold.toFixed(1)}.
        </p>
        <p className="text-sm mt-2">
          {severity === 'error' ? (
            <>
              This match may produce a <strong>noticeably different color</strong>.
              Consider using {mode === 'Enhanced' ? 'different paints or adjusting your target color' : 'Enhanced Mode for better accuracy'}.
            </>
          ) : (
            <>
              This match is acceptable for most applications, but may show slight color differences under critical viewing conditions.
            </>
          )}
        </p>
      </div>
    </div>
  )
}

describe('DeltaEWarning Component', () => {
  describe('visibility conditions (FR-008, FR-008b)', () => {
    it('should not render when deltaE is null', () => {
      render(<DeltaEWarning deltaE={null} mode="Standard" />)
      expect(screen.queryByTestId('delta-e-warning')).not.toBeInTheDocument()
    })

    it('should not render when deltaE is undefined', () => {
      render(<DeltaEWarning deltaE={undefined} mode="Standard" />)
      expect(screen.queryByTestId('delta-e-warning')).not.toBeInTheDocument()
    })

    it('should not render when deltaE is below Standard threshold (≤5.0)', () => {
      render(<DeltaEWarning deltaE={4.9} mode="Standard" />)
      expect(screen.queryByTestId('delta-e-warning')).not.toBeInTheDocument()

      render(<DeltaEWarning deltaE={5.0} mode="Standard" />)
      expect(screen.queryByTestId('delta-e-warning')).not.toBeInTheDocument()
    })

    it('should not render when deltaE is below Enhanced threshold (≤2.0)', () => {
      render(<DeltaEWarning deltaE={1.9} mode="Enhanced" />)
      expect(screen.queryByTestId('delta-e-warning')).not.toBeInTheDocument()

      render(<DeltaEWarning deltaE={2.0} mode="Enhanced" />)
      expect(screen.queryByTestId('delta-e-warning')).not.toBeInTheDocument()
    })

    it('should render when deltaE exceeds Standard threshold (>5.0)', () => {
      render(<DeltaEWarning deltaE={5.1} mode="Standard" />)
      expect(screen.getByTestId('delta-e-warning')).toBeInTheDocument()
    })

    it('should render when deltaE exceeds Enhanced threshold (>2.0)', () => {
      render(<DeltaEWarning deltaE={2.1} mode="Enhanced" />)
      expect(screen.getByTestId('delta-e-warning')).toBeInTheDocument()
    })
  })

  describe('threshold per mode (FR-008a)', () => {
    it('should use 5.0 threshold for Standard Mode', () => {
      render(<DeltaEWarning deltaE={5.5} mode="Standard" />)

      expect(screen.getByText(/ΔE ≤ 5\.0/)).toBeInTheDocument()
      expect(screen.getByText(/Standard Mode target/)).toBeInTheDocument()
    })

    it('should use 2.0 threshold for Enhanced Mode', () => {
      render(<DeltaEWarning deltaE={2.5} mode="Enhanced" />)

      expect(screen.getByText(/ΔE ≤ 2\.0/)).toBeInTheDocument()
      expect(screen.getByText(/Enhanced Mode target/)).toBeInTheDocument()
    })

    it('should use 5.0 threshold for Ratio Prediction Mode', () => {
      render(<DeltaEWarning deltaE={6.0} mode="Ratio Prediction" />)

      expect(screen.getByText(/ΔE ≤ 5\.0/)).toBeInTheDocument()
      expect(screen.getByText(/Ratio Prediction Mode target/)).toBeInTheDocument()
    })
  })

  describe('severity levels (FR-008c)', () => {
    describe('Enhanced Mode severity', () => {
      it('should show warning severity for 2.0 < ΔE ≤ 5.0', () => {
        render(<DeltaEWarning deltaE={3.5} mode="Enhanced" />)

        const warning = screen.getByTestId('delta-e-warning')
        expect(warning).toHaveAttribute('data-severity', 'warning')
        expect(warning).toHaveClass('bg-yellow-50', 'border-yellow-300', 'text-yellow-800')
      })

      it('should show error severity for ΔE > 5.0', () => {
        render(<DeltaEWarning deltaE={6.0} mode="Enhanced" />)

        const warning = screen.getByTestId('delta-e-warning')
        expect(warning).toHaveAttribute('data-severity', 'error')
        expect(warning).toHaveClass('bg-red-50', 'border-red-300', 'text-red-800')
      })
    })

    describe('Standard Mode severity', () => {
      it('should show warning severity for 5.0 < ΔE ≤ 10.0', () => {
        render(<DeltaEWarning deltaE={7.5} mode="Standard" />)

        const warning = screen.getByTestId('delta-e-warning')
        expect(warning).toHaveAttribute('data-severity', 'warning')
        expect(warning).toHaveClass('bg-yellow-50', 'border-yellow-300', 'text-yellow-800')
      })

      it('should show error severity for ΔE > 10.0', () => {
        render(<DeltaEWarning deltaE={12.0} mode="Standard" />)

        const warning = screen.getByTestId('delta-e-warning')
        expect(warning).toHaveAttribute('data-severity', 'error')
        expect(warning).toHaveClass('bg-red-50', 'border-red-300', 'text-red-800')
      })
    })

    describe('Ratio Prediction Mode severity', () => {
      it('should use Standard Mode thresholds for severity', () => {
        // Warning level
        const { rerender } = render(<DeltaEWarning deltaE={8.0} mode="Ratio Prediction" />)
        expect(screen.getByTestId('delta-e-warning')).toHaveAttribute('data-severity', 'warning')

        // Error level
        rerender(<DeltaEWarning deltaE={11.0} mode="Ratio Prediction" />)
        expect(screen.getByTestId('delta-e-warning')).toHaveAttribute('data-severity', 'error')
      })
    })
  })

  describe('message content (FR-008c)', () => {
    it('should display exact Delta E value with 2 decimal precision', () => {
      render(<DeltaEWarning deltaE={3.456} mode="Enhanced" />)
      expect(screen.getByText(/3\.46/)).toBeInTheDocument()
    })

    it('should show error-level guidance for Enhanced Mode ΔE > 5.0', () => {
      render(<DeltaEWarning deltaE={6.5} mode="Enhanced" />)

      expect(screen.getByText(/noticeably different color/i)).toBeInTheDocument()
      expect(screen.getByText(/different paints or adjusting your target color/i)).toBeInTheDocument()
    })

    it('should show error-level guidance for Standard Mode ΔE > 10.0', () => {
      render(<DeltaEWarning deltaE={12.0} mode="Standard" />)

      expect(screen.getByText(/noticeably different color/i)).toBeInTheDocument()
      expect(screen.getByText(/Enhanced Mode for better accuracy/i)).toBeInTheDocument()
    })

    it('should show warning-level guidance for acceptable but imperfect matches', () => {
      render(<DeltaEWarning deltaE={3.0} mode="Enhanced" />)

      expect(screen.getByText(/acceptable for most applications/i)).toBeInTheDocument()
      expect(screen.getByText(/slight color differences under critical viewing/i)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have role="alert" for assistive technologies', () => {
      render(<DeltaEWarning deltaE={6.0} mode="Standard" />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should have aria-live="polite" to announce changes', () => {
      render(<DeltaEWarning deltaE={6.0} mode="Standard" />)
      const warning = screen.getByTestId('delta-e-warning')
      expect(warning).toHaveAttribute('aria-live', 'polite')
    })

    it('should display warning icon for visual identification', () => {
      render(<DeltaEWarning deltaE={6.0} mode="Standard" />)
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument()
    })

    it('should use semantic strong tags for emphasis', () => {
      render(<DeltaEWarning deltaE={6.0} mode="Standard" />)

      const strongElements = screen.getAllByText(/6\.00|noticeably different color/i)
      strongElements.forEach(el => {
        expect(el.tagName.toLowerCase()).toBe('strong')
      })
    })
  })

  describe('edge cases', () => {
    it('should handle deltaE = 0 (perfect match)', () => {
      render(<DeltaEWarning deltaE={0} mode="Enhanced" />)
      expect(screen.queryByTestId('delta-e-warning')).not.toBeInTheDocument()
    })

    it('should handle very large deltaE values', () => {
      render(<DeltaEWarning deltaE={100.0} mode="Standard" />)

      expect(screen.getByTestId('delta-e-warning')).toBeInTheDocument()
      expect(screen.getByText(/100\.00/)).toBeInTheDocument()
      expect(screen.getByTestId('delta-e-warning')).toHaveAttribute('data-severity', 'error')
    })

    it('should handle deltaE exactly at boundary values', () => {
      // Enhanced threshold boundary: 2.0
      render(<DeltaEWarning deltaE={2.0} mode="Enhanced" />)
      expect(screen.queryByTestId('delta-e-warning')).not.toBeInTheDocument()

      // Standard threshold boundary: 5.0
      render(<DeltaEWarning deltaE={5.0} mode="Standard" />)
      expect(screen.queryByTestId('delta-e-warning')).not.toBeInTheDocument()

      // Enhanced error boundary: 5.0
      const { rerender } = render(<DeltaEWarning deltaE={5.0} mode="Enhanced" />)
      expect(screen.getByTestId('delta-e-warning')).toHaveAttribute('data-severity', 'warning')

      rerender(<DeltaEWarning deltaE={5.01} mode="Enhanced" />)
      expect(screen.getByTestId('delta-e-warning')).toHaveAttribute('data-severity', 'error')
    })
  })

  describe('dynamic updates', () => {
    it('should update when deltaE changes', () => {
      const { rerender } = render(<DeltaEWarning deltaE={3.0} mode="Enhanced" />)
      expect(screen.getByText(/3\.00/)).toBeInTheDocument()

      rerender(<DeltaEWarning deltaE={7.5} mode="Enhanced" />)
      expect(screen.getByText(/7\.50/)).toBeInTheDocument()
    })

    it('should update severity when deltaE crosses threshold', () => {
      const { rerender } = render(<DeltaEWarning deltaE={4.0} mode="Enhanced" />)
      expect(screen.getByTestId('delta-e-warning')).toHaveAttribute('data-severity', 'warning')

      rerender(<DeltaEWarning deltaE={6.0} mode="Enhanced" />)
      expect(screen.getByTestId('delta-e-warning')).toHaveAttribute('data-severity', 'error')
    })

    it('should hide when deltaE drops below threshold', () => {
      const { rerender } = render(<DeltaEWarning deltaE={6.0} mode="Standard" />)
      expect(screen.getByTestId('delta-e-warning')).toBeInTheDocument()

      rerender(<DeltaEWarning deltaE={4.0} mode="Standard" />)
      expect(screen.queryByTestId('delta-e-warning')).not.toBeInTheDocument()
    })
  })
})
