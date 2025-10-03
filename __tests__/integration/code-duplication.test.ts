/**
 * Integration Test: Code Duplication Contract (T023)
 * Feature: 005-use-codebase-analysis
 * Phase: 3.2 TDD - Code Quality Contracts
 *
 * Requirements: FR-010 (Shared Utilities)
 *
 * Verifies code duplication metrics using jscpd:
 * - Current baseline: <60% duplication
 * - Target: 30-35% after refactoring
 * - Token-based detection (semantic similarity)
 * - Identifies duplicate code blocks
 *
 * EXPECTED: Tests PASS with current baseline, FAIL after refactoring targets set
 */

import { describe, it, expect } from '@jest/globals'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

interface JscpdMetrics {
  total: {
    lines: number
    tokens: number
    files: number
  }
  duplicated: {
    lines: number
    tokens: number
    percentage: number
  }
  clones: Array<{
    format: string
    lines: number
    tokens: number
    firstFile: string
    secondFile: string
  }>
}

describe('Integration: Code Duplication Contract', () => {
  const projectRoot = process.cwd()
  const jscpdConfigPath = path.join(projectRoot, '.jscpd.json')

  /**
   * Check if jscpd is installed
   */
  function isJscpdInstalled(): boolean {
    try {
      execSync('npx jscpd --version', {
        stdio: 'pipe',
        cwd: projectRoot,
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * Run jscpd and parse results
   */
  function runJscpd(): JscpdMetrics | null {
    const reportPath = path.join(projectRoot, '__tests__/tmp/jscpd-report.json')
    const reportDir = path.dirname(reportPath)

    // Ensure temp directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }

    try {
      // Run jscpd with JSON output
      execSync(
        `npx jscpd src --min-lines 5 --min-tokens 50 --mode token --format json --output ${reportDir}`,
        {
          cwd: projectRoot,
          stdio: 'pipe',
        }
      )

      // Read generated report
      const jscpdOutput = path.join(reportDir, 'jscpd-report.json')
      if (fs.existsSync(jscpdOutput)) {
        const report = JSON.parse(fs.readFileSync(jscpdOutput, 'utf-8'))

        // Parse jscpd v4 format
        const statistics = report.statistics || {}
        const total = statistics.total || {}
        const clones = statistics.clones || []

        const totalTokens = total.tokens || 0
        const duplicatedTokens = clones.reduce((sum: number, clone: any) => {
          return sum + (clone.duplicationA?.tokens || 0)
        }, 0)

        const percentage = totalTokens > 0 ? (duplicatedTokens / totalTokens) * 100 : 0

        return {
          total: {
            lines: total.lines || 0,
            tokens: totalTokens,
            files: total.sources || 0,
          },
          duplicated: {
            lines: clones.reduce((sum: number, clone: any) => sum + (clone.duplicationA?.lines || 0), 0),
            tokens: duplicatedTokens,
            percentage,
          },
          clones: clones.map((clone: any) => ({
            format: clone.format || 'unknown',
            lines: clone.duplicationA?.lines || 0,
            tokens: clone.duplicationA?.tokens || 0,
            firstFile: clone.duplicationA?.sourceId || '',
            secondFile: clone.duplicationB?.sourceId || '',
          })),
        }
      }

      return null
    } catch (error: any) {
      console.error('jscpd execution failed:', error.message)
      return null
    }
  }

  describe('jscpd Tool Availability', () => {
    it('should have jscpd installed or document it', () => {
      const installed = isJscpdInstalled()

      if (!installed) {
        console.warn('\n⚠️  jscpd NOT INSTALLED')
        console.warn('   Install with: npm install -D jscpd')
        console.warn('   This tool is required for duplication detection\n')
      } else {
        console.log('\n✅ jscpd is installed')
      }

      // Don't fail if not installed - just document it
      // (Test framework allows missing tools during baseline phase)
    })

    it('should have jscpd configuration file (optional)', () => {
      if (fs.existsSync(jscpdConfigPath)) {
        console.log('✅ Found .jscpd.json configuration')

        const config = JSON.parse(fs.readFileSync(jscpdConfigPath, 'utf-8'))
        console.log('Configuration:', JSON.stringify(config, null, 2))
      } else {
        console.log('ℹ️  No .jscpd.json found - using defaults')
      }

      // Configuration file is optional
    })
  })

  describe('Baseline Duplication Metrics', () => {
    it('should measure current duplication percentage', () => {
      if (!isJscpdInstalled()) {
        console.warn('⏭️  Skipping: jscpd not installed')
        return
      }

      const metrics = runJscpd()

      if (!metrics) {
        console.warn('⚠️  Could not generate jscpd report')
        return
      }

      console.log('\n📊 DUPLICATION BASELINE:')
      console.log(`  Total files: ${metrics.total.files}`)
      console.log(`  Total lines: ${metrics.total.lines}`)
      console.log(`  Total tokens: ${metrics.total.tokens}`)
      console.log(`  Duplicated tokens: ${metrics.duplicated.tokens}`)
      console.log(`  Duplication: ${metrics.duplicated.percentage.toFixed(2)}%`)
      console.log('')

      // Store baseline
      const baseline = {
        timestamp: new Date().toISOString(),
        metrics,
      }

      const baselineFile = path.join(projectRoot, '__tests__/tmp/duplication-baseline.json')
      fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2))
      console.log(`Baseline saved to: ${baselineFile}\n`)
    })

    it('should enforce <60% duplication (current baseline)', () => {
      if (!isJscpdInstalled()) {
        console.warn('⏭️  Skipping: jscpd not installed')
        return
      }

      const metrics = runJscpd()

      if (!metrics) {
        throw new Error('Failed to generate duplication metrics')
      }

      const BASELINE_LIMIT = 60 // Current baseline before refactoring

      console.log(`Current duplication: ${metrics.duplicated.percentage.toFixed(2)}%`)
      console.log(`Baseline limit: ${BASELINE_LIMIT}%`)

      expect(metrics.duplicated.percentage).toBeLessThan(BASELINE_LIMIT)
    })
  })

  describe('Duplication Targets (Post-Refactoring)', () => {
    it('should target 30-35% duplication after refactoring', () => {
      if (!isJscpdInstalled()) {
        console.warn('⏭️  Skipping: jscpd not installed')
        return
      }

      const metrics = runJscpd()

      if (!metrics) {
        throw new Error('Failed to generate duplication metrics')
      }

      const TARGET_MAX = 35 // Target after shared utilities implemented

      console.log(`\n🎯 POST-REFACTORING TARGET:`)
      console.log(`  Current: ${metrics.duplicated.percentage.toFixed(2)}%`)
      console.log(`  Target: ≤${TARGET_MAX}%`)

      if (metrics.duplicated.percentage > TARGET_MAX) {
        console.log(`  ❌ Need to reduce by ${(metrics.duplicated.percentage - TARGET_MAX).toFixed(2)}%\n`)
      } else {
        console.log(`  ✅ Target met!\n`)
      }

      // EXPECTED TO FAIL until refactoring complete
      expect(metrics.duplicated.percentage).toBeLessThanOrEqual(TARGET_MAX)
    })

    it('should identify largest duplicate code blocks', () => {
      if (!isJscpdInstalled()) {
        console.warn('⏭️  Skipping: jscpd not installed')
        return
      }

      const metrics = runJscpd()

      if (!metrics || !metrics.clones || metrics.clones.length === 0) {
        console.log('ℹ️  No duplicate code blocks detected')
        return
      }

      // Sort clones by size (tokens)
      const largestClones = metrics.clones
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 10)

      console.log('\n🔍 TOP 10 DUPLICATE CODE BLOCKS:')
      largestClones.forEach((clone, index) => {
        console.log(`  ${index + 1}. ${clone.tokens} tokens, ${clone.lines} lines`)
        console.log(`     ${clone.firstFile}`)
        console.log(`     ${clone.secondFile}`)
      })
      console.log('')

      // This is informational - helps identify refactoring targets
    })
  })

  describe('Duplication by File Type', () => {
    it('should analyze duplication in TypeScript files', () => {
      if (!isJscpdInstalled()) {
        console.warn('⏭️  Skipping: jscpd not installed')
        return
      }

      const metrics = runJscpd()

      if (!metrics || !metrics.clones) {
        return
      }

      // Count duplicates by file extension
      const byExtension: Record<string, number> = {}

      metrics.clones.forEach(clone => {
        const ext = path.extname(clone.firstFile) || 'unknown'
        byExtension[ext] = (byExtension[ext] || 0) + 1
      })

      console.log('\n📂 Duplication by File Type:')
      Object.entries(byExtension)
        .sort(([, a], [, b]) => b - a)
        .forEach(([ext, count]) => {
          console.log(`  ${ext}: ${count} duplicate blocks`)
        })
      console.log('')
    })

    it('should identify files with most duplication', () => {
      if (!isJscpdInstalled()) {
        console.warn('⏭️  Skipping: jscpd not installed')
        return
      }

      const metrics = runJscpd()

      if (!metrics || !metrics.clones) {
        return
      }

      // Count how many times each file appears in duplication
      const fileOccurrences: Record<string, number> = {}

      metrics.clones.forEach(clone => {
        fileOccurrences[clone.firstFile] = (fileOccurrences[clone.firstFile] || 0) + 1
        fileOccurrences[clone.secondFile] = (fileOccurrences[clone.secondFile] || 0) + 1
      })

      const mostDuplicated = Object.entries(fileOccurrences)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)

      console.log('\n🎯 Files with Most Duplication:')
      mostDuplicated.forEach(([file, count]) => {
        console.log(`  ${count} duplicates: ${file}`)
      })
      console.log('')

      // These files are prime refactoring candidates
    })
  })

  describe('Duplication Patterns', () => {
    it('should detect common patterns eligible for extraction', () => {
      if (!isJscpdInstalled()) {
        console.warn('⏭️  Skipping: jscpd not installed')
        return
      }

      const metrics = runJscpd()

      if (!metrics || !metrics.clones) {
        return
      }

      // Analyze clone characteristics
      const patterns = {
        smallClones: 0, // <100 tokens (maybe not worth extracting)
        mediumClones: 0, // 100-300 tokens (good candidates)
        largeClones: 0, // >300 tokens (definitely extract)
      }

      metrics.clones.forEach(clone => {
        if (clone.tokens < 100) patterns.smallClones++
        else if (clone.tokens < 300) patterns.mediumClones++
        else patterns.largeClones++
      })

      console.log('\n🔬 Duplication Pattern Analysis:')
      console.log(`  Small duplicates (<100 tokens): ${patterns.smallClones}`)
      console.log(`  Medium duplicates (100-300): ${patterns.mediumClones}`)
      console.log(`  Large duplicates (>300): ${patterns.largeClones}`)
      console.log('')
      console.log(`  Extraction candidates: ${patterns.mediumClones + patterns.largeClones}`)
      console.log('')

      // Large duplicates should be extracted to shared utilities
      if (patterns.largeClones > 0) {
        console.log(`⚠️  ${patterns.largeClones} large duplicate blocks found`)
        console.log('   Consider extracting to shared utilities\n')
      }
    })
  })

  describe('Duplication Trend Tracking', () => {
    it('should compare against previous baseline (if exists)', () => {
      const baselineFile = path.join(projectRoot, '__tests__/tmp/duplication-baseline.json')

      if (!fs.existsSync(baselineFile)) {
        console.log('ℹ️  No previous baseline found')
        return
      }

      if (!isJscpdInstalled()) {
        console.warn('⏭️  Skipping: jscpd not installed')
        return
      }

      const previousBaseline = JSON.parse(fs.readFileSync(baselineFile, 'utf-8'))
      const currentMetrics = runJscpd()

      if (!currentMetrics) {
        return
      }

      const previousPercentage = previousBaseline.metrics?.duplicated?.percentage || 0
      const currentPercentage = currentMetrics.duplicated.percentage
      const change = currentPercentage - previousPercentage

      console.log('\n📈 Duplication Trend:')
      console.log(`  Previous: ${previousPercentage.toFixed(2)}%`)
      console.log(`  Current: ${currentPercentage.toFixed(2)}%`)
      console.log(`  Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`)
      console.log('')

      if (change > 0) {
        console.log('⚠️  Duplication increased - review recent changes\n')
      } else if (change < 0) {
        console.log('✅ Duplication decreased - good progress!\n')
      }

      // Duplication should not increase
      expect(change).toBeLessThanOrEqual(0)
    })
  })

  describe('Refactoring Opportunities', () => {
    it('should generate refactoring recommendations', () => {
      if (!isJscpdInstalled()) {
        console.warn('⏭️  Skipping: jscpd not installed')
        return
      }

      const metrics = runJscpd()

      if (!metrics || !metrics.clones || metrics.clones.length === 0) {
        console.log('✅ No significant duplication found')
        return
      }

      console.log('\n💡 REFACTORING RECOMMENDATIONS:')

      // Group clones by file pairs
      const filePairs: Record<string, number> = {}

      metrics.clones.forEach(clone => {
        const pair = [clone.firstFile, clone.secondFile].sort().join(' <-> ')
        filePairs[pair] = (filePairs[pair] || 0) + clone.tokens
      })

      const topPairs = Object.entries(filePairs)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)

      console.log('\n  Top 5 file pairs with duplication:')
      topPairs.forEach(([pair, tokens], index) => {
        console.log(`  ${index + 1}. ${tokens} duplicate tokens`)
        console.log(`     ${pair}`)
      })

      console.log('\n  Suggested actions:')
      console.log('  1. Extract common API call patterns to src/lib/api/client.ts')
      console.log('  2. Move shared validation to src/lib/validation/schemas.ts')
      console.log('  3. Create shared hooks in src/hooks/')
      console.log('  4. Extract UI patterns to reusable components')
      console.log('')
    })
  })
})
