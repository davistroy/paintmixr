'use client'

import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface DeltaEWarningProps {
  deltaE: number | null | undefined
  mode: 'Standard' | 'Enhanced' | 'Ratio Prediction'
}

/**
 * DeltaEWarning Component
 * Displays warning when Delta E exceeds mode-specific thresholds
 * Requirements: FR-008, FR-008a, FR-008b, FR-008c
 */
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

export default DeltaEWarning
