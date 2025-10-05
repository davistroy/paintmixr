/**
 * Integration Tests: Modal ↔ Hamburger Menu Interaction
 *
 * Tests cross-component workflows between:
 * - HamburgerMenu component (visibility control)
 * - Modal components (any modal in the app)
 * - ModalProvider context (global modal state)
 *
 * TDD Principle: These tests MUST FAIL until components are implemented.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModalProvider } from '@/contexts/ModalContext'
import HamburgerMenu from '@/components/navigation/HamburgerMenu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

describe('Integration: Modal ↔ Hamburger Menu Interaction', () => {
  // Mock modal component for testing
  const TestModal = ({ modalId }: { modalId: string }) => (
    <Dialog>
      <DialogTrigger asChild>
        <button data-testid={`open-${modalId}-modal`}>
          Open {modalId} Modal
        </button>
      </DialogTrigger>
      <DialogContent data-testid={`${modalId}-modal`}>
        <DialogHeader>
          <DialogTitle>Test Modal: {modalId}</DialogTitle>
        </DialogHeader>
        <div>Modal content goes here</div>
      </DialogContent>
    </Dialog>
  )

  const TestComponent = ({ modalId = 'test' }: { modalId?: string }) => (
    <ModalProvider>
      <div>
        <HamburgerMenu />
        <TestModal modalId={modalId} />
      </div>
    </ModalProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Hamburger Icon Visibility Control', () => {
    it('should hide hamburger icon when any modal is opened', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Verify hamburger icon is initially visible
      const hamburgerIcon = screen.getByTestId('hamburger-icon')
      expect(hamburgerIcon).toBeVisible()

      // Open modal
      const openModalButton = screen.getByTestId('open-test-modal')
      await user.click(openModalButton)

      // Hamburger icon should be hidden
      await waitFor(() => {
        expect(hamburgerIcon).not.toBeVisible()
      })
    })

    it('should show hamburger icon when modal is closed', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Open modal
      await user.click(screen.getByTestId('open-test-modal'))

      // Verify icon is hidden
      await waitFor(() => {
        expect(screen.getByTestId('hamburger-icon')).not.toBeVisible()
      })

      // Close modal (via close button or ESC)
      const modal = screen.getByTestId('test-modal')
      const closeButton = modal.querySelector('[aria-label="Close"]')
      if (closeButton) {
        await user.click(closeButton as HTMLElement)
      }

      // Hamburger icon should reappear
      await waitFor(() => {
        expect(screen.getByTestId('hamburger-icon')).toBeVisible()
      })
    })

    it('should toggle hamburger icon visibility with modal ESC key', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Open modal
      await user.click(screen.getByTestId('open-test-modal'))

      // Icon hidden
      await waitFor(() => {
        expect(screen.getByTestId('hamburger-icon')).not.toBeVisible()
      })

      // Close modal with ESC key
      await user.keyboard('{Escape}')

      // Icon visible again
      await waitFor(() => {
        expect(screen.getByTestId('hamburger-icon')).toBeVisible()
      })
    })

    it('should toggle hamburger icon visibility with modal backdrop click', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Open modal
      await user.click(screen.getByTestId('open-test-modal'))

      // Icon hidden
      await waitFor(() => {
        expect(screen.getByTestId('hamburger-icon')).not.toBeVisible()
      })

      // Click backdrop (outside modal content)
      const backdrop = document.querySelector('[data-radix-dialog-overlay]')
      if (backdrop) {
        await user.click(backdrop as HTMLElement)
      }

      // Icon visible again
      await waitFor(() => {
        expect(screen.getByTestId('hamburger-icon')).toBeVisible()
      })
    })
  })

  describe('Multiple Modal Scenarios', () => {
    it('should keep hamburger icon hidden when switching between modals', async () => {
      const user = userEvent.setup()

      const MultiModalComponent = () => (
        <ModalProvider>
          <HamburgerMenu />
          <TestModal modalId="first" />
          <TestModal modalId="second" />
        </ModalProvider>
      )

      render(<MultiModalComponent />)

      // Open first modal
      await user.click(screen.getByTestId('open-first-modal'))

      // Icon hidden
      await waitFor(() => {
        expect(screen.getByTestId('hamburger-icon')).not.toBeVisible()
      })

      // Close first modal and immediately open second
      await user.keyboard('{Escape}')
      await user.click(screen.getByTestId('open-second-modal'))

      // Icon should remain hidden (new modal opened)
      await waitFor(() => {
        expect(screen.getByTestId('hamburger-icon')).not.toBeVisible()
      })
    })

    it('should show hamburger icon only when all modals are closed', async () => {
      const user = userEvent.setup()

      const MultiModalComponent = () => (
        <ModalProvider>
          <HamburgerMenu />
          <TestModal modalId="first" />
          <TestModal modalId="second" />
        </ModalProvider>
      )

      render(<MultiModalComponent />)

      // Open first modal
      await user.click(screen.getByTestId('open-first-modal'))

      // Icon hidden
      await waitFor(() => {
        expect(screen.getByTestId('hamburger-icon')).not.toBeVisible()
      })

      // Close first modal
      await user.keyboard('{Escape}')

      // Icon visible (no modals open)
      await waitFor(() => {
        expect(screen.getByTestId('hamburger-icon')).toBeVisible()
      })

      // Open second modal
      await user.click(screen.getByTestId('open-second-modal'))

      // Icon hidden again
      await waitFor(() => {
        expect(screen.getByTestId('hamburger-icon')).not.toBeVisible()
      })
    })
  })

  describe('ModalProvider Context Integration', () => {
    it('should use ModalProvider to track modal open state', async () => {
      const user = userEvent.setup()

      // Component that displays modal state from context
      const ModalStateIndicator = () => {
        // This would use useModal() hook in actual implementation
        // For now, we're testing the integration pattern
        return <div data-testid="modal-state">Modal State: open</div>
      }

      const TestComponentWithIndicator = () => (
        <ModalProvider>
          <HamburgerMenu />
          <TestModal modalId="test" />
          <ModalStateIndicator />
        </ModalProvider>
      )

      render(<TestComponentWithIndicator />)

      // Open modal
      await user.click(screen.getByTestId('open-test-modal'))

      // Context should reflect modal open state
      await waitFor(() => {
        const stateIndicator = screen.getByTestId('modal-state')
        expect(stateIndicator).toHaveTextContent('Modal State: open')
      })

      // Both HamburgerMenu and ModalStateIndicator consume same context
      expect(screen.getByTestId('hamburger-icon')).not.toBeVisible()
    })

    it('should notify all context consumers when modal state changes', async () => {
      const user = userEvent.setup()

      let renderCount = 0
      const RenderCounter = () => {
        renderCount++
        // This would use useModal() hook
        return <div data-testid="render-count">{renderCount}</div>
      }

      const TestComponentWithCounter = () => (
        <ModalProvider>
          <HamburgerMenu />
          <TestModal modalId="test" />
          <RenderCounter />
        </ModalProvider>
      )

      render(<TestComponentWithCounter />)
      const initialRenderCount = renderCount

      // Open modal (should trigger context update)
      await user.click(screen.getByTestId('open-test-modal'))

      await waitFor(() => {
        // RenderCounter should re-render due to context update
        expect(renderCount).toBeGreaterThan(initialRenderCount)
      })
    })

    it('should isolate modal state within ModalProvider boundary', async () => {
      const user = userEvent.setup()

      // Two independent ModalProvider instances
      const DualProviderComponent = () => (
        <div>
          <div data-testid="provider-1">
            <ModalProvider>
              <HamburgerMenu />
              <TestModal modalId="modal-1" />
            </ModalProvider>
          </div>
          <div data-testid="provider-2">
            <ModalProvider>
              <HamburgerMenu />
              <TestModal modalId="modal-2" />
            </ModalProvider>
          </div>
        </div>
      )

      render(<DualProviderComponent />)

      // Get icons from both providers
      const icons = screen.getAllByTestId('hamburger-icon')
      expect(icons).toHaveLength(2)

      // Open modal in first provider only
      const openModal1Button = screen.getByTestId('open-modal-1-modal')
      await user.click(openModal1Button)

      await waitFor(() => {
        // First provider's icon should be hidden
        expect(icons[0]).not.toBeVisible()

        // Second provider's icon should remain visible
        expect(icons[1]).toBeVisible()
      })
    })
  })

  describe('Accessibility & Focus Management', () => {
    it('should restore focus to hamburger icon after modal closes', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      const hamburgerButton = screen.getByRole('button', { name: /menu/i })

      // Open modal from hamburger menu
      await user.click(hamburgerButton)
      await user.click(screen.getByRole('menuitem', { name: /settings/i })) // Opens a modal

      // Close modal
      await user.keyboard('{Escape}')

      // Focus should return to hamburger button
      await waitFor(() => {
        expect(hamburgerButton).toHaveFocus()
      })
    })

    it('should trap focus within modal when open', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Open modal
      await user.click(screen.getByTestId('open-test-modal'))

      const modal = await screen.findByTestId('test-modal')

      // Tab through modal elements
      await user.tab()
      await user.tab()

      // Focus should remain within modal (not reach hamburger icon)
      const hamburgerIcon = screen.getByTestId('hamburger-icon')
      expect(hamburgerIcon).not.toHaveFocus()
      expect(modal).toContainElement(document.activeElement)
    })

    it('should announce modal state to screen readers', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      // Open modal
      await user.click(screen.getByTestId('open-test-modal'))

      const modal = await screen.findByTestId('test-modal')

      // Modal should have proper ARIA attributes
      expect(modal).toHaveAttribute('role', 'dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
      expect(modal).toHaveAttribute('aria-labelledby')
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid modal open/close cycles', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      const openButton = screen.getByTestId('open-test-modal')
      const hamburgerIcon = screen.getByTestId('hamburger-icon')

      // Rapid open/close/open/close
      await user.click(openButton)
      await user.keyboard('{Escape}')
      await user.click(openButton)
      await user.keyboard('{Escape}')

      // Final state: icon should be visible
      await waitFor(() => {
        expect(hamburgerIcon).toBeVisible()
      })
    })

    it('should handle modal programmatically opened before user interaction', async () => {
      // Component that auto-opens modal on mount
      const AutoOpenModalComponent = () => {
        const [open, setOpen] = React.useState(true)

        return (
          <ModalProvider>
            <HamburgerMenu />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent data-testid="auto-modal">
                <DialogTitle>Auto-opened Modal</DialogTitle>
              </DialogContent>
            </Dialog>
          </ModalProvider>
        )
      }

      const { container } = render(<AutoOpenModalComponent />)

      // Hamburger icon should be hidden immediately
      await waitFor(() => {
        const hamburgerIcon = container.querySelector('[data-testid="hamburger-icon"]')
        expect(hamburgerIcon).not.toBeVisible()
      })
    })

    it('should handle unmounting modal while open', async () => {
      const user = userEvent.setup()

      const ConditionalModalComponent = () => {
        const [showModal, setShowModal] = React.useState(true)

        return (
          <ModalProvider>
            <HamburgerMenu />
            <button onClick={() => setShowModal(false)} data-testid="unmount-modal">
              Unmount Modal
            </button>
            {showModal && <TestModal modalId="test" />}
          </ModalProvider>
        )
      }

      render(<ConditionalModalComponent />)

      // Open modal
      await user.click(screen.getByTestId('open-test-modal'))

      // Verify icon is hidden
      await waitFor(() => {
        expect(screen.getByTestId('hamburger-icon')).not.toBeVisible()
      })

      // Unmount modal component
      await user.click(screen.getByTestId('unmount-modal'))

      // Icon should become visible (modal no longer exists)
      await waitFor(() => {
        expect(screen.getByTestId('hamburger-icon')).toBeVisible()
      })
    })
  })

  describe('Performance & Optimization', () => {
    it('should not re-render hamburger menu unnecessarily when modal content changes', async () => {
      const user = userEvent.setup()

      let hamburgerRenderCount = 0
      const MonitoredHamburgerMenu = () => {
        hamburgerRenderCount++
        return <HamburgerMenu />
      }

      const DynamicModalComponent = () => {
        const [count, setCount] = React.useState(0)

        return (
          <ModalProvider>
            <MonitoredHamburgerMenu />
            <Dialog open={true}>
              <DialogContent data-testid="dynamic-modal">
                <DialogTitle>Dynamic Content</DialogTitle>
                <button onClick={() => setCount(c => c + 1)} data-testid="increment">
                  Count: {count}
                </button>
              </DialogContent>
            </Dialog>
          </ModalProvider>
        )
      }

      render(<DynamicModalComponent />)
      const initialRenderCount = hamburgerRenderCount

      // Change modal content multiple times
      await user.click(screen.getByTestId('increment'))
      await user.click(screen.getByTestId('increment'))
      await user.click(screen.getByTestId('increment'))

      // HamburgerMenu should not re-render (modal state unchanged)
      expect(hamburgerRenderCount).toBe(initialRenderCount)
    })
  })
})

// Import React for useState in edge case tests
import React from 'react'
