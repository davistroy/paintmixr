/**
 * AboutDialog Component Tests
 * Tests for About dialog metadata display, close interactions, and external link attributes
 * Requirements: FR-010, FR-012, FR-013
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AboutDialog } from '@/components/AboutDialog'

// Mock ModalContext
const mockOpenModal = jest.fn()
const mockCloseModal = jest.fn()
jest.mock('@/contexts/ModalContext', () => ({
  useModal: () => ({
    openModal: mockOpenModal,
    closeModal: mockCloseModal,
  }),
}))

// Mock APP_METADATA
jest.mock('@/lib/config/app-metadata', () => ({
  APP_METADATA: {
    version: '0.1.0',
    releaseDate: '2025-10-05',
    developers: ['Alice Johnson', 'Bob Smith', 'Charlie Davis'],
    githubUrl: 'https://github.com/example/paintmixr',
  },
}))

describe('AboutDialog Component', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('dialog open/close state (FR-010)', () => {
    it('should render dialog when isOpen=true', () => {
      render(<AboutDialog isOpen={true} onClose={mockOnClose} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('About PaintMixr')).toBeInTheDocument()
    })

    it('should not render dialog when isOpen=false', () => {
      render(<AboutDialog isOpen={false} onClose={mockOnClose} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('metadata field rendering (FR-010)', () => {
    it('should render all 4 metadata fields', () => {
      render(
        <AboutDialog
          isOpen={true}
          onClose={mockOnClose}
          
        />
      )

      expect(screen.getByTestId('version-field')).toBeInTheDocument()
      expect(screen.getByTestId('release-date-field')).toBeInTheDocument()
      expect(screen.getByTestId('developers-field')).toBeInTheDocument()
      expect(screen.getByTestId('github-url-field')).toBeInTheDocument()
    })

    it('should display version number correctly', () => {
      render(
        <AboutDialog
          isOpen={true}
          onClose={mockOnClose}
          
        />
      )

      const versionField = screen.getByTestId('version-field')
      expect(versionField).toHaveTextContent('Version: 0.1.0')
    })

    it('should display release date correctly', () => {
      render(
        <AboutDialog
          isOpen={true}
          onClose={mockOnClose}
          
        />
      )

      const releaseDateField = screen.getByTestId('release-date-field')
      expect(releaseDateField).toHaveTextContent('Release Date: 2025-10-05')
    })

    it('should display developers list correctly', () => {
      render(
        <AboutDialog
          isOpen={true}
          onClose={mockOnClose}
          
        />
      )

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
      expect(screen.getByText('Charlie Davis')).toBeInTheDocument()
    })

    it('should display GitHub URL correctly', () => {
      render(
        <AboutDialog
          isOpen={true}
          onClose={mockOnClose}
          
        />
      )

      const githubField = screen.getByTestId('github-url-field')
      expect(githubField).toHaveTextContent('https://github.com/example/paintmixr')
    })
  })

  describe('GitHub link attributes (FR-010)', () => {
    it('should have target="_blank" attribute', () => {
      render(
        <AboutDialog
          isOpen={true}
          onClose={mockOnClose}
          
        />
      )

      const githubLink = screen.getByTestId('github-link')
      expect(githubLink).toHaveAttribute('target', '_blank')
    })

    it('should have rel="noopener noreferrer" for security', () => {
      render(
        <AboutDialog
          isOpen={true}
          onClose={mockOnClose}
          
        />
      )

      const githubLink = screen.getByTestId('github-link')
      expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should have correct href attribute', () => {
      render(
        <AboutDialog
          isOpen={true}
          onClose={mockOnClose}
          
        />
      )

      const githubLink = screen.getByTestId('github-link')
      expect(githubLink).toHaveAttribute('href', 'https://github.com/example/paintmixr')
    })
  })

  describe('close button interaction (FR-012)', () => {
    it('should close on close button click', async () => {
      render(<AboutDialog isOpen={true} onClose={mockOnClose} />)

      // Radix UI DialogClose button has text "Close" in sr-only span
      const closeButton = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1)
      })
    })

    it('should have accessible close button', () => {
      render(<AboutDialog isOpen={true} onClose={mockOnClose} />)

      // Verify close button exists and is accessible
      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
      expect(closeButton).toHaveTextContent('Close')
    })
  })

  describe('ESC key press interaction (FR-012)', () => {
    it('should close on ESC key press', async () => {
      render(
        <AboutDialog
          isOpen={true}
          onClose={mockOnClose}
          
        />
      )

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1)
      })
    })

    it('should not trigger close on ESC when dialog is closed', async () => {
      render(
        <AboutDialog
          isOpen={false}
          onClose={mockOnClose}
          
        />
      )

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

      // Wait to ensure no call happens
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('accessibility (FR-013)', () => {
    it('should have proper role="dialog"', () => {
      render(
        <AboutDialog
          isOpen={true}
          onClose={mockOnClose}
          
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
    })

    it('should have aria-labelledby pointing to dialog title', () => {
      render(
        <AboutDialog
          isOpen={true}
          onClose={mockOnClose}
          
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby', 'about-dialog-title')
      expect(screen.getByText('About PaintMixr')).toHaveAttribute('id', 'about-dialog-title')
    })
  })

  describe('multiple developers support', () => {
    it('should handle rendering list of developers', () => {
      render(<AboutDialog isOpen={true} onClose={mockOnClose} />)

      // Should render all 3 mocked developers
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
      expect(screen.getByText('Charlie Davis')).toBeInTheDocument()

      // Verify they are in a list
      const developersList = screen.getByTestId('developers-field').querySelector('ul')
      expect(developersList).toBeInTheDocument()
      expect(developersList?.children).toHaveLength(3)
    })
  })

  describe('modal context integration', () => {
    it('should be integrated with ModalContext (mock verification)', () => {
      // This test verifies the mock is set up correctly
      // Actual integration will be tested in integration tests
      render(
        <AboutDialog
          isOpen={true}
          onClose={mockOnClose}
          
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})
