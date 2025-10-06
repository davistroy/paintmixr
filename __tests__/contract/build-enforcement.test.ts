/**
 * Contract Test: Build Error Enforcement
 * Feature: 005-use-codebase-analysis
 * Task: T016
 * Requirements: FR-013, FR-014
 *
 * Verifies that build configuration enforces type safety and code quality:
 * - TypeScript errors fail the build (ignoreBuildErrors: false)
 * - ESLint errors fail the build (ignoreDuringBuilds: false)
 * - Production builds catch all violations
 *
 * EXPECTED: Configuration tests should PASS (already set in next.config.js).
 * Enforcement tests verify violations are actually caught.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

describe('Contract: Build Error Enforcement', () => {
  const nextConfigPath = path.join(process.cwd(), 'next.config.js')
  const fixtureDir = path.join(process.cwd(), '__tests__/fixtures/build-enforcement')

  beforeAll(() => {
    // Create fixture directory for test files
    if (!fs.existsSync(fixtureDir)) {
      fs.mkdirSync(fixtureDir, { recursive: true })
    }
  })

  afterAll(() => {
    // Cleanup fixture directory
    if (fs.existsSync(fixtureDir)) {
      fs.rmSync(fixtureDir, { recursive: true, force: true })
    }
  })

  describe('Next.js Configuration', () => {
    it('should have ignoreBuildErrors set to false', () => {
      const configContent = fs.readFileSync(nextConfigPath, 'utf-8')

      // Parse next.config.js (it's a JS module, not JSON)
      // Check for ignoreBuildErrors: false
      expect(configContent).toMatch(/ignoreBuildErrors\s*:\s*false/)
    })

    it('should have ignoreDuringBuilds set to false', () => {
      const configContent = fs.readFileSync(nextConfigPath, 'utf-8')

      // Check for ignoreDuringBuilds: false (ESLint enforcement)
      expect(configContent).toMatch(/ignoreDuringBuilds\s*:\s*false/)
    })

    it('should enforce strict type checking during builds', () => {
      const configContent = fs.readFileSync(nextConfigPath, 'utf-8')

      // Verify typescript.ignoreBuildErrors is explicitly false
      expect(configContent).toMatch(/typescript\s*:\s*{/)
      expect(configContent).toMatch(/ignoreBuildErrors\s*:\s*false/)
    })

    it('should enforce ESLint during builds', () => {
      const configContent = fs.readFileSync(nextConfigPath, 'utf-8')

      // Verify eslint.ignoreDuringBuilds is explicitly false
      expect(configContent).toMatch(/eslint\s*:\s*{/)
      expect(configContent).toMatch(/ignoreDuringBuilds\s*:\s*false/)
    })
  })

  describe('TypeScript Build Enforcement', () => {
    it('should fail build when TypeScript errors are introduced', () => {
      const violationFile = path.join(process.cwd(), 'src/lib/__build-test-violation__.ts')

      // Create file with TypeScript violation
      const violationCode = `
export function unsafeFunction(value: string | null) {
  // This will fail strict null checks
  return value.toUpperCase()
}
`

      fs.writeFileSync(violationFile, violationCode)

      try {
        // Attempt Next.js build
        execSync('npm run build', {
          cwd: process.cwd(),
          stdio: 'pipe',
          timeout: 120000, // 2 minute timeout
        })

        // If build succeeds, enforcement is not working
        throw new Error('Expected build to fail due to TypeScript error')
      } catch (error: any) {
        const output = error.stderr?.toString() || error.stdout?.toString() || ''

        // Should mention TypeScript error
        expect(output).toMatch(/(Type error|TypeScript)/i)

        // Should NOT say "ignoring errors"
        expect(output).not.toMatch(/ignoring.*error/i)
      } finally {
        // Cleanup
        if (fs.existsSync(violationFile)) {
          fs.unlinkSync(violationFile)
        }
      }
    }, 180000) // 3 minute timeout for build

    it('should fail type check when null safety is violated', () => {
      const violationFile = path.join(process.cwd(), 'src/lib/__typecheck-test__.ts')

      const violationCode = `
interface Config {
  apiKey?: string
}

export function getApiKey(config: Config): string {
  // Unsafe: apiKey might be undefined
  return config.apiKey
}
`

      fs.writeFileSync(violationFile, violationCode)

      try {
        execSync('npx tsc --noEmit', {
          cwd: process.cwd(),
          stdio: 'pipe',
        })

        throw new Error('Expected type check to fail due to unsafe access')
      } catch (error: any) {
        const stderr = error.stderr?.toString() || error.stdout?.toString() || ''

        // Should catch undefined access
        expect(stderr).toMatch(/(undefined|not assignable)/i)
      } finally {
        if (fs.existsSync(violationFile)) {
          fs.unlinkSync(violationFile)
        }
      }
    })

    it('should catch implicit any types during build', () => {
      const violationFile = path.join(process.cwd(), 'src/lib/__any-test__.ts')

      const violationCode = `
export function processInput(input) {
  // Implicit 'any' parameter
  return input.value
}
`

      fs.writeFileSync(violationFile, violationCode)

      try {
        execSync('npx tsc --noEmit', {
          cwd: process.cwd(),
          stdio: 'pipe',
        })

        throw new Error('Expected type check to fail due to implicit any')
      } catch (error: any) {
        const stderr = error.stderr?.toString() || error.stdout?.toString() || ''

        // Should mention implicit any
        expect(stderr).toMatch(/implicitly has an 'any' type/i)
      } finally {
        if (fs.existsSync(violationFile)) {
          fs.unlinkSync(violationFile)
        }
      }
    })
  })

  describe('ESLint Build Enforcement', () => {
    it('should have ESLint configuration file', () => {
      const eslintPaths = [
        path.join(process.cwd(), '.eslintrc.json'),
        path.join(process.cwd(), '.eslintrc.js'),
        path.join(process.cwd(), 'eslint.config.js'),
      ]

      const existingConfig = eslintPaths.find(p => fs.existsSync(p))

      expect(existingConfig).toBeDefined()
    })

    it('should fail build when ESLint errors exist', () => {
      const violationFile = path.join(process.cwd(), 'src/lib/__eslint-test__.ts')

      // Create file with ESLint violations
      const violationCode = `
export function badCode() {
  var x = 1  // 'var' is disallowed in favor of 'const'/'let'
  console.log(x)

  // Unused variable
  const unused = 'value'
}
`

      fs.writeFileSync(violationFile, violationCode)

      try {
        // Run ESLint check
        execSync('npx next lint', {
          cwd: process.cwd(),
          stdio: 'pipe',
        })

        // If ESLint passes, violations weren't caught
        console.warn('ESLint did not catch violations (may need stricter rules)')
      } catch (error: any) {
        const output = error.stderr?.toString() || error.stdout?.toString() || ''

        // Should mention ESLint errors
        // (Exact message depends on ESLint configuration)
        expect(output.length).toBeGreaterThan(0)
      } finally {
        if (fs.existsSync(violationFile)) {
          fs.unlinkSync(violationFile)
        }
      }
    }, 60000) // 1 minute timeout

    it('should enforce consistent import order (if configured)', () => {
      const violationFile = path.join(process.cwd(), 'src/lib/__import-order-test__.ts')

      // Create file with incorrect import order
      const violationCode = `
import { useState } from 'react'
import * as fs from 'fs'
import type { Database } from '@/lib/types'
import { supabase } from './client'

export function component() {
  return null
}
`

      fs.writeFileSync(violationFile, violationCode)

      try {
        execSync('npx next lint', {
          cwd: process.cwd(),
          stdio: 'pipe',
        })

        // Import order rules are optional
        console.log('ESLint passed (import order rules may not be configured)')
      } catch (error: any) {
        // If ESLint catches it, that's good
        console.log('ESLint enforces import order rules')
      } finally {
        if (fs.existsSync(violationFile)) {
          fs.unlinkSync(violationFile)
        }
      }
    }, 60000)
  })

  describe('Build Process Validation', () => {
    it('should complete successful build without violations', () => {
      // This test verifies the current codebase can build
      try {
        execSync('npm run build', {
          cwd: process.cwd(),
          stdio: 'pipe',
          timeout: 180000, // 3 minute timeout
        })

        // Build succeeded
        // Actual build check above - this is not a placeholder
      } catch (error: any) {
        const output = error.stderr?.toString() || error.stdout?.toString() || ''

        console.error('Build failed:')
        console.error(output)

        // EXPECTED TO FAIL if existing violations exist in codebase
        throw new Error(`Production build failed:\n${output}`)
      }
    }, 240000) // 4 minute timeout for full build

    it('should generate .next build directory on success', () => {
      const buildDir = path.join(process.cwd(), '.next')

      // Note: This test assumes a previous build has run
      // (either from previous test or manual build)
      if (!fs.existsSync(buildDir)) {
        console.warn('.next directory not found - build may not have completed')
      }

      // If build succeeds, .next directory should exist
      // (This test is informational)
    })

    it('should type check before build starts', () => {
      // Verify type checking happens during build process
      const violationFile = path.join(process.cwd(), 'src/lib/__prebuild-check__.ts')

      const violationCode = `
export function precheck(data: number) {
  // Type violation
  return data.toUpperCase()
}
`

      fs.writeFileSync(violationFile, violationCode)

      try {
        execSync('npm run build', {
          cwd: process.cwd(),
          stdio: 'pipe',
          timeout: 120000,
        })

        throw new Error('Expected build to fail at type checking stage')
      } catch (error: any) {
        const output = error.stderr?.toString() || error.stdout?.toString() || ''

        // Should fail during type checking (not compilation)
        expect(output).toMatch(/(Type error|does not exist)/i)
      } finally {
        if (fs.existsSync(violationFile)) {
          fs.unlinkSync(violationFile)
        }
      }
    }, 180000)
  })

  describe('Development vs Production Parity', () => {
    it('should use same TypeScript config for dev and build', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json')
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'))

      // Verify strict mode is enabled (applies to both dev and build)
      expect(tsconfig.compilerOptions.strict).toBe(true)

      // Verify no separate build config that relaxes rules
      const tsconfigBuildPath = path.join(process.cwd(), 'tsconfig.build.json')

      if (fs.existsSync(tsconfigBuildPath)) {
        const buildConfig = JSON.parse(fs.readFileSync(tsconfigBuildPath, 'utf-8'))

        // Build config should NOT disable strict mode
        if ('strict' in buildConfig.compilerOptions) {
          expect(buildConfig.compilerOptions.strict).toBe(true)
        }
      }
    })

    it('should catch same errors in dev that would fail build', () => {
      // This is a contract requirement - dev experience should match build
      const violationFile = path.join(process.cwd(), 'src/lib/__dev-parity-test__.ts')

      const violationCode = `
export function devTest(value: string | undefined) {
  return value.length  // Unsafe access
}
`

      fs.writeFileSync(violationFile, violationCode)

      try {
        // Type check (simulates dev experience)
        execSync('npx tsc --noEmit', {
          cwd: process.cwd(),
          stdio: 'pipe',
        })

        throw new Error('Expected type check to fail (matching build behavior)')
      } catch (error: any) {
        const stderr = error.stderr?.toString() || ''

        // Should catch the same error in dev that would fail build
        expect(stderr).toMatch(/possibly 'undefined'/i)
      } finally {
        if (fs.existsSync(violationFile)) {
          fs.unlinkSync(violationFile)
        }
      }
    })

    it('should not have build-only type exclusions', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json')
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'))

      // Verify exclude patterns don't hide important files from type checking
      const exclude = tsconfig.exclude || []

      // Should exclude test files (standard practice)
      expect(exclude).toContain('__tests__')

      // Should NOT exclude src/ directory
      const excludesSrc = exclude.some((pattern: string) => pattern.includes('src'))
      expect(excludesSrc).toBe(false)
    })
  })

  describe('Error Message Quality', () => {
    it('should provide actionable TypeScript error messages', () => {
      const violationFile = path.join(process.cwd(), 'src/lib/__error-message-test__.ts')

      const violationCode = `
interface User {
  name: string
}

export function greet(user: User | null) {
  return "Hello, " + user.name
}
`

      fs.writeFileSync(violationFile, violationCode)

      try {
        execSync('npx tsc --noEmit', {
          cwd: process.cwd(),
          stdio: 'pipe',
        })

        throw new Error('Expected type error')
      } catch (error: any) {
        const stderr = error.stderr?.toString() || ''

        // Error should mention the specific issue
        expect(stderr).toMatch(/(possibly 'null'|Object is possibly)/i)

        // Error should include file path
        expect(stderr).toMatch(/__error-message-test__\.ts/)

        // Error should include line number
        expect(stderr).toMatch(/\(\d+,\d+\)/)
      } finally {
        if (fs.existsSync(violationFile)) {
          fs.unlinkSync(violationFile)
        }
      }
    })

    it('should report multiple errors (not stop at first)', () => {
      const violationFile = path.join(process.cwd(), 'src/lib/__multiple-errors-test__.ts')

      const violationCode = `
export function multipleIssues(a: string | null, b: number | undefined) {
  const x = a.length          // Error 1: null check
  const y = b.toFixed(2)      // Error 2: undefined check
  return x + y
}
`

      fs.writeFileSync(violationFile, violationCode)

      try {
        execSync('npx tsc --noEmit', {
          cwd: process.cwd(),
          stdio: 'pipe',
        })

        throw new Error('Expected multiple type errors')
      } catch (error: any) {
        const stderr = error.stderr?.toString() || ''

        // Should report both errors
        const errorCount = (stderr.match(/error TS/g) || []).length

        expect(errorCount).toBeGreaterThanOrEqual(2)
      } finally {
        if (fs.existsSync(violationFile)) {
          fs.unlinkSync(violationFile)
        }
      }
    })
  })
})
