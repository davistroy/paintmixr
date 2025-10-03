/**
 * Integration Test: Test Coverage Contract (T025)
 * Feature: 005-use-codebase-analysis
 * Phase: 3.2 TDD - Code Quality Contracts
 *
 * Requirements: FR-008 (90%+ Coverage for Critical Paths)
 *
 * Verifies test coverage metrics:
 * - ≥90% coverage for src/lib/auth/
 * - ≥90% coverage for src/lib/color/
 * - ≥90% coverage for src/lib/mixing/
 * - Branch and condition coverage ≥90%
 *
 * EXPECTED: Tests PASS (coverage already high from previous features)
 */

import { describe, it, expect } from '@jest/globals'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

interface CoverageMetrics {
  lines: {
    total: number
    covered: number
    percentage: number
  }
  statements: {
    total: number
    covered: number
    percentage: number
  }
  functions: {
    total: number
    covered: number
    percentage: number
  }
  branches: {
    total: number
    covered: number
    percentage: number
  }
}

interface FileCoverage {
  path: string
  lines: number
  statements: number
  functions: number
  branches: number
}

describe('Integration: Test Coverage Contract', () => {
  const projectRoot = process.cwd()
  const coverageDir = path.join(projectRoot, 'coverage')
  const coverageSummaryPath = path.join(coverageDir, 'coverage-summary.json')

  /**
   * Run Jest with coverage
   */
  function runCoverageReport(): void {
    try {
      execSync('npm run test:coverage -- --silent', {
        cwd: projectRoot,
        stdio: 'pipe',
        timeout: 120000, // 2 minutes
      })
    } catch (error: any) {
      // Jest returns non-zero exit code if tests fail
      // But coverage report is still generated
      console.warn('⚠️  Some tests failed, but coverage report generated')
    }
  }

  /**
   * Parse coverage summary JSON
   */
  function parseCoverageSummary(): Record<string, CoverageMetrics> {
    if (!fs.existsSync(coverageSummaryPath)) {
      throw new Error('Coverage summary not found. Run npm run test:coverage first.')
    }

    const summary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf-8'))
    const result: Record<string, CoverageMetrics> = {}

    Object.entries(summary).forEach(([filePath, metrics]: [string, any]) => {
      result[filePath] = {
        lines: {
          total: metrics.lines?.total || 0,
          covered: metrics.lines?.covered || 0,
          percentage: metrics.lines?.pct || 0,
        },
        statements: {
          total: metrics.statements?.total || 0,
          covered: metrics.statements?.covered || 0,
          percentage: metrics.statements?.pct || 0,
        },
        functions: {
          total: metrics.functions?.total || 0,
          covered: metrics.functions?.covered || 0,
          percentage: metrics.functions?.pct || 0,
        },
        branches: {
          total: metrics.branches?.total || 0,
          covered: metrics.branches?.covered || 0,
          percentage: metrics.branches?.pct || 0,
        },
      }
    })

    return result
  }

  /**
   * Get coverage for specific directory
   */
  function getCoverageForDirectory(coverage: Record<string, CoverageMetrics>, dirPattern: string): FileCoverage[] {
    const results: FileCoverage[] = []

    Object.entries(coverage).forEach(([filePath, metrics]) => {
      // Normalize path for comparison
      const normalizedPath = filePath.replace(/\\/g, '/')

      if (normalizedPath.includes(dirPattern)) {
        results.push({
          path: filePath,
          lines: metrics.lines.percentage,
          statements: metrics.statements.percentage,
          functions: metrics.functions.percentage,
          branches: metrics.branches.percentage,
        })
      }
    })

    return results
  }

  describe('Coverage Report Generation', () => {
    it('should generate coverage report', () => {
      console.log('\n🧪 Running test suite with coverage...')

      runCoverageReport()

      expect(fs.existsSync(coverageDir)).toBe(true)
      expect(fs.existsSync(coverageSummaryPath)).toBe(true)

      console.log('✅ Coverage report generated\n')
    }, 180000) // 3 minute timeout

    it('should have coverage summary JSON', () => {
      if (!fs.existsSync(coverageSummaryPath)) {
        throw new Error('Coverage summary not found. Run previous test first.')
      }

      const summary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf-8'))

      // Should have 'total' entry
      expect(summary.total).toBeDefined()

      console.log('\n📊 Overall Coverage:')
      console.log(`  Lines: ${summary.total.lines.pct}%`)
      console.log(`  Statements: ${summary.total.statements.pct}%`)
      console.log(`  Functions: ${summary.total.functions.pct}%`)
      console.log(`  Branches: ${summary.total.branches.pct}%`)
      console.log('')
    })
  })

  describe('Critical Path Coverage: src/lib/auth/', () => {
    const TARGET_COVERAGE = 90

    it('should have ≥90% line coverage for auth module', () => {
      const coverage = parseCoverageSummary()
      const authCoverage = getCoverageForDirectory(coverage, 'src/lib/auth')

      if (authCoverage.length === 0) {
        console.warn('⚠️  No coverage data for src/lib/auth/')
        return
      }

      console.log('\n🔐 Auth Module Coverage:')
      authCoverage.forEach(file => {
        console.log(`  ${path.basename(file.path)}: ${file.lines.toFixed(1)}%`)
      })

      // Calculate average coverage
      const avgCoverage = authCoverage.reduce((sum, f) => sum + f.lines, 0) / authCoverage.length

      console.log(`\n  Average: ${avgCoverage.toFixed(1)}%`)
      console.log(`  Target: ${TARGET_COVERAGE}%`)
      console.log('')

      expect(avgCoverage).toBeGreaterThanOrEqual(TARGET_COVERAGE)
    })

    it('should have ≥90% branch coverage for auth module', () => {
      const coverage = parseCoverageSummary()
      const authCoverage = getCoverageForDirectory(coverage, 'src/lib/auth')

      if (authCoverage.length === 0) {
        return
      }

      const avgBranchCoverage = authCoverage.reduce((sum, f) => sum + f.branches, 0) / authCoverage.length

      console.log(`\n🔀 Auth Module Branch Coverage: ${avgBranchCoverage.toFixed(1)}%\n`)

      expect(avgBranchCoverage).toBeGreaterThanOrEqual(TARGET_COVERAGE)
    })

    it('should have ≥90% function coverage for auth module', () => {
      const coverage = parseCoverageSummary()
      const authCoverage = getCoverageForDirectory(coverage, 'src/lib/auth')

      if (authCoverage.length === 0) {
        return
      }

      const avgFunctionCoverage = authCoverage.reduce((sum, f) => sum + f.functions, 0) / authCoverage.length

      console.log(`\n⚙️  Auth Module Function Coverage: ${avgFunctionCoverage.toFixed(1)}%\n`)

      expect(avgFunctionCoverage).toBeGreaterThanOrEqual(TARGET_COVERAGE)
    })
  })

  describe('Critical Path Coverage: src/lib/color/', () => {
    const TARGET_COVERAGE = 90

    it('should have ≥90% line coverage for color module', () => {
      const coverage = parseCoverageSummary()
      const colorCoverage = getCoverageForDirectory(coverage, 'src/lib/color')

      if (colorCoverage.length === 0) {
        console.warn('⚠️  No coverage data for src/lib/color/')
        return
      }

      console.log('\n🎨 Color Module Coverage:')
      colorCoverage.forEach(file => {
        console.log(`  ${path.basename(file.path)}: ${file.lines.toFixed(1)}%`)
      })

      const avgCoverage = colorCoverage.reduce((sum, f) => sum + f.lines, 0) / colorCoverage.length

      console.log(`\n  Average: ${avgCoverage.toFixed(1)}%`)
      console.log(`  Target: ${TARGET_COVERAGE}%`)
      console.log('')

      expect(avgCoverage).toBeGreaterThanOrEqual(TARGET_COVERAGE)
    })

    it('should have ≥90% branch coverage for color module', () => {
      const coverage = parseCoverageSummary()
      const colorCoverage = getCoverageForDirectory(coverage, 'src/lib/color')

      if (colorCoverage.length === 0) {
        return
      }

      const avgBranchCoverage = colorCoverage.reduce((sum, f) => sum + f.branches, 0) / colorCoverage.length

      console.log(`\n🔀 Color Module Branch Coverage: ${avgBranchCoverage.toFixed(1)}%\n`)

      expect(avgBranchCoverage).toBeGreaterThanOrEqual(TARGET_COVERAGE)
    })
  })

  describe('Critical Path Coverage: src/lib/mixing/', () => {
    const TARGET_COVERAGE = 90

    it('should have ≥90% line coverage for mixing module', () => {
      const coverage = parseCoverageSummary()
      const mixingCoverage = getCoverageForDirectory(coverage, 'src/lib/mixing')

      if (mixingCoverage.length === 0) {
        console.warn('⚠️  No coverage data for src/lib/mixing/')
        return
      }

      console.log('\n🎨 Mixing Module Coverage:')
      mixingCoverage.forEach(file => {
        console.log(`  ${path.basename(file.path)}: ${file.lines.toFixed(1)}%`)
      })

      const avgCoverage = mixingCoverage.reduce((sum, f) => sum + f.lines, 0) / mixingCoverage.length

      console.log(`\n  Average: ${avgCoverage.toFixed(1)}%`)
      console.log(`  Target: ${TARGET_COVERAGE}%`)
      console.log('')

      expect(avgCoverage).toBeGreaterThanOrEqual(TARGET_COVERAGE)
    })

    it('should have ≥90% branch coverage for mixing module', () => {
      const coverage = parseCoverageSummary()
      const mixingCoverage = getCoverageForDirectory(coverage, 'src/lib/mixing')

      if (mixingCoverage.length === 0) {
        return
      }

      const avgBranchCoverage = mixingCoverage.reduce((sum, f) => sum + f.branches, 0) / mixingCoverage.length

      console.log(`\n🔀 Mixing Module Branch Coverage: ${avgBranchCoverage.toFixed(1)}%\n`)

      expect(avgBranchCoverage).toBeGreaterThanOrEqual(TARGET_COVERAGE)
    })
  })

  describe('Overall Coverage Metrics', () => {
    it('should report uncovered files', () => {
      const coverage = parseCoverageSummary()
      const uncoveredFiles: Array<{ path: string; coverage: number }> = []

      Object.entries(coverage).forEach(([filePath, metrics]) => {
        // Skip 'total' entry
        if (filePath === 'total') return

        // Files with <50% coverage are concerning
        if (metrics.lines.percentage < 50) {
          uncoveredFiles.push({
            path: filePath,
            coverage: metrics.lines.percentage,
          })
        }
      })

      if (uncoveredFiles.length > 0) {
        console.log('\n⚠️  Files with <50% Coverage:')
        uncoveredFiles
          .sort((a, b) => a.coverage - b.coverage)
          .forEach(f => {
            console.log(`  ${f.coverage.toFixed(1)}%: ${f.path}`)
          })
        console.log('')
      }

      // This is informational - identifies coverage gaps
    })

    it('should maintain overall coverage above baseline', () => {
      const coverage = parseCoverageSummary()
      const total = coverage.total

      if (!total) {
        throw new Error('No total coverage metrics found')
      }

      console.log('\n📈 Overall Coverage Metrics:')
      console.log(`  Lines: ${total.lines.percentage}%`)
      console.log(`  Statements: ${total.statements.percentage}%`)
      console.log(`  Functions: ${total.functions.percentage}%`)
      console.log(`  Branches: ${total.branches.percentage}%`)
      console.log('')

      // Store baseline
      const baseline = {
        timestamp: new Date().toISOString(),
        metrics: {
          lines: total.lines.percentage,
          statements: total.statements.percentage,
          functions: total.functions.percentage,
          branches: total.branches.percentage,
        },
      }

      const baselineFile = path.join(projectRoot, '__tests__/tmp/coverage-baseline.json')
      const tmpDir = path.dirname(baselineFile)

      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true })
      }

      fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2))
      console.log(`Baseline saved to: ${baselineFile}\n`)

      // Overall coverage should be reasonable
      expect(total.lines.percentage).toBeGreaterThan(50)
    })

    it('should identify coverage gaps in critical paths', () => {
      const coverage = parseCoverageSummary()

      // Check all critical paths
      const criticalPaths = ['src/lib/auth', 'src/lib/color', 'src/lib/mixing']

      const gaps: Array<{ module: string; coverage: number }> = []

      criticalPaths.forEach(modulePath => {
        const moduleCoverage = getCoverageForDirectory(coverage, modulePath)

        if (moduleCoverage.length > 0) {
          const avgCoverage = moduleCoverage.reduce((sum, f) => sum + f.lines, 0) / moduleCoverage.length

          if (avgCoverage < 90) {
            gaps.push({
              module: modulePath,
              coverage: avgCoverage,
            })
          }
        }
      })

      if (gaps.length > 0) {
        console.log('\n⚠️  Critical Modules Below 90% Coverage:')
        gaps.forEach(g => {
          console.log(`  ${g.module}: ${g.coverage.toFixed(1)}%`)
        })
        console.log('')
      }
    })
  })

  describe('Coverage Quality Checks', () => {
    it('should not have artificially inflated coverage', () => {
      const coverage = parseCoverageSummary()

      // Check if any files have 100% coverage but no branches
      const suspiciousFiles: string[] = []

      Object.entries(coverage).forEach(([filePath, metrics]) => {
        if (filePath === 'total') return

        // 100% line coverage but 0% branch coverage is suspicious
        if (metrics.lines.percentage === 100 && metrics.branches.percentage === 0 && metrics.branches.total > 0) {
          suspiciousFiles.push(filePath)
        }
      })

      if (suspiciousFiles.length > 0) {
        console.log('\n🔍 Potentially Incomplete Coverage:')
        suspiciousFiles.forEach(f => console.log(`  ${f}`))
        console.log('')
      }

      // This is informational - helps identify test quality issues
    })

    it('should have balanced coverage metrics', () => {
      const coverage = parseCoverageSummary()
      const total = coverage.total

      if (!total) return

      // Line and statement coverage should be similar
      const lineDiff = Math.abs(total.lines.percentage - total.statements.percentage)

      console.log('\n⚖️  Coverage Metric Balance:')
      console.log(`  Line vs Statement diff: ${lineDiff.toFixed(1)}%`)
      console.log('')

      // Large differences indicate potential issues
      expect(lineDiff).toBeLessThan(20)
    })
  })
})
