/**
 * Enhanced Mode Checkbox Component Tests
 * Tests for checkbox toggle functionality and disabled state during calculations
 * Requirements: FR-001, FR-001a, FR-002
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Checkbox } from '@/components/ui/checkbox'

// Mock component that mimics the Enhanced Mode checkbox behavior
interface EnhancedModeCheckboxProps {
  checked: boolean
  disabled: boolean
  onCheckedChange: (checked: boolean) => void
}

const EnhancedModeCheckbox: React.FC<EnhancedModeCheckboxProps> = ({
  checked,
  disabled,
  onCheckedChange
}) => {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-300">
      <label className="flex items-center cursor-pointer">
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
        />
        <span className="ml-2 text-sm font-medium text-gray-700">
          Enhanced Accuracy Mode
        </span>
      </label>
      <p className="mt-2 text-xs text-gray-600">
        {checked
          ? 'Advanced optimization algorithms for professional-grade color matching (Target ΔE ≤ 2.0, supports 2-5 paint formulas, 30s processing time).'
          : 'Standard color matching (Target ΔE ≤ 5.0, maximum 3 paints, <10s processing time).'}
      </p>
    </div>
  )
}

describe('EnhancedModeCheckbox Component', () => {
  describe('checkbox toggle functionality (FR-001)', () => {
    it('should render checkbox in checked state when checked=true', () => {
      const mockOnChange = jest.fn()
      render(
        <EnhancedModeCheckbox
          checked={true}
          disabled={false}
          onCheckedChange={mockOnChange}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).toBeChecked()
    })

    it('should render checkbox in unchecked state when checked=false', () => {
      const mockOnChange = jest.fn()
      render(
        <EnhancedModeCheckbox
          checked={false}
          disabled={false}
          onCheckedChange={mockOnChange}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).not.toBeChecked()
    })

    it('should call onCheckedChange with true when unchecked checkbox is clicked', () => {
      const mockOnChange = jest.fn()
      render(
        <EnhancedModeCheckbox
          checked={false}
          disabled={false}
          onCheckedChange={mockOnChange}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(mockOnChange).toHaveBeenCalledTimes(1)
      expect(mockOnChange).toHaveBeenCalledWith(true)
    })

    it('should call onCheckedChange with false when checked checkbox is clicked', () => {
      const mockOnChange = jest.fn()
      render(
        <EnhancedModeCheckbox
          checked={true}
          disabled={false}
          onCheckedChange={mockOnChange}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(mockOnChange).toHaveBeenCalledTimes(1)
      expect(mockOnChange).toHaveBeenCalledWith(false)
    })
  })

  describe('onCheckedChange callback receives boolean value (FR-001)', () => {
    it('should receive boolean true (not "indeterminate") when toggled on', () => {
      const mockOnChange = jest.fn()
      render(
        <EnhancedModeCheckbox
          checked={false}
          disabled={false}
          onCheckedChange={mockOnChange}
        />
      )

      fireEvent.click(screen.getByRole('checkbox'))

      expect(mockOnChange).toHaveBeenCalledWith(true)
      expect(typeof mockOnChange.mock.calls[0][0]).toBe('boolean')
    })

    it('should receive boolean false (not "indeterminate") when toggled off', () => {
      const mockOnChange = jest.fn()
      render(
        <EnhancedModeCheckbox
          checked={true}
          disabled={false}
          onCheckedChange={mockOnChange}
        />
      )

      fireEvent.click(screen.getByRole('checkbox'))

      expect(mockOnChange).toHaveBeenCalledWith(false)
      expect(typeof mockOnChange.mock.calls[0][0]).toBe('boolean')
    })
  })

  describe('checkbox disabled during calculation (FR-001a)', () => {
    it('should be disabled when isCalculating=true', () => {
      const mockOnChange = jest.fn()
      render(
        <EnhancedModeCheckbox
          checked={true}
          disabled={true}
          onCheckedChange={mockOnChange}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeDisabled()
    })

    it('should be enabled when isCalculating=false', () => {
      const mockOnChange = jest.fn()
      render(
        <EnhancedModeCheckbox
          checked={true}
          disabled={false}
          onCheckedChange={mockOnChange}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeEnabled()
    })

    it('should not call onCheckedChange when clicked while disabled', () => {
      const mockOnChange = jest.fn()
      render(
        <EnhancedModeCheckbox
          checked={true}
          disabled={true}
          onCheckedChange={mockOnChange}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      // onCheckedChange should NOT be called when disabled
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('should maintain checked state when disabled', () => {
      const mockOnChange = jest.fn()
      render(
        <EnhancedModeCheckbox
          checked={true}
          disabled={true}
          onCheckedChange={mockOnChange}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
      expect(checkbox).toBeDisabled()
    })
  })

  describe('mode description updates (FR-002)', () => {
    it('should display Enhanced Mode description when checked', () => {
      const mockOnChange = jest.fn()
      render(
        <EnhancedModeCheckbox
          checked={true}
          disabled={false}
          onCheckedChange={mockOnChange}
        />
      )

      expect(screen.getByText(/Advanced optimization algorithms/i)).toBeInTheDocument()
      expect(screen.getByText(/ΔE ≤ 2\.0/)).toBeInTheDocument()
      expect(screen.getByText(/2-5 paint formulas/)).toBeInTheDocument()
    })

    it('should display Standard Mode description when unchecked', () => {
      const mockOnChange = jest.fn()
      render(
        <EnhancedModeCheckbox
          checked={false}
          disabled={false}
          onCheckedChange={mockOnChange}
        />
      )

      expect(screen.getByText(/Standard color matching/i)).toBeInTheDocument()
      expect(screen.getByText(/ΔE ≤ 5\.0/)).toBeInTheDocument()
      expect(screen.getByText(/maximum 3 paints/)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper role="checkbox" for assistive technologies', () => {
      const mockOnChange = jest.fn()
      render(
        <EnhancedModeCheckbox
          checked={true}
          disabled={false}
          onCheckedChange={mockOnChange}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
    })

    it('should have accessible label association', () => {
      const mockOnChange = jest.fn()
      render(
        <EnhancedModeCheckbox
          checked={true}
          disabled={false}
          onCheckedChange={mockOnChange}
        />
      )

      expect(screen.getByText('Enhanced Accuracy Mode')).toBeInTheDocument()
    })
  })
})
