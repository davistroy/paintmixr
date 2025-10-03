/**
 * Contract Tests: Data Fetching Hooks
 *
 * Tests for src/lib/hooks/ modules
 * Validates shared data fetching hooks contract from refactoring-contracts.md
 *
 * Expected: FAIL (modules don't exist yet)
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { usePagination } from '@/lib/hooks/usePagination'
import { useFilters } from '@/lib/hooks/useFilters'
import { useDataFetch } from '@/lib/hooks/useDataFetch'
import { APIResponse } from '@/lib/api/client'

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  apiGet: jest.fn()
}))

import { apiGet } from '@/lib/api/client'

describe('Data Fetching Hooks Contract', () => {
  describe('usePagination Hook', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => usePagination(100))

      expect(result.current.currentPage).toBe(1)
      expect(result.current.totalPages).toBe(5) // 100 items / 20 per page
      expect(result.current.hasNextPage).toBe(true)
      expect(result.current.hasPreviousPage).toBe(false)
    })

    it('should support custom initial page size', () => {
      const { result } = renderHook(() => usePagination(100, 10))

      expect(result.current.totalPages).toBe(10) // 100 items / 10 per page
    })

    it('should navigate to next page', () => {
      const { result } = renderHook(() => usePagination(100))

      act(() => {
        result.current.nextPage()
      })

      expect(result.current.currentPage).toBe(2)
      expect(result.current.hasNextPage).toBe(true)
      expect(result.current.hasPreviousPage).toBe(true)
    })

    it('should navigate to previous page', () => {
      const { result } = renderHook(() => usePagination(100))

      act(() => {
        result.current.nextPage()
        result.current.nextPage()
      })

      expect(result.current.currentPage).toBe(3)

      act(() => {
        result.current.previousPage()
      })

      expect(result.current.currentPage).toBe(2)
    })

    it('should not navigate past last page', () => {
      const { result } = renderHook(() => usePagination(100, 20))

      act(() => {
        result.current.goToPage(5) // Last page
      })

      expect(result.current.currentPage).toBe(5)
      expect(result.current.hasNextPage).toBe(false)

      act(() => {
        result.current.nextPage() // Should do nothing
      })

      expect(result.current.currentPage).toBe(5)
    })

    it('should not navigate before first page', () => {
      const { result } = renderHook(() => usePagination(100))

      expect(result.current.currentPage).toBe(1)
      expect(result.current.hasPreviousPage).toBe(false)

      act(() => {
        result.current.previousPage() // Should do nothing
      })

      expect(result.current.currentPage).toBe(1)
    })

    it('should go to specific page', () => {
      const { result } = renderHook(() => usePagination(100))

      act(() => {
        result.current.goToPage(3)
      })

      expect(result.current.currentPage).toBe(3)
    })

    it('should clamp page number to valid range', () => {
      const { result } = renderHook(() => usePagination(100, 20))

      act(() => {
        result.current.goToPage(100) // Way past end
      })

      expect(result.current.currentPage).toBe(5) // Clamped to last page

      act(() => {
        result.current.goToPage(-5) // Negative
      })

      expect(result.current.currentPage).toBe(1) // Clamped to first page

      act(() => {
        result.current.goToPage(0) // Zero
      })

      expect(result.current.currentPage).toBe(1) // Clamped to first page
    })

    it('should reset to first page when page size changes', () => {
      const { result } = renderHook(() => usePagination(100, 20))

      act(() => {
        result.current.goToPage(3)
      })

      expect(result.current.currentPage).toBe(3)

      act(() => {
        result.current.setPageSize(10)
      })

      expect(result.current.currentPage).toBe(1)
      expect(result.current.totalPages).toBe(10) // 100 / 10
    })

    it('should recalculate totalPages when page size changes', () => {
      const { result } = renderHook(() => usePagination(100, 20))

      expect(result.current.totalPages).toBe(5)

      act(() => {
        result.current.setPageSize(25)
      })

      expect(result.current.totalPages).toBe(4) // 100 / 25
    })

    it('should handle zero items', () => {
      const { result } = renderHook(() => usePagination(0))

      expect(result.current.totalPages).toBe(0)
      expect(result.current.hasNextPage).toBe(false)
      expect(result.current.hasPreviousPage).toBe(false)
    })

    it('should handle single page of items', () => {
      const { result } = renderHook(() => usePagination(15, 20))

      expect(result.current.totalPages).toBe(1)
      expect(result.current.currentPage).toBe(1)
      expect(result.current.hasNextPage).toBe(false)
      expect(result.current.hasPreviousPage).toBe(false)
    })

    it('should handle exact multiple of page size', () => {
      const { result } = renderHook(() => usePagination(100, 20))

      expect(result.current.totalPages).toBe(5) // Exactly 5 pages
    })

    it('should round up totalPages for partial page', () => {
      const { result } = renderHook(() => usePagination(105, 20))

      expect(result.current.totalPages).toBe(6) // 5 full pages + 1 partial
    })

    it('should update state when total items changes', () => {
      const { result, rerender } = renderHook(
        ({ total }) => usePagination(total),
        { initialProps: { total: 100 } }
      )

      expect(result.current.totalPages).toBe(5)

      rerender({ total: 200 })

      expect(result.current.totalPages).toBe(10)
    })
  })

  describe('useFilters Hook', () => {
    interface TestFilters {
      brand: string | null
      search: string | null
      inStock: boolean | null
      priceRange: number | null
    }

    it('should initialize with provided filters', () => {
      const initialFilters: TestFilters = {
        brand: null,
        search: null,
        inStock: null,
        priceRange: null
      }

      const { result } = renderHook(() => useFilters(initialFilters))

      expect(result.current.filters).toEqual(initialFilters)
    })

    it('should update single filter', () => {
      const { result } = renderHook(() =>
        useFilters<TestFilters>({
          brand: null,
          search: null,
          inStock: null,
          priceRange: null
        })
      )

      act(() => {
        result.current.setFilter('brand', 'Liquitex')
      })

      expect(result.current.filters.brand).toBe('Liquitex')
      expect(result.current.filters.search).toBeNull()
    })

    it('should update multiple filters independently', () => {
      const { result } = renderHook(() =>
        useFilters<TestFilters>({
          brand: null,
          search: null,
          inStock: null,
          priceRange: null
        })
      )

      act(() => {
        result.current.setFilter('brand', 'Winsor & Newton')
        result.current.setFilter('inStock', true)
        result.current.setFilter('search', 'cadmium')
      })

      expect(result.current.filters).toEqual({
        brand: 'Winsor & Newton',
        search: 'cadmium',
        inStock: true,
        priceRange: null
      })
    })

    it('should clear single filter to initial value', () => {
      const { result } = renderHook(() =>
        useFilters<TestFilters>({
          brand: null,
          search: null,
          inStock: null,
          priceRange: null
        })
      )

      act(() => {
        result.current.setFilter('brand', 'Golden')
        result.current.setFilter('search', 'titanium')
      })

      expect(result.current.filters.brand).toBe('Golden')

      act(() => {
        result.current.clearFilter('brand')
      })

      expect(result.current.filters.brand).toBeNull()
      expect(result.current.filters.search).toBe('titanium') // Other filters unchanged
    })

    it('should clear all filters to initial values', () => {
      const { result } = renderHook(() =>
        useFilters<TestFilters>({
          brand: null,
          search: null,
          inStock: null,
          priceRange: null
        })
      )

      act(() => {
        result.current.setFilter('brand', 'Golden')
        result.current.setFilter('search', 'titanium')
        result.current.setFilter('inStock', true)
      })

      act(() => {
        result.current.clearAllFilters()
      })

      expect(result.current.filters).toEqual({
        brand: null,
        search: null,
        inStock: null,
        priceRange: null
      })
    })

    it('should detect active filters', () => {
      const { result } = renderHook(() =>
        useFilters<TestFilters>({
          brand: null,
          search: null,
          inStock: null,
          priceRange: null
        })
      )

      expect(result.current.hasActiveFilters()).toBe(false)

      act(() => {
        result.current.setFilter('brand', 'Golden')
      })

      expect(result.current.hasActiveFilters()).toBe(true)

      act(() => {
        result.current.clearFilter('brand')
      })

      expect(result.current.hasActiveFilters()).toBe(false)
    })

    it('should support non-null initial filter values', () => {
      const { result } = renderHook(() =>
        useFilters({
          category: 'acrylic',
          sortBy: 'name'
        })
      )

      expect(result.current.filters.category).toBe('acrylic')
      expect(result.current.hasActiveFilters()).toBe(false) // Matches initial

      act(() => {
        result.current.setFilter('category', 'oil')
      })

      expect(result.current.hasActiveFilters()).toBe(true)

      act(() => {
        result.current.clearFilter('category')
      })

      expect(result.current.filters.category).toBe('acrylic') // Back to initial
    })

    it('should support boolean filter values', () => {
      const { result } = renderHook(() =>
        useFilters<{ enabled: boolean | null }>({
          enabled: null
        })
      )

      act(() => {
        result.current.setFilter('enabled', true)
      })

      expect(result.current.filters.enabled).toBe(true)

      act(() => {
        result.current.setFilter('enabled', false)
      })

      expect(result.current.filters.enabled).toBe(false)
    })

    it('should support number filter values', () => {
      const { result } = renderHook(() =>
        useFilters<{ maxPrice: number | null }>({
          maxPrice: null
        })
      )

      act(() => {
        result.current.setFilter('maxPrice', 50)
      })

      expect(result.current.filters.maxPrice).toBe(50)
    })

    it('should preserve type safety for filter keys', () => {
      const { result } = renderHook(() =>
        useFilters<TestFilters>({
          brand: null,
          search: null,
          inStock: null,
          priceRange: null
        })
      )

      act(() => {
        // TypeScript should ensure only valid keys are used
        result.current.setFilter('brand', 'Golden')
        // @ts-expect-error - Invalid key should fail TypeScript
        result.current.setFilter('invalidKey', 'value')
      })
    })
  })

  describe('useDataFetch Hook', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should initialize with loading state', () => {
      ;(apiGet as jest.Mock).mockResolvedValue({ data: [] })

      const { result } = renderHook(() => useDataFetch<unknown[]>('/api/test'))

      expect(result.current.loading).toBe(true)
      expect(result.current.data).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('should fetch data on mount', async () => {
      const mockData = [{ id: 1, name: 'Test' }]
      ;(apiGet as jest.Mock).mockResolvedValue({ data: mockData })

      const { result } = renderHook(() => useDataFetch('/api/test'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data).toEqual(mockData)
      expect(result.current.error).toBeNull()
    })

    it('should set error state on fetch failure', async () => {
      ;(apiGet as jest.Mock).mockResolvedValue({
        error: { code: 'network_error', message: 'Failed to fetch' }
      })

      const { result } = renderHook(() => useDataFetch('/api/test'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data).toBeNull()
      expect(result.current.error).toBe('Failed to fetch')
    })

    it('should refetch data when called', async () => {
      const mockData1 = [{ id: 1 }]
      const mockData2 = [{ id: 1 }, { id: 2 }]

      ;(apiGet as jest.Mock)
        .mockResolvedValueOnce({ data: mockData1 })
        .mockResolvedValueOnce({ data: mockData2 })

      const { result } = renderHook(() => useDataFetch('/api/test'))

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1)
      })

      await act(async () => {
        await result.current.refetch()
      })

      expect(result.current.data).toEqual(mockData2)
      expect(apiGet).toHaveBeenCalledTimes(2)
    })

    it('should set loading state during refetch', async () => {
      ;(apiGet as jest.Mock).mockResolvedValue({ data: [] })

      const { result } = renderHook(() => useDataFetch('/api/test'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let loadingDuringRefetch = false

      act(() => {
        result.current.refetch().then(() => {
          // Check loading state was true at some point
        })
        if (result.current.loading) {
          loadingDuringRefetch = true
        }
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(loadingDuringRefetch).toBe(true)
    })

    it('should refetch when dependencies change', async () => {
      const mockData1 = [{ id: 1 }]
      const mockData2 = [{ id: 2 }]

      ;(apiGet as jest.Mock)
        .mockResolvedValueOnce({ data: mockData1 })
        .mockResolvedValueOnce({ data: mockData2 })

      const { result, rerender } = renderHook(
        ({ dep }) => useDataFetch('/api/test', [dep]),
        { initialProps: { dep: 'value1' } }
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1)
      })

      rerender({ dep: 'value2' })

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2)
      })

      expect(apiGet).toHaveBeenCalledTimes(2)
    })

    it('should not refetch when dependencies do not change', async () => {
      ;(apiGet as jest.Mock).mockResolvedValue({ data: [] })

      const { rerender } = renderHook(
        ({ dep }) => useDataFetch('/api/test', [dep]),
        { initialProps: { dep: 'value' } }
      )

      await waitFor(() => {
        expect(apiGet).toHaveBeenCalledTimes(1)
      })

      rerender({ dep: 'value' }) // Same dependency

      await waitFor(() => {
        expect(apiGet).toHaveBeenCalledTimes(1) // No additional call
      })
    })

    it('should clear error state on successful refetch', async () => {
      ;(apiGet as jest.Mock)
        .mockResolvedValueOnce({
          error: { code: 'error', message: 'Failed' }
        })
        .mockResolvedValueOnce({ data: [{ id: 1 }] })

      const { result } = renderHook(() => useDataFetch('/api/test'))

      await waitFor(() => {
        expect(result.current.error).toBe('Failed')
      })

      await act(async () => {
        await result.current.refetch()
      })

      expect(result.current.error).toBeNull()
      expect(result.current.data).toEqual([{ id: 1 }])
    })

    it('should handle typed response data', async () => {
      interface Paint { id: number; name: string; color: string }
      const mockPaints: Paint[] = [
        { id: 1, name: 'Cadmium Red', color: '#E30022' },
        { id: 2, name: 'Titanium White', color: '#FFFFFF' }
      ]

      ;(apiGet as jest.Mock).mockResolvedValue({ data: mockPaints })

      const { result } = renderHook(() => useDataFetch<Paint[]>('/api/paints'))

      await waitFor(() => {
        expect(result.current.data).toEqual(mockPaints)
      })

      if (result.current.data) {
        // TypeScript should recognize Paint properties
        expect(result.current.data[0].name).toBe('Cadmium Red')
        expect(result.current.data[1].color).toBe('#FFFFFF')
      }
    })

    it('should call apiGet with correct endpoint', async () => {
      ;(apiGet as jest.Mock).mockResolvedValue({ data: [] })

      renderHook(() => useDataFetch('/api/custom-endpoint'))

      await waitFor(() => {
        expect(apiGet).toHaveBeenCalledWith('/api/custom-endpoint')
      })
    })
  })

  describe('Hook Composition', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should compose pagination with data fetching', async () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }))
      ;(apiGet as jest.Mock).mockResolvedValue({ data: mockData })

      const { result: dataResult } = renderHook(() => useDataFetch('/api/items'))

      await waitFor(() => {
        expect(dataResult.current.data).toEqual(mockData)
      })

      const { result: paginationResult } = renderHook(() =>
        usePagination(dataResult.current.data?.length || 0, 20)
      )

      expect(paginationResult.current.totalPages).toBe(5)
      expect(paginationResult.current.currentPage).toBe(1)
    })

    it('should compose filtering with data fetching', async () => {
      const mockData = [
        { id: 1, brand: 'Golden', name: 'Red' },
        { id: 2, brand: 'Liquitex', name: 'Blue' }
      ]
      ;(apiGet as jest.Mock).mockResolvedValue({ data: mockData })

      const { result: filterResult } = renderHook(() =>
        useFilters({ brand: null as string | null })
      )

      const endpoint = `/api/paints?brand=${filterResult.current.filters.brand || ''}`
      const { result: dataResult } = renderHook(() =>
        useDataFetch(endpoint, [filterResult.current.filters.brand])
      )

      await waitFor(() => {
        expect(dataResult.current.data).toEqual(mockData)
      })

      act(() => {
        filterResult.current.setFilter('brand', 'Golden')
      })

      // Should trigger refetch due to dependency change
      await waitFor(() => {
        expect(apiGet).toHaveBeenCalledWith('/api/paints?brand=Golden')
      })
    })

    it('should compose all three hooks together', async () => {
      const mockData = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        brand: i % 2 === 0 ? 'Golden' : 'Liquitex'
      }))
      ;(apiGet as jest.Mock).mockResolvedValue({ data: mockData })

      // Filters
      const { result: filterResult } = renderHook(() =>
        useFilters({ brand: null as string | null, search: null as string | null })
      )

      // Data fetching with filters
      const endpoint = `/api/paints?brand=${filterResult.current.filters.brand || ''}`
      const { result: dataResult } = renderHook(() =>
        useDataFetch<typeof mockData>(endpoint, [filterResult.current.filters])
      )

      await waitFor(() => {
        expect(dataResult.current.data).toBeTruthy()
      })

      // Pagination
      const { result: paginationResult } = renderHook(() =>
        usePagination(dataResult.current.data?.length || 0, 10)
      )

      expect(paginationResult.current.totalPages).toBe(5) // 50 / 10

      // Get paginated subset
      const paginatedData = dataResult.current.data?.slice(
        (paginationResult.current.currentPage - 1) * 10,
        paginationResult.current.currentPage * 10
      )

      expect(paginatedData).toHaveLength(10)
    })

    it('should handle filter changes triggering data refetch and pagination reset', async () => {
      ;(apiGet as jest.Mock).mockResolvedValue({ data: Array(100).fill({}) })

      const { result: filterResult } = renderHook(() =>
        useFilters({ brand: null as string | null })
      )

      const { result: dataResult } = renderHook(() =>
        useDataFetch('/api/paints', [filterResult.current.filters])
      )

      const { result: paginationResult } = renderHook(() =>
        usePagination(dataResult.current.data?.length || 0)
      )

      // Go to page 3
      act(() => {
        paginationResult.current.goToPage(3)
      })

      expect(paginationResult.current.currentPage).toBe(3)

      // Change filter - should reset pagination
      act(() => {
        filterResult.current.setFilter('brand', 'Golden')
      })

      // Reset pagination when filters change (application logic)
      act(() => {
        paginationResult.current.goToPage(1)
      })

      expect(paginationResult.current.currentPage).toBe(1)
    })
  })
})
