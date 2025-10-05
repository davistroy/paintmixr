import { renderHook, act } from '@testing-library/react'
import { ReactNode } from 'react'
import { ModalProvider, useModal } from '@/contexts/ModalContext'

describe('ModalContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ModalProvider>{children}</ModalProvider>
  )

  describe('Modal State Management', () => {
    it('provides initial state as closed', () => {
      const { result } = renderHook(() => useModal(), { wrapper })

      expect(result.current.isModalOpen).toBe(false)
    })

    it('opens modal when openModal is called', () => {
      const { result } = renderHook(() => useModal(), { wrapper })

      act(() => {
        result.current.openModal()
      })

      expect(result.current.isModalOpen).toBe(true)
    })

    it('closes modal when closeModal is called', () => {
      const { result } = renderHook(() => useModal(), { wrapper })

      // Open first
      act(() => {
        result.current.openModal()
      })

      expect(result.current.isModalOpen).toBe(true)

      // Then close
      act(() => {
        result.current.closeModal()
      })

      expect(result.current.isModalOpen).toBe(false)
    })

    it('handles multiple open/close cycles', () => {
      const { result } = renderHook(() => useModal(), { wrapper })

      // Open, close, open, close
      act(() => {
        result.current.openModal()
      })
      expect(result.current.isModalOpen).toBe(true)

      act(() => {
        result.current.closeModal()
      })
      expect(result.current.isModalOpen).toBe(false)

      act(() => {
        result.current.openModal()
      })
      expect(result.current.isModalOpen).toBe(true)

      act(() => {
        result.current.closeModal()
      })
      expect(result.current.isModalOpen).toBe(false)
    })
  })

  describe('Context Provider', () => {
    it('throws error when useModal is called outside provider', () => {
      // Temporarily suppress console.error for this test
      const originalError = console.error
      console.error = jest.fn()

      expect(() => {
        renderHook(() => useModal())
      }).toThrow('useModal must be used within a ModalProvider')

      console.error = originalError
    })

    it('provides context value to children', () => {
      const { result } = renderHook(() => useModal(), { wrapper })

      expect(result.current).toMatchObject({
        isModalOpen: expect.any(Boolean),
        openModal: expect.any(Function),
        closeModal: expect.any(Function),
      })
    })
  })
})
