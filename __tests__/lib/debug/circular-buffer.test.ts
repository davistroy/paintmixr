import { CircularBuffer } from '@/lib/debug/circular-buffer'
import type { DebugLogEntry } from '@/lib/types'

describe('CircularBuffer', () => {
  const createMockEntry = (
    message: string,
    dataSize: number = 100
  ): DebugLogEntry => ({
    sessionId: 'test-session-id-12345',
    timestamp: new Date().toISOString(),
    message,
    data: {
      // Create object with approximate byte size
      largeData: 'x'.repeat(dataSize),
    },
  })

  const getEntryByteSize = (entry: DebugLogEntry): number => {
    return new Blob([JSON.stringify(entry)]).size
  }

  describe('Basic Operations', () => {
    it('adds entry to buffer', () => {
      const buffer = new CircularBuffer<DebugLogEntry>(1024 * 1024) // 1MB
      const entry = createMockEntry('Test message')

      buffer.add(entry)

      const entries = buffer.getAll()
      expect(entries).toHaveLength(1)
      expect(entries[0]).toEqual(entry)
    })

    it('adds multiple entries to buffer', () => {
      const buffer = new CircularBuffer<DebugLogEntry>(1024 * 1024)
      const entry1 = createMockEntry('First message')
      const entry2 = createMockEntry('Second message')
      const entry3 = createMockEntry('Third message')

      buffer.add(entry1)
      buffer.add(entry2)
      buffer.add(entry3)

      const entries = buffer.getAll()
      expect(entries).toHaveLength(3)
      expect(entries[0]).toEqual(entry1)
      expect(entries[1]).toEqual(entry2)
      expect(entries[2]).toEqual(entry3)
    })

    it('maintains insertion order', () => {
      const buffer = new CircularBuffer<DebugLogEntry>(1024 * 1024)

      for (let i = 0; i < 10; i++) {
        buffer.add(createMockEntry(`Message ${i}`))
      }

      const entries = buffer.getAll()
      expect(entries).toHaveLength(10)

      for (let i = 0; i < 10; i++) {
        expect(entries[i].message).toBe(`Message ${i}`)
      }
    })
  })

  describe('Size Management and FIFO Behavior', () => {
    it('removes oldest entry when size exceeds max (FIFO)', () => {
      // Create buffer with very small max size to trigger removal
      const maxSize = 1000 // 1KB
      const buffer = new CircularBuffer<DebugLogEntry>(maxSize)

      // Create entries that are roughly 300 bytes each (realistic size)
      const entry1 = createMockEntry('First entry', 150)
      const entry2 = createMockEntry('Second entry', 150)
      const entry3 = createMockEntry('Third entry', 150)
      const entry4 = createMockEntry('Fourth entry', 150)

      buffer.add(entry1)
      buffer.add(entry2)
      buffer.add(entry3)

      // At this point, buffer should be close to capacity
      // Adding entry4 should remove entry1 (oldest)
      buffer.add(entry4)

      const entries = buffer.getAll()

      // First entry should be removed, remaining should be 2, 3, 4
      expect(entries).not.toContainEqual(entry1)
      expect(entries).toContainEqual(entry2)
      expect(entries).toContainEqual(entry3)
      expect(entries).toContainEqual(entry4)

      // Verify buffer size is under max
      expect(buffer.size()).toBeLessThanOrEqual(maxSize)
    })

    it('removes multiple oldest entries if new entry requires space', () => {
      const maxSize = 1000 // 1KB
      const buffer = new CircularBuffer<DebugLogEntry>(maxSize)

      // Add several small entries
      const entry1 = createMockEntry('First', 100)
      const entry2 = createMockEntry('Second', 100)
      const entry3 = createMockEntry('Third', 100)

      buffer.add(entry1)
      buffer.add(entry2)
      buffer.add(entry3)

      // Add a large entry that requires removing multiple old entries
      const largeEntry = createMockEntry('Large entry', 700)
      buffer.add(largeEntry)

      const entries = buffer.getAll()

      // Should have removed enough old entries to fit the large one
      expect(entries).toContainEqual(largeEntry)
      expect(buffer.size()).toBeLessThanOrEqual(maxSize)

      // Older entries should be removed
      expect(entries).not.toContainEqual(entry1)
    })

    it('handles edge case of entry larger than max size', () => {
      const maxSize = 500
      const buffer = new CircularBuffer<DebugLogEntry>(maxSize)

      // Create entry larger than max size
      const hugeEntry = createMockEntry('Huge entry', 600)

      buffer.add(hugeEntry)

      // Buffer should contain only this entry or be empty
      // Implementation should handle gracefully
      const entries = buffer.getAll()
      expect(buffer.size()).toBeLessThanOrEqual(maxSize + getEntryByteSize(hugeEntry))
    })
  })

  describe('Size Calculation', () => {
    it('calculates total byte size correctly', () => {
      const buffer = new CircularBuffer<DebugLogEntry>(5 * 1024 * 1024) // 5MB

      const entry1 = createMockEntry('Message 1', 200)
      const entry2 = createMockEntry('Message 2', 300)

      buffer.add(entry1)
      buffer.add(entry2)

      const expectedSize = getEntryByteSize(entry1) + getEntryByteSize(entry2)

      expect(buffer.size()).toBe(expectedSize)
    })

    it('updates size after removing entries', () => {
      const maxSize = 800
      const buffer = new CircularBuffer<DebugLogEntry>(maxSize)

      const entry1 = createMockEntry('First', 200)
      const entry2 = createMockEntry('Second', 200)
      const entry3 = createMockEntry('Third', 200)

      buffer.add(entry1)
      const sizeAfterFirst = buffer.size()

      buffer.add(entry2)
      const sizeAfterSecond = buffer.size()

      buffer.add(entry3)
      const sizeAfterThird = buffer.size()

      // Size should increase with each addition
      expect(sizeAfterSecond).toBeGreaterThan(sizeAfterFirst)
      expect(sizeAfterThird).toBeGreaterThan(sizeAfterSecond)

      // Add entry that causes removal
      const entry4 = createMockEntry('Fourth', 300)
      buffer.add(entry4)

      // Size should be less than if all entries were kept
      const expectedFullSize =
        getEntryByteSize(entry1) +
        getEntryByteSize(entry2) +
        getEntryByteSize(entry3) +
        getEntryByteSize(entry4)

      expect(buffer.size()).toBeLessThan(expectedFullSize)
      expect(buffer.size()).toBeLessThanOrEqual(maxSize)
    })

    it('calculates size with realistic DebugLogEntry objects (~300 bytes each)', () => {
      const buffer = new CircularBuffer<DebugLogEntry>(5 * 1024 * 1024)

      // Create realistic entry with typical debug data
      const realisticEntry: DebugLogEntry = {
        sessionId: 'session-abc123-def456-ghi789',
        timestamp: '2025-10-05T12:34:56.789Z',
        message: 'Color mixing optimization started for target LAB(50, 25, -10)',
        data: {
          targetColor: { l: 50, a: 25, b: -10 },
          paintCount: 5,
          mode: 'enhanced',
          algorithm: 'differential-evolution',
        },
      }

      buffer.add(realisticEntry)

      const actualSize = buffer.size()
      const expectedSize = getEntryByteSize(realisticEntry)

      // Should be within 10% tolerance (JSON serialization may vary slightly)
      expect(actualSize).toBeGreaterThan(expectedSize * 0.9)
      expect(actualSize).toBeLessThan(expectedSize * 1.1)

      // Verify realistic entry is approximately 300 bytes
      expect(expectedSize).toBeGreaterThan(200)
      expect(expectedSize).toBeLessThan(500)
    })

    it('returns 0 for empty buffer', () => {
      const buffer = new CircularBuffer<DebugLogEntry>(1024 * 1024)

      expect(buffer.size()).toBe(0)
    })
  })

  describe('Clear Operation', () => {
    it('clears all entries on clear() call', () => {
      const buffer = new CircularBuffer<DebugLogEntry>(1024 * 1024)

      buffer.add(createMockEntry('Entry 1'))
      buffer.add(createMockEntry('Entry 2'))
      buffer.add(createMockEntry('Entry 3'))

      expect(buffer.getAll()).toHaveLength(3)
      expect(buffer.size()).toBeGreaterThan(0)

      buffer.clear()

      expect(buffer.getAll()).toHaveLength(0)
      expect(buffer.size()).toBe(0)
    })

    it('allows adding entries after clear', () => {
      const buffer = new CircularBuffer<DebugLogEntry>(1024 * 1024)

      buffer.add(createMockEntry('Before clear'))
      buffer.clear()

      const newEntry = createMockEntry('After clear')
      buffer.add(newEntry)

      const entries = buffer.getAll()
      expect(entries).toHaveLength(1)
      expect(entries[0]).toEqual(newEntry)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty buffer getAll()', () => {
      const buffer = new CircularBuffer<DebugLogEntry>(1024 * 1024)

      expect(buffer.getAll()).toEqual([])
    })

    it('handles buffer with exactly max size entry', () => {
      const maxSize = 500
      const buffer = new CircularBuffer<DebugLogEntry>(maxSize)

      // Create entry that's approximately maxSize
      const exactEntry = createMockEntry('Exact size entry', maxSize - 200)

      buffer.add(exactEntry)

      expect(buffer.getAll()).toHaveLength(1)
      expect(buffer.size()).toBeLessThanOrEqual(maxSize)
    })

    it('maintains correct order after multiple FIFO removals', () => {
      const maxSize = 1200
      const buffer = new CircularBuffer<DebugLogEntry>(maxSize)

      // Add 10 entries, expect several to be removed
      for (let i = 0; i < 10; i++) {
        buffer.add(createMockEntry(`Entry ${i}`, 200))
      }

      const entries = buffer.getAll()

      // Verify remaining entries are in correct order
      for (let i = 0; i < entries.length - 1; i++) {
        const currentIndex = parseInt(entries[i].message.split(' ')[1])
        const nextIndex = parseInt(entries[i + 1].message.split(' ')[1])
        expect(nextIndex).toBeGreaterThan(currentIndex)
      }

      // Verify buffer size is under max
      expect(buffer.size()).toBeLessThanOrEqual(maxSize)
    })

    it('handles entries with no data field', () => {
      const buffer = new CircularBuffer<DebugLogEntry>(1024 * 1024)

      const entryWithoutData: DebugLogEntry = {
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        message: 'Simple message',
      }

      buffer.add(entryWithoutData)

      const entries = buffer.getAll()
      expect(entries).toHaveLength(1)
      expect(entries[0].data).toBeUndefined()
    })

    it('handles entries with complex nested data', () => {
      const buffer = new CircularBuffer<DebugLogEntry>(1024 * 1024)

      const complexEntry: DebugLogEntry = {
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        message: 'Complex data entry',
        data: {
          nested: {
            deeply: {
              nested: {
                value: 'test',
                array: [1, 2, 3],
                object: { key: 'value' },
              },
            },
          },
        },
      }

      buffer.add(complexEntry)

      const entries = buffer.getAll()
      expect(entries).toHaveLength(1)
      expect(entries[0]).toEqual(complexEntry)
      expect(buffer.size()).toBeGreaterThan(0)
    })
  })

  describe('Performance Characteristics', () => {
    it('handles 5MB of entries efficiently', () => {
      const maxSize = 5 * 1024 * 1024 // 5MB
      const buffer = new CircularBuffer<DebugLogEntry>(maxSize)

      // Add entries until we approach 5MB
      // Each entry ~300 bytes, so ~17,000 entries to reach 5MB
      const entryCount = Math.floor(maxSize / 300)

      const startTime = Date.now()

      for (let i = 0; i < entryCount; i++) {
        buffer.add(createMockEntry(`Entry ${i}`, 200))
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete in reasonable time (< 5 seconds for 17k entries)
      expect(duration).toBeLessThan(5000)

      // Buffer should not exceed max size
      expect(buffer.size()).toBeLessThanOrEqual(maxSize)
    })

    it('getAll() returns array reference efficiently', () => {
      const buffer = new CircularBuffer<DebugLogEntry>(1024 * 1024)

      for (let i = 0; i < 100; i++) {
        buffer.add(createMockEntry(`Entry ${i}`))
      }

      const startTime = Date.now()
      const entries = buffer.getAll()
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(100) // Should be near-instant
      expect(entries).toHaveLength(100)
    })
  })
})
