/**
 * Shared Pagination Hook
 * Contract: refactoring-contracts.md - Contract 3
 * Feature: 005-use-codebase-analysis
 */

import { useState, useMemo } from 'react'

export interface PaginationState {
  currentPage: number
  pageSize: number
  totalItems: number
}

export interface PaginationControls {
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  goToPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void
  setPageSize: (size: number) => void
}

/**
 * Generic pagination hook with consistent behavior
 */
export function usePagination(
  totalItems: number,
  initialPageSize: number = 20
): PaginationControls {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const totalPages = Math.ceil(totalItems / pageSize)

  const controls = useMemo(() => ({
    currentPage,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    goToPage: (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages))
      setCurrentPage(validPage)
    },
    nextPage: () => {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1)
      }
    },
    previousPage: () => {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1)
      }
    },
    setPageSize: (size: number) => {
      setPageSize(size)
      setCurrentPage(1) // Reset to first page on size change
    }
  }), [currentPage, totalPages, pageSize])

  return controls
}
