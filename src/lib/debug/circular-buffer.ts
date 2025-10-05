/**
 * Circular Buffer Implementation
 * Feature 009-add-hamburger-menu
 *
 * Fixed-size FIFO buffer with automatic size management.
 * When buffer exceeds maxSize, oldest entries are removed to make space.
 *
 * Uses Blob API for accurate byte-size calculation via JSON serialization.
 */

/**
 * Generic circular buffer with automatic FIFO eviction
 * @template T - Type of entries stored in buffer
 */
export class CircularBuffer<T> {
  private entries: T[] = []
  private currentSize: number = 0
  private readonly maxSize: number

  /**
   * Create a new CircularBuffer
   * @param maxSize - Maximum buffer size in bytes
   */
  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  /**
   * Calculate byte size of an entry using JSON serialization
   * @param entry - Entry to measure
   * @returns Size in bytes
   */
  private getEntrySize(entry: T): number {
    return new Blob([JSON.stringify(entry)]).size
  }

  /**
   * Add entry to buffer with automatic FIFO eviction
   * Adds entry first, then removes oldest entries if buffer exceeds maxSize
   * @param entry - Entry to add
   */
  add(entry: T): void {
    const entrySize = this.getEntrySize(entry)

    // Add new entry first
    this.entries.push(entry)
    this.currentSize += entrySize

    // Remove oldest entries if we exceeded maxSize
    while (this.currentSize > this.maxSize && this.entries.length > 1) {
      const removed = this.entries.shift()
      if (removed) {
        this.currentSize -= this.getEntrySize(removed)
      }
    }
  }

  /**
   * Get all entries in chronological order (oldest first)
   * @returns Array of all entries
   */
  getAll(): T[] {
    return this.entries
  }

  /**
   * Get current total size of buffer in bytes
   * @returns Total size in bytes
   */
  size(): number {
    return this.currentSize
  }

  /**
   * Clear all entries from buffer
   */
  clear(): void {
    this.entries = []
    this.currentSize = 0
  }
}
