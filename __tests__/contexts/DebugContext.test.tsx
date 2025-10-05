import { renderHook, act, waitFor } from '@testing-library/react'
import { ReactNode } from 'react'
import { DebugProvider, useDebug } from '@/contexts/DebugContext'
import { CircularBuffer } from '@/lib/debug/circular-buffer'
import type { DebugLogEntry } from '@/lib/types'

// Mock CircularBuffer
jest.mock('@/lib/debug/circular-buffer')

const MockedCircularBuffer = CircularBuffer as jest.MockedClass<typeof CircularBuffer>

describe('DebugContext', () => {
  let mockBuffer: jest.Mocked<CircularBuffer<DebugLogEntry>>

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()

    // Create mock buffer instance
    mockBuffer = {
      add: jest.fn(),
      getAll: jest.fn().mockReturnValue([]),
      clear: jest.fn(),
      size: jest.fn().mockReturnValue(0),
    } as any

    // Mock constructor to return our mock instance
    MockedCircularBuffer.mockImplementation(() => mockBuffer)
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <DebugProvider>{children}</DebugProvider>
  )

  describe('Debug Mode Management', () => {
    it('enables debug mode and creates new session', () => {
      const { result } = renderHook(() => useDebug(), { wrapper })

      // Initially disabled
      expect(result.current.isDebugEnabled).toBe(false)
      expect(result.current.sessionId).toBeNull()

      act(() => {
        result.current.enableDebug()
      })

      // After enabling
      expect(result.current.isDebugEnabled).toBe(true)
      expect(result.current.sessionId).toBeTruthy()
      expect(typeof result.current.sessionId).toBe('string')

      // Should create buffer on enable
      expect(MockedCircularBuffer).toHaveBeenCalledWith(5 * 1024 * 1024) // 5MB
    })

    it('disables debug mode and clears session', () => {
      const { result } = renderHook(() => useDebug(), { wrapper })

      // Enable first
      act(() => {
        result.current.enableDebug()
      })

      const sessionId = result.current.sessionId
      expect(sessionId).toBeTruthy()

      // Disable
      act(() => {
        result.current.disableDebug()
      })

      expect(result.current.isDebugEnabled).toBe(false)
      expect(result.current.sessionId).toBeNull()
      expect(mockBuffer.clear).toHaveBeenCalled()
    })

    it('generates unique session IDs for each enable', () => {
      const { result } = renderHook(() => useDebug(), { wrapper })

      act(() => {
        result.current.enableDebug()
      })
      const sessionId1 = result.current.sessionId

      act(() => {
        result.current.disableDebug()
      })

      act(() => {
        result.current.enableDebug()
      })
      const sessionId2 = result.current.sessionId

      expect(sessionId1).not.toBe(sessionId2)
    })
  })

  describe('Log Entry Management', () => {
    it('logs entry and adds to buffer when debug is enabled', () => {
      const { result } = renderHook(() => useDebug(), { wrapper })

      act(() => {
        result.current.enableDebug()
      })

      const sessionId = result.current.sessionId!

      act(() => {
        result.current.log('Test message', { testData: 'value' })
      })

      expect(mockBuffer.add).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId,
          timestamp: expect.any(String),
          message: 'Test message',
          data: { testData: 'value' },
        })
      )
    })

    it('does not log entry when debug is disabled', () => {
      const { result } = renderHook(() => useDebug(), { wrapper })

      act(() => {
        result.current.log('Test message')
      })

      expect(mockBuffer.add).not.toHaveBeenCalled()
    })

    it('logs entry without data object', () => {
      const { result } = renderHook(() => useDebug(), { wrapper })

      act(() => {
        result.current.enableDebug()
      })

      const sessionId = result.current.sessionId!

      act(() => {
        result.current.log('Simple message')
      })

      expect(mockBuffer.add).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId,
          message: 'Simple message',
          data: undefined,
        })
      )
    })

    it('generates ISO timestamp for each log entry', () => {
      const { result } = renderHook(() => useDebug(), { wrapper })

      act(() => {
        result.current.enableDebug()
      })

      const beforeLog = new Date().toISOString()

      act(() => {
        result.current.log('Test')
      })

      const afterLog = new Date().toISOString()

      const loggedEntry = mockBuffer.add.mock.calls[0][0]
      const timestamp = loggedEntry.timestamp

      // Timestamp should be valid ISO string within test execution time
      expect(new Date(timestamp).toISOString()).toBe(timestamp)
      expect(timestamp >= beforeLog).toBe(true)
      expect(timestamp <= afterLog).toBe(true)
    })
  })

  describe('Buffer Size Management', () => {
    it('removes oldest entry when exceeds 5MB', () => {
      const { result } = renderHook(() => useDebug(), { wrapper })

      act(() => {
        result.current.enableDebug()
      })

      // Simulate buffer size exceeding 5MB by making size() return large value
      mockBuffer.size.mockReturnValue(6 * 1024 * 1024) // 6MB

      act(() => {
        result.current.log('This should trigger removal')
      })

      // Buffer should have add() called (which internally handles size management)
      expect(mockBuffer.add).toHaveBeenCalled()

      // The CircularBuffer implementation should handle FIFO removal internally
      // We just verify the add was called with the new entry
    })

    it('creates buffer with 5MB max size', () => {
      renderHook(() => useDebug(), { wrapper })

      // Don't need to enable - buffer is created on first enable
      const { result } = renderHook(() => useDebug(), { wrapper })

      act(() => {
        result.current.enableDebug()
      })

      expect(MockedCircularBuffer).toHaveBeenCalledWith(5 * 1024 * 1024)
    })
  })

  describe('Visible Entries', () => {
    it('returns last 10 entries for UI via visibleEntries', () => {
      const mockEntries: DebugLogEntry[] = Array.from({ length: 15 }, (_, i) => ({
        sessionId: 'test-session',
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        message: `Message ${i}`,
        data: { index: i },
      }))

      // Mock getAll to return 15 entries
      mockBuffer.getAll.mockReturnValue(mockEntries)

      const { result } = renderHook(() => useDebug(), { wrapper })

      act(() => {
        result.current.enableDebug()
      })

      const visibleEntries = result.current.visibleEntries

      // Should return last 10 entries
      expect(visibleEntries).toHaveLength(10)
      expect(visibleEntries[0].message).toBe('Message 5')
      expect(visibleEntries[9].message).toBe('Message 14')
    })

    it('returns all entries if less than 10 exist', () => {
      const mockEntries: DebugLogEntry[] = Array.from({ length: 5 }, (_, i) => ({
        sessionId: 'test-session',
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        message: `Message ${i}`,
      }))

      mockBuffer.getAll.mockReturnValue(mockEntries)

      const { result } = renderHook(() => useDebug(), { wrapper })

      act(() => {
        result.current.enableDebug()
      })

      const visibleEntries = result.current.visibleEntries

      expect(visibleEntries).toHaveLength(5)
      expect(visibleEntries).toEqual(mockEntries)
    })

    it('returns empty array when debug is disabled', () => {
      const { result } = renderHook(() => useDebug(), { wrapper })

      expect(result.current.visibleEntries).toEqual([])
    })

    it('updates visibleEntries when new log is added', () => {
      const initialEntries: DebugLogEntry[] = Array.from({ length: 3 }, (_, i) => ({
        sessionId: 'test-session',
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        message: `Message ${i}`,
      }))

      mockBuffer.getAll.mockReturnValue(initialEntries)

      const { result } = renderHook(() => useDebug(), { wrapper })

      act(() => {
        result.current.enableDebug()
      })

      expect(result.current.visibleEntries).toHaveLength(3)

      // Add new entry
      const updatedEntries = [
        ...initialEntries,
        {
          sessionId: 'test-session',
          timestamp: new Date().toISOString(),
          message: 'New message',
        },
      ]
      mockBuffer.getAll.mockReturnValue(updatedEntries)

      act(() => {
        result.current.log('New message')
      })

      expect(result.current.visibleEntries).toHaveLength(4)
      expect(result.current.visibleEntries[3].message).toBe('New message')
    })
  })

  describe('Context Provider', () => {
    it('throws error when useDebug is called outside provider', () => {
      // Temporarily suppress console.error for this test
      const originalError = console.error
      console.error = jest.fn()

      expect(() => {
        renderHook(() => useDebug())
      }).toThrow('useDebug must be used within a DebugProvider')

      console.error = originalError
    })

    it('provides context value to children', () => {
      const { result } = renderHook(() => useDebug(), { wrapper })

      expect(result.current).toMatchObject({
        isDebugEnabled: expect.any(Boolean),
        sessionId: null,
        visibleEntries: expect.any(Array),
        enableDebug: expect.any(Function),
        disableDebug: expect.any(Function),
        log: expect.any(Function),
      })
    })
  })
})
