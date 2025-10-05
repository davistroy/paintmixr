/**
 * Integration Tests: Hamburger Menu → Debug Mode Flow
 *
 * Tests cross-component workflows between:
 * - HamburgerMenu component
 * - DebugConsole component
 * - DebugProvider context
 * - ModalProvider context
 *
 * TDD Principle: These tests MUST FAIL until components are implemented.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DebugProvider } from '@/contexts/DebugContext'
import { ModalProvider } from '@/contexts/ModalContext'
import HamburgerMenu from '@/components/navigation/HamburgerMenu'
import DebugConsole from '@/components/debug/DebugConsole'

// Mock browser APIs
const mockCreateObjectURL = jest.fn()
const mockRevokeObjectURL = jest.fn()
global.URL.createObjectURL = mockCreateObjectURL
global.URL.revokeObjectURL = mockRevokeObjectURL

// Mock Blob constructor
global.Blob = jest.fn(function (this: any, content: any[], options: any) {
  this.content = content
  this.options = options
  this.size = content.reduce((acc, val) => acc + val.length, 0)
  this.type = options?.type || ''
}) as any

describe('Integration: Hamburger Menu → Debug Mode Flow', () => {
  const TestComponent = () => (
    <ModalProvider>
      <DebugProvider>
        <HamburgerMenu />
        <DebugConsole />
      </DebugProvider>
    </ModalProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateObjectURL.mockReturnValue('blob:mock-url')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Debug Mode Activation', () => {
    it('should show debug console when Debug Mode is clicked from menu', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Open hamburger menu
      const menuButton = screen.getByRole('button', { name: /menu/i })
      await user.click(menuButton)

      // Click Debug Mode menu item
      const debugMenuItem = screen.getByRole('menuitem', { name: /debug mode/i })
      await user.click(debugMenuItem)

      // Debug console should appear
      await waitFor(() => {
        expect(screen.getByTestId('debug-console')).toBeInTheDocument()
      })
    })

    it('should close hamburger menu when Debug Mode is activated', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Open hamburger menu
      const menuButton = screen.getByRole('button', { name: /menu/i })
      await user.click(menuButton)

      // Click Debug Mode
      const debugMenuItem = screen.getByRole('menuitem', { name: /debug mode/i })
      await user.click(debugMenuItem)

      // Menu should be closed
      await waitFor(() => {
        expect(screen.queryByRole('menuitem', { name: /debug mode/i })).not.toBeInTheDocument()
      })
    })

    it('should toggle debug console visibility on repeated clicks', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // First activation
      const menuButton = screen.getByRole('button', { name: /menu/i })
      await user.click(menuButton)
      await user.click(screen.getByRole('menuitem', { name: /debug mode/i }))

      // Console appears
      await waitFor(() => {
        expect(screen.getByTestId('debug-console')).toBeInTheDocument()
      })

      // Second activation (deactivation)
      await user.click(menuButton)
      await user.click(screen.getByRole('menuitem', { name: /debug mode/i }))

      // Console disappears
      await waitFor(() => {
        expect(screen.queryByTestId('debug-console')).not.toBeInTheDocument()
      })
    })
  })

  describe('Log Entry Display', () => {
    it('should display log entry in console after generation', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Activate debug mode
      const menuButton = screen.getByRole('button', { name: /menu/i })
      await user.click(menuButton)
      await user.click(screen.getByRole('menuitem', { name: /debug mode/i }))

      // Generate a log entry programmatically (simulating app behavior)
      // This would typically happen via context method calls
      const logMessage = 'Test log entry'

      await waitFor(() => {
        const console = screen.getByTestId('debug-console')
        expect(console).toBeInTheDocument()
      })

      // Log entry should appear in console
      // Note: Actual implementation will use DebugContext.log() method
      await waitFor(() => {
        expect(screen.getByText(logMessage)).toBeInTheDocument()
      })
    })

    it('should display multiple log entries in chronological order', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Activate debug mode
      await user.click(screen.getByRole('button', { name: /menu/i }))
      await user.click(screen.getByRole('menuitem', { name: /debug mode/i }))

      // Generate multiple log entries
      const messages = ['First log', 'Second log', 'Third log']

      await waitFor(() => {
        const logEntries = screen.getAllByTestId(/log-entry-/)
        expect(logEntries).toHaveLength(messages.length)

        // Verify chronological order (newest first or oldest first based on implementation)
        messages.forEach((message, index) => {
          expect(logEntries[index]).toHaveTextContent(message)
        })
      })
    })

    it('should include timestamp and log level in displayed entries', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Activate debug mode
      await user.click(screen.getByRole('button', { name: /menu/i }))
      await user.click(screen.getByRole('menuitem', { name: /debug mode/i }))

      await waitFor(() => {
        const logEntry = screen.getByTestId(/log-entry-0/)

        // Should display timestamp
        expect(logEntry).toHaveTextContent(/\d{2}:\d{2}:\d{2}/)

        // Should display log level
        expect(logEntry).toHaveTextContent(/INFO|DEBUG|WARN|ERROR/)
      })
    })
  })

  describe('Log Download Functionality', () => {
    it('should create Blob with plain text content when Download Logs is clicked', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Activate debug mode
      await user.click(screen.getByRole('button', { name: /menu/i }))
      await user.click(screen.getByRole('menuitem', { name: /debug mode/i }))

      // Click download button in debug console
      const downloadButton = screen.getByRole('button', { name: /download logs/i })
      await user.click(downloadButton)

      // Verify Blob creation
      await waitFor(() => {
        expect(global.Blob).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({ type: 'text/plain' })
        )
      })
    })

    it('should create object URL for download blob', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Activate debug mode and download
      await user.click(screen.getByRole('button', { name: /menu/i }))
      await user.click(screen.getByRole('menuitem', { name: /debug mode/i }))
      await user.click(screen.getByRole('button', { name: /download logs/i }))

      // Verify URL creation
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledTimes(1)
        expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Object))
      })
    })

    it('should trigger download with correct filename format', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Mock link element creation
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      }
      const createElementSpy = jest.spyOn(document, 'createElement')
      createElementSpy.mockReturnValue(mockLink as any)

      // Activate debug mode and download
      await user.click(screen.getByRole('button', { name: /menu/i }))
      await user.click(screen.getByRole('menuitem', { name: /debug mode/i }))
      await user.click(screen.getByRole('button', { name: /download logs/i }))

      // Verify download link
      await waitFor(() => {
        expect(mockLink.download).toMatch(/debug-logs-\d{8}-\d{6}\.txt/)
        expect(mockLink.href).toBe('blob:mock-url')
        expect(mockLink.click).toHaveBeenCalled()
      })

      createElementSpy.mockRestore()
    })

    it('should include all log entries in downloaded file', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Activate debug mode with multiple log entries
      await user.click(screen.getByRole('button', { name: /menu/i }))
      await user.click(screen.getByRole('menuitem', { name: /debug mode/i }))

      // Download logs
      await user.click(screen.getByRole('button', { name: /download logs/i }))

      // Verify blob content includes all entries
      await waitFor(() => {
        const blobCalls = (global.Blob as jest.Mock).mock.calls
        expect(blobCalls.length).toBeGreaterThan(0)

        const blobContent = blobCalls[0][0].join('')
        expect(blobContent).toContain('Debug Logs Export')
        expect(blobContent).toContain('Timestamp')
        expect(blobContent).toContain('Level')
        expect(blobContent).toContain('Message')
      })
    })

    it('should revoke object URL after download completes', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Activate debug mode and download
      await user.click(screen.getByRole('button', { name: /menu/i }))
      await user.click(screen.getByRole('menuitem', { name: /debug mode/i }))
      await user.click(screen.getByRole('button', { name: /download logs/i }))

      // Verify URL cleanup
      await waitFor(() => {
        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
      })
    })
  })

  describe('Component Tree Integration', () => {
    it('should maintain debug state across component tree via DebugProvider', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<TestComponent />)

      // Activate debug mode
      await user.click(screen.getByRole('button', { name: /menu/i }))
      await user.click(screen.getByRole('menuitem', { name: /debug mode/i }))

      // Verify debug console is visible
      expect(screen.getByTestId('debug-console')).toBeInTheDocument()

      // Rerender component tree
      rerender(<TestComponent />)

      // Debug console should still be visible (state preserved)
      expect(screen.getByTestId('debug-console')).toBeInTheDocument()
    })

    it('should share log entries between all consumers of DebugContext', async () => {
      const user = userEvent.setup()

      // Component that also consumes DebugContext
      const LogCounter = () => {
        // This would use useDebug() hook in actual implementation
        return <div data-testid="log-count">Logs: 3</div>
      }

      const TestComponentWithCounter = () => (
        <ModalProvider>
          <DebugProvider>
            <HamburgerMenu />
            <DebugConsole />
            <LogCounter />
          </DebugProvider>
        </ModalProvider>
      )

      render(<TestComponentWithCounter />)

      // Activate debug mode
      await user.click(screen.getByRole('button', { name: /menu/i }))
      await user.click(screen.getByRole('menuitem', { name: /debug mode/i }))

      // Both components should reflect same log count
      await waitFor(() => {
        const counter = screen.getByTestId('log-count')
        const consoleEntries = screen.getAllByTestId(/log-entry-/)

        expect(counter).toHaveTextContent(`Logs: ${consoleEntries.length}`)
      })
    })

    it('should use ModalProvider to manage menu/console overlay state', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Open menu (should register with ModalProvider)
      await user.click(screen.getByRole('button', { name: /menu/i }))

      // Menu should be in overlay layer
      const menu = screen.getByRole('menu')
      expect(menu).toHaveClass('z-50') // Modal layer z-index

      // Open debug console
      await user.click(screen.getByRole('menuitem', { name: /debug mode/i }))

      // Debug console should also be in overlay layer
      await waitFor(() => {
        const console = screen.getByTestId('debug-console')
        expect(console).toHaveClass('z-40') // Lower than menu but above content
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle Blob creation failure gracefully', async () => {
      const user = userEvent.setup()

      // Mock Blob to throw error
      const originalBlob = global.Blob
      ;(global.Blob as any) = jest.fn(() => {
        throw new Error('Blob creation failed')
      })

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      render(<TestComponent />)

      // Activate debug mode and attempt download
      await user.click(screen.getByRole('button', { name: /menu/i }))
      await user.click(screen.getByRole('menuitem', { name: /debug mode/i }))
      await user.click(screen.getByRole('button', { name: /download logs/i }))

      // Should log error but not crash
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('download'),
          expect.any(Error)
        )
      })

      // Restore
      global.Blob = originalBlob
      consoleErrorSpy.mockRestore()
    })

    it('should handle missing logs gracefully when downloading empty console', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Activate debug mode (no logs generated)
      await user.click(screen.getByRole('button', { name: /menu/i }))
      await user.click(screen.getByRole('menuitem', { name: /debug mode/i }))

      // Attempt download with no logs
      await user.click(screen.getByRole('button', { name: /download logs/i }))

      // Should still create blob with empty content or header only
      await waitFor(() => {
        expect(global.Blob).toHaveBeenCalled()
        const blobContent = (global.Blob as jest.Mock).mock.calls[0][0].join('')
        expect(blobContent).toContain('No logs available')
      })
    })
  })
})
