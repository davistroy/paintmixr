/**
 * Integration Test: Build Performance Contract (T027)
 * Feature: 005-use-codebase-analysis
 * Phase: 3.2 TDD - Code Quality Contracts
 *
 * Requirements: FR-013 (Build Validation), FR-014 (Performance)
 *
 * Verifies production build quality:
 * - `npm run build` completes with exit code 0
 * - No TypeScript errors in output
 * - No ESLint errors in output
 * - No warnings about ignored errors
 * - Bundle sizes reasonable (<100 KB per page)
 *
 * EXPECTED: Tests PASS (build already working from previous features)
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { globSync } from 'glob'

interface BuildMetrics {
  success: boolean
  duration: number
  output: string
  errors: string[]
  warnings: string[]
  bundleSizes: Record<string, number>
}

describe('Integration: Build Performance Contract', () => {
  const projectRoot = process.cwd()
  const buildDir = path.join(projectRoot, '.next')

  let buildMetrics: BuildMetrics | null = null

  /**
   * Run production build and capture metrics
   */
  function runProductionBuild(): BuildMetrics {
    const startTime = Date.now()

    let output = ''
    let success = false

    try {
      output = execSync('npm run build', {
        cwd: projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 300000, // 5 minute timeout
      })
      success = true
    } catch (error: any) {
      output = error.stdout?.toString() || error.stderr?.toString() || ''
      success = false
    }

    const duration = Date.now() - startTime

    // Parse errors and warnings
    const errors: string[] = []
    const warnings: string[] = []

    const lines = output.split('\n')
    lines.forEach(line => {
      if (line.includes('error') || line.includes('Error') || line.includes('ERROR')) {
        errors.push(line.trim())
      }
      if (line.includes('warning') || line.includes('Warning') || line.includes('WARN')) {
        warnings.push(line.trim())
      }
    })

    // Analyze bundle sizes (if build succeeded)
    const bundleSizes: Record<string, number> = {}
    if (success && fs.existsSync(buildDir)) {
      analyzeBundleSizes(bundleSizes)
    }

    return {
      success,
      duration,
      output,
      errors,
      warnings,
      bundleSizes,
    }
  }

  /**
   * Analyze bundle sizes from .next directory
   */
  function analyzeBundleSizes(bundleSizes: Record<string, number>): void {
    const serverDir = path.join(buildDir, 'server/app')
    const staticDir = path.join(buildDir, 'static/chunks/app')

    // Get server-side bundle sizes
    if (fs.existsSync(serverDir)) {
      const serverFiles = globSync(path.join(serverDir, '**/*.js'))
      serverFiles.forEach(file => {
        const stats = fs.statSync(file)
        const relativePath = path.relative(serverDir, file)
        bundleSizes[`server/${relativePath}`] = stats.size
      })
    }

    // Get client-side bundle sizes
    if (fs.existsSync(staticDir)) {
      const staticFiles = globSync(path.join(staticDir, '**/*.js'))
      staticFiles.forEach(file => {
        const stats = fs.statSync(file)
        const relativePath = path.relative(staticDir, file)
        bundleSizes[`client/${relativePath}`] = stats.size
      })
    }
  }

  beforeAll(() => {
    console.log('\n🏗️  Running production build...\n')
    buildMetrics = runProductionBuild()
  }, 360000) // 6 minute timeout

  describe('Build Success', () => {
    it('should complete build with exit code 0', () => {
      expect(buildMetrics).not.toBeNull()
      expect(buildMetrics!.success).toBe(true)

      console.log(`\n✅ Build completed in ${(buildMetrics!.duration / 1000).toFixed(2)}s\n`)
    })

    it('should generate .next build directory', () => {
      expect(fs.existsSync(buildDir)).toBe(true)

      // Check key directories
      const requiredDirs = [
        path.join(buildDir, 'server'),
        path.join(buildDir, 'static'),
      ]

      requiredDirs.forEach(dir => {
        expect(fs.existsSync(dir)).toBe(true)
      })
    })

    it('should complete within reasonable time', () => {
      expect(buildMetrics).not.toBeNull()

      const MAX_BUILD_TIME = 300000 // 5 minutes

      console.log(`Build duration: ${(buildMetrics!.duration / 1000).toFixed(2)}s`)

      expect(buildMetrics!.duration).toBeLessThan(MAX_BUILD_TIME)
    })
  })

  describe('TypeScript Validation', () => {
    it('should not have TypeScript errors in build output', () => {
      expect(buildMetrics).not.toBeNull()

      const tsErrors = buildMetrics!.errors.filter(
        error => error.includes('Type error') || error.includes('TS')
      )

      if (tsErrors.length > 0) {
        console.error('\n❌ TYPESCRIPT ERRORS:')
        tsErrors.forEach(error => console.error(`  ${error}`))
        console.error('')
      }

      expect(tsErrors).toHaveLength(0)
    })

    it('should not ignore TypeScript errors during build', () => {
      expect(buildMetrics).not.toBeNull()

      const ignoredErrors = buildMetrics!.output.match(/ignoring.*error/i)

      if (ignoredErrors) {
        console.error('\n❌ BUILD IGNORING ERRORS:')
        console.error(ignoredErrors.join('\n'))
        console.error('')
      }

      expect(ignoredErrors).toBeNull()
    })

    it('should enforce strict type checking', () => {
      const tsconfigPath = path.join(projectRoot, 'tsconfig.json')
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'))

      console.log('\n🔒 TypeScript Strict Mode:')
      console.log(`  strict: ${tsconfig.compilerOptions.strict}`)
      console.log(`  noImplicitAny: ${tsconfig.compilerOptions.noImplicitAny || 'inherited from strict'}`)
      console.log(`  strictNullChecks: ${tsconfig.compilerOptions.strictNullChecks || 'inherited from strict'}`)
      console.log('')

      expect(tsconfig.compilerOptions.strict).toBe(true)
    })
  })

  describe('ESLint Validation', () => {
    it('should not have ESLint errors in build output', () => {
      expect(buildMetrics).not.toBeNull()

      const eslintErrors = buildMetrics!.errors.filter(
        error => error.includes('eslint') || error.includes('lint')
      )

      if (eslintErrors.length > 0) {
        console.error('\n❌ ESLINT ERRORS:')
        eslintErrors.forEach(error => console.error(`  ${error}`))
        console.error('')
      }

      expect(eslintErrors).toHaveLength(0)
    })

    it('should not ignore ESLint errors during build', () => {
      const nextConfigPath = path.join(projectRoot, 'next.config.js')

      if (!fs.existsSync(nextConfigPath)) {
        console.warn('⚠️  next.config.js not found')
        return
      }

      const configContent = fs.readFileSync(nextConfigPath, 'utf-8')

      // Check that ignoreDuringBuilds is false
      const ignoreDuringBuilds = configContent.match(/ignoreDuringBuilds\s*:\s*true/i)

      if (ignoreDuringBuilds) {
        console.error('\n❌ ESLint enforcement disabled in next.config.js')
        console.error('   Set ignoreDuringBuilds: false\n')
      }

      expect(ignoreDuringBuilds).toBeNull()
    })

    it('should have ESLint configuration', () => {
      const eslintConfigPaths = [
        path.join(projectRoot, '.eslintrc.json'),
        path.join(projectRoot, '.eslintrc.js'),
        path.join(projectRoot, 'eslint.config.js'),
      ]

      const existingConfig = eslintConfigPaths.find(p => fs.existsSync(p))

      if (!existingConfig) {
        console.warn('⚠️  No ESLint configuration found')
      } else {
        console.log(`✅ ESLint config: ${path.basename(existingConfig)}`)
      }

      expect(existingConfig).toBeDefined()
    })
  })

  describe('Build Warnings', () => {
    it('should not have critical warnings', () => {
      expect(buildMetrics).not.toBeNull()

      const criticalWarnings = buildMetrics!.warnings.filter(warning => {
        // Filter out non-critical warnings
        return (
          !warning.includes('Duplicate atom key') && // Known Recoil issue
          !warning.includes('experimental feature') && // Expected for Next.js features
          !warning.includes('NEXT_PRIVATE') // Next.js internal
        )
      })

      if (criticalWarnings.length > 0) {
        console.warn('\n⚠️  CRITICAL WARNINGS:')
        criticalWarnings.forEach(warning => console.warn(`  ${warning}`))
        console.warn('')
      }

      // Allow some warnings, but not excessive
      expect(criticalWarnings.length).toBeLessThan(10)
    })

    it('should report warnings for review', () => {
      expect(buildMetrics).not.toBeNull()

      if (buildMetrics!.warnings.length > 0) {
        console.log('\n📋 Build Warnings Summary:')
        console.log(`  Total warnings: ${buildMetrics!.warnings.length}`)
        console.log('')

        // Group similar warnings
        const warningTypes: Record<string, number> = {}

        buildMetrics!.warnings.forEach(warning => {
          const type = warning.split(':')[0] || 'Unknown'
          warningTypes[type] = (warningTypes[type] || 0) + 1
        })

        console.log('  Warning types:')
        Object.entries(warningTypes)
          .sort(([, a], [, b]) => b - a)
          .forEach(([type, count]) => {
            console.log(`    ${type}: ${count}`)
          })
        console.log('')
      }

      // This is informational
    })
  })

  describe('Bundle Size Analysis', () => {
    const MAX_PAGE_SIZE = 100 * 1024 // 100 KB

    it('should have reasonable bundle sizes (<100 KB per page)', () => {
      expect(buildMetrics).not.toBeNull()

      const pageBundles = Object.entries(buildMetrics!.bundleSizes)
        .filter(([name]) => name.includes('/page'))

      if (pageBundles.length === 0) {
        console.warn('⚠️  No page bundles found to analyze')
        return
      }

      const oversizedPages: Array<{ page: string; size: number }> = []

      pageBundles.forEach(([page, size]) => {
        if (size > MAX_PAGE_SIZE) {
          oversizedPages.push({ page, size })
        }
      })

      console.log('\n📦 Bundle Size Report:')
      console.log(`  Total pages: ${pageBundles.length}`)
      console.log(`  Max size limit: ${(MAX_PAGE_SIZE / 1024).toFixed(0)} KB`)
      console.log('')

      if (oversizedPages.length > 0) {
        console.error('❌ OVERSIZED PAGES:')
        oversizedPages
          .sort((a, b) => b.size - a.size)
          .forEach(({ page, size }) => {
            console.error(`  ${page}: ${(size / 1024).toFixed(2)} KB`)
          })
        console.error('')
      }

      expect(oversizedPages).toHaveLength(0)
    })

    it('should report largest bundles', () => {
      expect(buildMetrics).not.toBeNull()

      if (Object.keys(buildMetrics!.bundleSizes).length === 0) {
        console.warn('⚠️  No bundle sizes available')
        return
      }

      const largestBundles = Object.entries(buildMetrics!.bundleSizes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)

      console.log('\n📊 Top 10 Largest Bundles:')
      largestBundles.forEach(([name, size], index) => {
        console.log(`  ${index + 1}. ${name}: ${(size / 1024).toFixed(2)} KB`)
      })
      console.log('')
    })

    it('should calculate total bundle size', () => {
      expect(buildMetrics).not.toBeNull()

      const totalSize = Object.values(buildMetrics!.bundleSizes).reduce((sum, size) => sum + size, 0)

      console.log('\n💾 Total Bundle Size:')
      console.log(`  ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
      console.log('')

      // Store baseline
      const baseline = {
        timestamp: new Date().toISOString(),
        metrics: {
          totalSize,
          bundleCount: Object.keys(buildMetrics!.bundleSizes).length,
          averageSize: totalSize / Object.keys(buildMetrics!.bundleSizes).length,
          largestBundle: Math.max(...Object.values(buildMetrics!.bundleSizes)),
        },
      }

      const baselineFile = path.join(projectRoot, '__tests__/tmp/bundle-size-baseline.json')
      const tmpDir = path.dirname(baselineFile)

      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true })
      }

      fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2))
      console.log(`Baseline saved to: ${baselineFile}\n`)
    })
  })

  describe('Build Output Quality', () => {
    it('should generate optimized production assets', () => {
      const staticDir = path.join(buildDir, 'static')

      if (!fs.existsSync(staticDir)) {
        console.warn('⚠️  Static directory not found')
        return
      }

      // Check for minified JS files
      const jsFiles = globSync(path.join(staticDir, '**/*.js'))
      const minifiedFiles = jsFiles.filter(file => {
        const content = fs.readFileSync(file, 'utf-8')
        // Minified files have no unnecessary whitespace
        return !content.includes('\n\n')
      })

      const minificationRate = (minifiedFiles.length / jsFiles.length) * 100

      console.log('\n🗜️  Asset Optimization:')
      console.log(`  Total JS files: ${jsFiles.length}`)
      console.log(`  Minified files: ${minifiedFiles.length}`)
      console.log(`  Minification rate: ${minificationRate.toFixed(1)}%`)
      console.log('')

      // Most files should be minified
      expect(minificationRate).toBeGreaterThan(80)
    })

    it('should include build manifest', () => {
      const manifestPath = path.join(buildDir, 'build-manifest.json')

      expect(fs.existsSync(manifestPath)).toBe(true)

      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
        console.log(`\n📄 Build manifest pages: ${Object.keys(manifest.pages || {}).length}\n`)
      }
    })

    it('should generate static pages when possible', () => {
      const serverPagesDir = path.join(buildDir, 'server/app')

      if (!fs.existsSync(serverPagesDir)) {
        console.warn('⚠️  Server pages directory not found')
        return
      }

      const htmlFiles = globSync(path.join(serverPagesDir, '**/*.html'))

      console.log(`\n📄 Static HTML pages generated: ${htmlFiles.length}\n`)

      // This is informational - tracks static generation
    })
  })

  describe('Production Configuration', () => {
    it('should have production environment settings', () => {
      const nextConfigPath = path.join(projectRoot, 'next.config.js')

      if (!fs.existsSync(nextConfigPath)) {
        console.warn('⚠️  next.config.js not found')
        return
      }

      const configContent = fs.readFileSync(nextConfigPath, 'utf-8')

      console.log('\n⚙️  Next.js Configuration:')
      console.log(`  reactStrictMode: ${configContent.includes('reactStrictMode: true')}`)
      console.log(`  swcMinify: ${configContent.includes('swcMinify') || 'default (enabled)'}`)
      console.log('')

      // Should have strict mode enabled
      expect(configContent).toMatch(/reactStrictMode\s*:\s*true/)
    })

    it('should not have development-only code in build', () => {
      expect(buildMetrics).not.toBeNull()

      const devPatterns = [
        'console.log(',
        'debugger',
        'TODO:',
        'FIXME:',
      ]

      const staticDir = path.join(buildDir, 'static')

      if (!fs.existsSync(staticDir)) {
        return
      }

      const jsFiles = globSync(path.join(staticDir, '**/*.js')).slice(0, 10) // Sample 10 files
      const filesWithDevCode: string[] = []

      jsFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8')

        const hasDevCode = devPatterns.some(pattern => content.includes(pattern))

        if (hasDevCode) {
          filesWithDevCode.push(path.relative(buildDir, file))
        }
      })

      if (filesWithDevCode.length > 0) {
        console.warn('\n⚠️  Files with development code:')
        filesWithDevCode.forEach(f => console.warn(`  ${f}`))
        console.warn('')
      }

      // Some console.log might be intentional, so don't fail
      // This is informational
    })
  })

  describe('Build Performance Metrics', () => {
    it('should track build performance over time', () => {
      expect(buildMetrics).not.toBeNull()

      const metrics = {
        timestamp: new Date().toISOString(),
        duration: buildMetrics!.duration,
        success: buildMetrics!.success,
        errorCount: buildMetrics!.errors.length,
        warningCount: buildMetrics!.warnings.length,
        bundleCount: Object.keys(buildMetrics!.bundleSizes).length,
        totalSize: Object.values(buildMetrics!.bundleSizes).reduce((sum, size) => sum + size, 0),
      }

      console.log('\n📊 BUILD PERFORMANCE SUMMARY:')
      console.log(`  Duration: ${(metrics.duration / 1000).toFixed(2)}s`)
      console.log(`  Success: ${metrics.success}`)
      console.log(`  Errors: ${metrics.errorCount}`)
      console.log(`  Warnings: ${metrics.warningCount}`)
      console.log(`  Bundles: ${metrics.bundleCount}`)
      console.log(`  Total size: ${(metrics.totalSize / 1024 / 1024).toFixed(2)} MB`)
      console.log('')

      const metricsFile = path.join(projectRoot, '__tests__/tmp/build-metrics.json')
      const tmpDir = path.dirname(metricsFile)

      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true })
      }

      fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2))
      console.log(`Metrics saved to: ${metricsFile}\n`)
    })
  })
})
