'use client'

import React, { useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useModal } from '@/contexts/ModalContext'
import { APP_METADATA } from '@/lib/config/app-metadata'

/**
 * AboutDialog Component
 *
 * Displays application metadata (version, release date, developers, GitHub URL)
 * in a modal dialog. Integrates with ModalContext to coordinate with other
 * UI elements (e.g., hamburger menu hiding).
 *
 * Features:
 * - Displays all 4 metadata fields from APP_METADATA
 * - GitHub link opens in new tab with security attributes
 * - Closes on: close button, outside click, ESC key
 * - Integrates with ModalContext for global modal state
 * - Accessibility: ARIA labelledby, keyboard navigation
 *
 * @example
 * ```tsx
 * const [showAbout, setShowAbout] = useState(false)
 * <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />
 * ```
 */

interface AboutDialogProps {
  /** Controls dialog open/close state */
  isOpen: boolean
  /** Callback when dialog should close */
  onClose: () => void
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const { openModal, closeModal } = useModal()

  // Integrate with ModalContext
  useEffect(() => {
    if (isOpen) {
      openModal()
    } else {
      closeModal()
    }
  }, [isOpen, openModal, closeModal])

  // Handle dialog open change (from Radix UI Dialog)
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        aria-labelledby="about-dialog-title"
        data-testid="about-dialog"
      >
        <DialogTitle id="about-dialog-title">About PaintMixr</DialogTitle>
        <DialogDescription>
          Application information and credits
        </DialogDescription>

        <div className="space-y-4 py-4">
          {/* Version field */}
          <div data-testid="version-field">
            <strong className="text-sm font-semibold text-gray-900">Version:</strong>{' '}
            <span className="text-sm text-gray-700">{APP_METADATA.version}</span>
          </div>

          {/* Release Date field */}
          <div data-testid="release-date-field">
            <strong className="text-sm font-semibold text-gray-900">Release Date:</strong>{' '}
            <span className="text-sm text-gray-700">{APP_METADATA.releaseDate}</span>
          </div>

          {/* Developers field */}
          <div data-testid="developers-field">
            <strong className="text-sm font-semibold text-gray-900">Developers:</strong>
            <ul className="mt-1 ml-5 list-disc space-y-1">
              {APP_METADATA.developers.map((developer, index) => (
                <li key={index} className="text-sm text-gray-700">
                  {developer}
                </li>
              ))}
            </ul>
          </div>

          {/* GitHub URL field */}
          <div data-testid="github-url-field">
            <strong className="text-sm font-semibold text-gray-900">GitHub:</strong>{' '}
            <a
              href={APP_METADATA.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="github-link"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
            >
              {APP_METADATA.githubUrl}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
