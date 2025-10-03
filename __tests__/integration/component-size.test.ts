/**
 * Integration Test: Component Size Contract (T022)
 * Feature: 005-use-codebase-analysis
 * Phase: 3.2 TDD - Code Quality Contracts
 *
 * Requirements: FR-009 (Modularity)
 *
 * Verifies component size constraints:
 * - No component exceeds 300 lines (hard limit)
 * - Average component size < 250 lines (target)
 * - Excludes comments, whitespace, and imports
 * - Identifies components needing refactoring
 *
 * EXPECTED: Most tests FAIL (size violations not fixed yet)
 */

import { describe, it, expect } from '@jest/globals'
import * as fs from 'fs'
import * as path from 'path'
import { globSync } from 'glob'

interface ComponentMetrics {
  file: string
  totalLines: number
  codeLines: number
  commentLines: number
  blankLines: number
  importLines: number
}

describe('Integration: Component Size Contract', () => {
  const componentsDir = path.join(process.cwd(), 'src/components')

  /**
   * Count lines in a component, excluding comments and whitespace
   */
  function analyzeComponent(filePath: string): ComponentMetrics {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    let codeLines = 0
    let commentLines = 0
    let blankLines = 0
    let importLines = 0
    let inBlockComment = false

    for (const line of lines) {
      const trimmed = line.trim()

      // Track blank lines
      if (trimmed === '') {
        blankLines++
        continue
      }

      // Track block comments
      if (trimmed.startsWith('/*')) {
        inBlockComment = true
        commentLines++
        if (trimmed.includes('*/')) {
          inBlockComment = false
        }
        continue
      }

      if (inBlockComment) {
        commentLines++
        if (trimmed.includes('*/')) {
          inBlockComment = false
        }
        continue
      }

      // Track single-line comments
      if (trimmed.startsWith('//')) {
        commentLines++
        continue
      }

      // Track import statements
      if (trimmed.startsWith('import ') || trimmed.startsWith('export ')) {
        importLines++
        codeLines++ // Imports count as code for total
        continue
      }

      // Actual code line
      codeLines++
    }

    return {
      file: path.relative(process.cwd(), filePath),
      totalLines: lines.length,
      codeLines: codeLines - importLines, // Exclude imports from code count
      commentLines,
      blankLines,
      importLines,
    }
  }

  /**
   * Get all component files
   */
  function getAllComponents(): string[] {
    const pattern = path.join(componentsDir, '**/*.tsx')
    return globSync(pattern)
  }

  describe('Component File Discovery', () => {
    it('should find component files in src/components/', () => {
      const components = getAllComponents()

      expect(components.length).toBeGreaterThan(0)
      console.log(`Found ${components.length} component files`)
    })

    it('should analyze all .tsx files', () => {
      const components = getAllComponents()

      // All files should be .tsx
      components.forEach(file => {
        expect(file).toMatch(/\.tsx$/)
      })
    })
  })

  describe('Component Size Limits', () => {
    const MAX_LINES = 300 // Hard limit
    const TARGET_AVERAGE = 250 // Average target

    it('should enforce 300 line maximum per component', () => {
      const components = getAllComponents()
      const violations: Array<{ file: string; lines: number }> = []

      components.forEach(file => {
        const metrics = analyzeComponent(file)

        if (metrics.codeLines > MAX_LINES) {
          violations.push({
            file: metrics.file,
            lines: metrics.codeLines,
          })
        }
      })

      if (violations.length > 0) {
        console.error('\n❌ COMPONENTS EXCEEDING 300 LINES:')
        violations.forEach(v => {
          console.error(`  ${v.file}: ${v.lines} lines (${v.lines - MAX_LINES} over)`)
        })
        console.error('')
      }

      expect(violations).toHaveLength(0)
    })

    it('should maintain average component size < 250 lines', () => {
      const components = getAllComponents()
      const metrics = components.map(analyzeComponent)

      const totalCodeLines = metrics.reduce((sum, m) => sum + m.codeLines, 0)
      const averageLines = totalCodeLines / metrics.length

      console.log(`\n📊 Component Size Metrics:`)
      console.log(`  Total components: ${metrics.length}`)
      console.log(`  Average size: ${averageLines.toFixed(1)} lines`)
      console.log(`  Target average: ${TARGET_AVERAGE} lines`)
      console.log('')

      expect(averageLines).toBeLessThan(TARGET_AVERAGE)
    })

    it('should identify components needing refactoring (>250 lines)', () => {
      const REFACTOR_THRESHOLD = 250
      const components = getAllComponents()
      const needsRefactoring: Array<{ file: string; lines: number }> = []

      components.forEach(file => {
        const metrics = analyzeComponent(file)

        if (metrics.codeLines > REFACTOR_THRESHOLD) {
          needsRefactoring.push({
            file: metrics.file,
            lines: metrics.codeLines,
          })
        }
      })

      if (needsRefactoring.length > 0) {
        console.log('\n⚠️  COMPONENTS NEEDING REFACTORING (>250 lines):')
        needsRefactoring
          .sort((a, b) => b.lines - a.lines)
          .forEach(c => {
            console.log(`  ${c.file}: ${c.lines} lines`)
          })
        console.log('')
      }

      // This is informational - doesn't fail the build
      // Just tracks which components should be split
    })
  })

  describe('Component Size Distribution', () => {
    it('should report size distribution across all components', () => {
      const components = getAllComponents()
      const metrics = components.map(analyzeComponent)

      // Group by size ranges
      const ranges = {
        'Small (0-100)': 0,
        'Medium (101-200)': 0,
        'Large (201-300)': 0,
        'Too Large (>300)': 0,
      }

      metrics.forEach(m => {
        if (m.codeLines <= 100) ranges['Small (0-100)']++
        else if (m.codeLines <= 200) ranges['Medium (101-200)']++
        else if (m.codeLines <= 300) ranges['Large (201-300)']++
        else ranges['Too Large (>300)']++
      })

      console.log('\n📈 Component Size Distribution:')
      Object.entries(ranges).forEach(([range, count]) => {
        const percentage = ((count / metrics.length) * 100).toFixed(1)
        console.log(`  ${range}: ${count} components (${percentage}%)`)
      })
      console.log('')

      // Most components should be small-medium
      const smallMedium = ranges['Small (0-100)'] + ranges['Medium (101-200)']
      const percentage = (smallMedium / metrics.length) * 100

      expect(percentage).toBeGreaterThan(50) // At least 50% small/medium
    })

    it('should report largest components for review', () => {
      const components = getAllComponents()
      const metrics = components
        .map(analyzeComponent)
        .sort((a, b) => b.codeLines - a.codeLines)
        .slice(0, 10) // Top 10 largest

      console.log('\n🔍 Top 10 Largest Components:')
      metrics.forEach((m, index) => {
        console.log(`  ${index + 1}. ${m.file}: ${m.codeLines} lines`)
      })
      console.log('')

      // This is informational only
    })

    it('should calculate complexity proxy (lines per file)', () => {
      const components = getAllComponents()
      const metrics = components.map(analyzeComponent)

      // Calculate median component size
      const sortedSizes = metrics
        .map(m => m.codeLines)
        .sort((a, b) => a - b)

      const median = sortedSizes[Math.floor(sortedSizes.length / 2)]

      console.log(`\n📐 Complexity Metrics:`)
      console.log(`  Median component size: ${median} lines`)
      console.log(`  Smallest component: ${sortedSizes[0]} lines`)
      console.log(`  Largest component: ${sortedSizes[sortedSizes.length - 1]} lines`)
      console.log('')

      // Median should be reasonable
      expect(median).toBeLessThan(200)
    })
  })

  describe('Code vs Comments Ratio', () => {
    it('should maintain healthy code-to-comment ratio', () => {
      const components = getAllComponents()
      const metrics = components.map(analyzeComponent)

      const totalCode = metrics.reduce((sum, m) => sum + m.codeLines, 0)
      const totalComments = metrics.reduce((sum, m) => sum + m.commentLines, 0)

      const commentRatio = (totalComments / totalCode) * 100

      console.log(`\n💬 Comment Ratio:`)
      console.log(`  Code lines: ${totalCode}`)
      console.log(`  Comment lines: ${totalComments}`)
      console.log(`  Ratio: ${commentRatio.toFixed(1)}%`)
      console.log('')

      // 5-20% comments is healthy (too few or too many is bad)
      expect(commentRatio).toBeGreaterThan(2)
      expect(commentRatio).toBeLessThan(30)
    })
  })

  describe('Component Metrics Report', () => {
    it('should generate detailed metrics for all components', () => {
      const components = getAllComponents()
      const allMetrics = components.map(analyzeComponent)

      // Calculate summary statistics
      const summary = {
        totalComponents: allMetrics.length,
        totalCodeLines: allMetrics.reduce((sum, m) => sum + m.codeLines, 0),
        averageSize: 0,
        largestComponent: '',
        largestSize: 0,
        smallestComponent: '',
        smallestSize: Infinity,
      }

      allMetrics.forEach(m => {
        if (m.codeLines > summary.largestSize) {
          summary.largestComponent = m.file
          summary.largestSize = m.codeLines
        }
        if (m.codeLines < summary.smallestSize) {
          summary.smallestComponent = m.file
          summary.smallestSize = m.codeLines
        }
      })

      summary.averageSize = summary.totalCodeLines / summary.totalComponents

      console.log('\n📋 COMPONENT METRICS SUMMARY:')
      console.log(`  Total components: ${summary.totalComponents}`)
      console.log(`  Total code lines: ${summary.totalCodeLines}`)
      console.log(`  Average size: ${summary.averageSize.toFixed(1)} lines`)
      console.log(`  Largest: ${summary.largestComponent} (${summary.largestSize} lines)`)
      console.log(`  Smallest: ${summary.smallestComponent} (${summary.smallestSize} lines)`)
      console.log('')

      // Store baseline for future comparison
      const baseline = {
        timestamp: new Date().toISOString(),
        metrics: summary,
      }

      // Write baseline to temp file for tracking
      const baselineFile = path.join(process.cwd(), '__tests__/tmp/component-size-baseline.json')
      const tmpDir = path.dirname(baselineFile)

      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true })
      }

      fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2))
      console.log(`Baseline saved to: ${baselineFile}`)
    })
  })
})
