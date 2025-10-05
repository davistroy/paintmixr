/**
 * Component Interface Contracts
 *
 * TypeScript interfaces for React components affected by bug fixes.
 * These define the expected props and behavior for each component.
 */

// Enhanced Mode Checkbox Props
export interface EnhancedModeCheckboxProps {
  checked: boolean                          // Current mode state
  disabled: boolean                         // FR-001a: Disable during calculation
  onCheckedChange: (checked: boolean) => void // Handler for mode toggle
}

// Save Session Dialog Props
export interface SaveSessionDialogProps {
  open: boolean                             // Dialog open state
  onOpenChange: (open: boolean) => void     // Dialog visibility control
  sessionData: SessionData                  // Session to save
  onSaveSuccess?: () => void                // FR-003, FR-004: Callback after successful save
}

// Session Data passed to Save Dialog
export interface SessionData {
  targetColor: {
    lab: LABColor
    hex: string
  }
  inputMethod: 'color_picker' | 'hex_code' | 'image_upload'  // FR-005
  mode: 'Standard' | 'Enhanced' | 'Ratio Prediction'         // FR-011
  result: Formula | PredictedColor
  deltaE?: number  // For matching modes only
}

// LAB Color representation
export interface LABColor {
  l: number  // Lightness (0-100)
  a: number  // Green-Red axis
  b: number  // Blue-Yellow axis
}

// Formula result (for Standard/Enhanced modes)
export interface Formula {
  paints: Array<{
    paintId: string
    name: string
    volume: number
  }>
  totalVolume: number
  achievedColor: LABColor
  deltaE: number
}

// Predicted color result (for Ratio Prediction mode)
export interface PredictedColor {
  resultColor: LABColor
  resultHex: string
  mixedPaints: Array<{
    paintId: string
    name: string
    volume: number
  }>
}

// Ratio Prediction Form Props
export interface RatioPredictionFormProps {
  paints: Paint[]                                           // Available paints
  onPredict: (selections: PaintSelection[]) => Promise<void> // Prediction handler
  disabled?: boolean                                        // Optional: disable during calculation
}

// Paint entity
export interface Paint {
  id: string
  name: string
  color: {
    lab: LABColor
    hex: string
  }
  opacity: number     // 0-1
  kmCoefficients: {
    k: number  // Absorption
    s: number  // Scattering
  }
}

// Paint selection for ratio prediction
export interface PaintSelection {
  paintId: string
  volume: number  // Must be 5-1000ml (validated by volume-validation.schema.ts)
}
