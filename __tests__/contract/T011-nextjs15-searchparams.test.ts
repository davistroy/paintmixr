/**
 * Contract Test: Next.js 15 Async SearchParams Pattern
 * Feature: 005-use-codebase-analysis
 * Task: T011
 * Requirements: FR-015, FR-016
 *
 * Verifies compliance with Next.js 15 async searchParams API:
 * - searchParams must be typed as Promise<{...}>
 * - searchParams must be awaited before accessing values
 * - Pages must be async functions when using searchParams
 * - Build must complete without Next.js 15 compatibility errors
 *
 * EXPECTED: Tests should FAIL - pages still use synchronous searchParams pattern
 * from Next.js 14. Migration to async pattern required.
 *
 * References:
 * - https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional
 * - https://nextjs.org/docs/app/building-your-application/upgrading/version-15#async-request-apis-breaking-change
 */

import { describe, it, expect } from '@jest/globals'
import * as fs from 'fs'
import * as path from 'path'

describe('Contract: Next.js 15 Async SearchParams Pattern', () => {
  const signinPagePath = path.join(process.cwd(), 'src/app/auth/signin/page.tsx')
  const errorPagePath = path.join(process.cwd(), 'src/app/auth/error/page.tsx')

  describe('SearchParams Type Signature', () => {
    it('should type searchParams as Promise in signin page', () => {
      const content = fs.readFileSync(signinPagePath, 'utf-8')

      // Check for Promise<{...}> type signature
      // Expected pattern: searchParams: Promise<{ redirect?: string; error?: string }>
      const hasPromiseType = /searchParams[^:]*:\s*Promise<\s*{/.test(content)

      expect(hasPromiseType).toBe(true)

      // Should NOT have synchronous type (Next.js 14 pattern)
      const hasSyncType = /searchParams[^:]*:\s*{\s*redirect\?/.test(content) &&
                         !/Promise/.test(content.match(/searchParams[^}]+}/)?.[0] || '')

      expect(hasSyncType).toBe(false)
    })

    it('should type searchParams as Promise in error page', () => {
      const content = fs.readFileSync(errorPagePath, 'utf-8')

      // Check for Promise type
      const hasPromiseType = /searchParams[^:]*:\s*Promise<\s*{/.test(content)

      expect(hasPromiseType).toBe(true)
    })

    it('should use correct TypeScript type for Promise searchParams', () => {
      const content = fs.readFileSync(signinPagePath, 'utf-8')

      // Expected: Promise<{ [key: string]: string | string[] | undefined }>
      // or specific keys like Promise<{ redirect?: string; error?: string }>
      const validPatterns = [
        /Promise<\s*{\s*\[key:\s*string\]:\s*string\s*\|\s*string\[\]\s*\|\s*undefined\s*}>/,
        /Promise<\s*{\s*redirect\?:\s*string;\s*error\?:\s*string\s*}>/,
        /Promise<\s*{\s*redirect\?:\s*string/
      ]

      const hasValidType = validPatterns.some(pattern => pattern.test(content))

      expect(hasValidType).toBe(true)
    })
  })

  describe('Async Function Pattern', () => {
    it('should define signin page as async function', () => {
      const content = fs.readFileSync(signinPagePath, 'utf-8')

      // Check for: export default async function
      const isAsync = /export\s+default\s+async\s+function/.test(content)

      expect(isAsync).toBe(true)
    })

    it('should define error page as async function', () => {
      const content = fs.readFileSync(errorPagePath, 'utf-8')

      // Check for async function
      const isAsync = /export\s+default\s+async\s+function/.test(content)

      expect(isAsync).toBe(true)
    })

    it('should NOT use sync function with searchParams', () => {
      const signinContent = fs.readFileSync(signinPagePath, 'utf-8')
      const errorContent = fs.readFileSync(errorPagePath, 'utf-8')

      // Pattern: export default function (without async) with searchParams
      const signinHasSyncWithParams =
        /export\s+default\s+function\s+\w+\s*\([^)]*searchParams/.test(signinContent) &&
        !/async/.test(signinContent.match(/export\s+default\s+function[^{]+/)?.[0] || '')

      const errorHasSyncWithParams =
        /export\s+default\s+function\s+\w+\s*\([^)]*searchParams/.test(errorContent) &&
        !/async/.test(errorContent.match(/export\s+default\s+function[^{]+/)?.[0] || '')

      expect(signinHasSyncWithParams).toBe(false)
      expect(errorHasSyncWithParams).toBe(false)
    })
  })

  describe('SearchParams Access Pattern', () => {
    it('should await searchParams before accessing properties in signin page', () => {
      const content = fs.readFileSync(signinPagePath, 'utf-8')

      // Check for await pattern: await searchParams
      const hasAwait = /await\s+searchParams/.test(content)

      // Alternative: destructuring with await
      const hasAwaitDestructure = /await\s+props\.searchParams/.test(content) ||
                                  /const\s+\{[^}]+\}\s*=\s*await\s+searchParams/.test(content)

      expect(hasAwait || hasAwaitDestructure).toBe(true)
    })

    it('should await searchParams before accessing properties in error page', () => {
      const content = fs.readFileSync(errorPagePath, 'utf-8')

      const hasAwait = /await\s+searchParams/.test(content) ||
                      /await\s+props\.searchParams/.test(content)

      expect(hasAwait).toBe(true)
    })

    it('should NOT access searchParams properties without await', () => {
      const signinContent = fs.readFileSync(signinPagePath, 'utf-8')

      // Pattern to detect: searchParams.redirect without await
      // This is tricky because we need to check if there's an await before the access

      // First, check if searchParams is accessed
      const searchParamsAccess = signinContent.match(/searchParams\.(redirect|error)/g)

      if (searchParamsAccess) {
        // For each access, verify there's an await before it
        searchParamsAccess.forEach(access => {
          const accessIndex = signinContent.indexOf(access)
          const contextBefore = signinContent.substring(Math.max(0, accessIndex - 50), accessIndex)

          // Should have 'await' in the context before access
          // or should be accessing result of await: (await searchParams).redirect
          const hasAwaitContext =
            /await\s+searchParams/.test(contextBefore) ||
            /\(await\s+searchParams\)/.test(signinContent.substring(accessIndex - 30, accessIndex + 20))

          // This assertion will fail if sync access is detected
          expect(hasAwaitContext).toBe(true)
        })
      }
    })

    it('should use correct destructuring pattern with await', () => {
      const signinContent = fs.readFileSync(signinPagePath, 'utf-8')

      // Expected patterns:
      // const { redirect, error } = await searchParams
      // const searchParams = await props.searchParams
      // const params = await searchParams
      const validPatterns = [
        /const\s+{\s*\w+[^}]*}\s*=\s*await\s+searchParams/,
        /const\s+searchParams\s*=\s*await\s+props\.searchParams/,
        /const\s+params\s*=\s*await\s+searchParams/, // Allow renaming
        /\(await\s+searchParams\)\.\w+/
      ]

      const hasValidPattern = validPatterns.some(pattern => pattern.test(signinContent))

      // Should have at least one valid async access pattern
      expect(hasValidPattern).toBe(true)
    })
  })

  describe('Query Parameter Handling', () => {
    it('should handle redirect query parameter async in signin page', () => {
      const content = fs.readFileSync(signinPagePath, 'utf-8')

      // Check that redirect param is accessed after await
      const hasRedirectAccess = /redirect/.test(content)

      if (hasRedirectAccess) {
        // Should be accessed via awaited searchParams
        const validAccess =
          /const\s+\{[^}]*redirect[^}]*\}\s*=\s*await\s+searchParams/.test(content) ||
          /const\s+params\s*=\s*await\s+searchParams/.test(content) || // Allow const params = await searchParams
          /\(await\s+searchParams\)\.redirect/.test(content) ||
          /searchParams\.redirect/.test(content) && /await\s+searchParams/.test(content)

        expect(validAccess).toBe(true)
      }
    })

    it('should handle error query parameter async in signin page', () => {
      const content = fs.readFileSync(signinPagePath, 'utf-8')

      // Check error param access
      const hasErrorAccess = /searchParams[^}]+error/.test(content)

      if (hasErrorAccess) {
        const validAccess =
          /const\s+\{[^}]*error[^}]*\}\s*=\s*await\s+searchParams/.test(content) ||
          /\(await\s+searchParams\)\.error/.test(content) ||
          /await\s+searchParams/.test(content)

        expect(validAccess).toBe(true)
      }
    })

    it('should handle multiple query parameters in error page', () => {
      const content = fs.readFileSync(errorPagePath, 'utf-8')

      // Error page uses: error, error_description, provider
      const hasMultipleParams = /error/.test(content) &&
                                /error_description/.test(content) &&
                                /provider/.test(content)

      if (hasMultipleParams) {
        // All should be accessed via async pattern
        const validAccess = /await\s+searchParams/.test(content)
        expect(validAccess).toBe(true)
      }
    })
  })

  describe('Props Pattern (Next.js 15 Recommended)', () => {
    it('should accept searchParams via props parameter', () => {
      const signinContent = fs.readFileSync(signinPagePath, 'utf-8')

      // Check if using props pattern:
      // function Page(props: { searchParams: Promise<{...}> })
      const hasPropsPattern = /function\s+\w+\s*\(\s*props\s*:/.test(signinContent) ||
                             /function\s+\w+\s*\(\s*{\s*searchParams\s*}/.test(signinContent)

      // Either props pattern or direct destructure is acceptable
      expect(hasPropsPattern).toBe(true)
    })

    it('should type props correctly when using props pattern', () => {
      const signinContent = fs.readFileSync(signinPagePath, 'utf-8')

      // If using props, check type annotation
      if (/function\s+\w+\s*\(\s*props\s*:/.test(signinContent)) {
        const hasCorrectType = /props\s*:\s*{[^}]*searchParams[^}]*Promise/.test(signinContent)
        expect(hasCorrectType).toBe(true)
      } else if (/{\s*searchParams\s*}/.test(signinContent)) {
        // Destructured props - check type
        const hasCorrectType = /searchParams[^}]*}[^:]*:\s*{[^}]*searchParams[^}]*Promise/.test(signinContent)
        expect(hasCorrectType).toBe(true)
      }
    })
  })

  describe('Build Compatibility', () => {
    it('should not trigger Next.js 15 searchParams deprecation warning', () => {
      // This test checks that we're not using the deprecated sync pattern
      const signinContent = fs.readFileSync(signinPagePath, 'utf-8')
      const errorContent = fs.readFileSync(errorPagePath, 'utf-8')

      // The sync pattern that triggers warning:
      // function Page({ searchParams }: { searchParams: { ... } }) without Promise
      const signinHasDeprecatedPattern =
        /searchParams\s*:\s*{\s*\w+\?:\s*string/.test(signinContent) &&
        !/Promise/.test(signinContent.match(/searchParams[^}]+}/)?.[0] || '')

      const errorHasDeprecatedPattern =
        /searchParams\s*:\s*{\s*\w+\?:\s*string/.test(errorContent) &&
        !/Promise/.test(errorContent.match(/searchParams[^}]+}/)?.[0] || '')

      expect(signinHasDeprecatedPattern).toBe(false)
      expect(errorHasDeprecatedPattern).toBe(false)
    })

    it('should follow Next.js 15 migration guide patterns', () => {
      const signinContent = fs.readFileSync(signinPagePath, 'utf-8')

      // Check for patterns from Next.js 15 upgrade guide:
      // 1. async function
      // 2. Promise<{...}> type
      // 3. await searchParams

      const hasAsyncFunction = /async\s+function/.test(signinContent)
      const hasPromiseType = /Promise</.test(signinContent)
      const hasAwait = /await\s+searchParams/.test(signinContent) ||
                      /await\s+props\.searchParams/.test(signinContent)

      const followsMigrationGuide = hasAsyncFunction && hasPromiseType && hasAwait

      expect(followsMigrationGuide).toBe(true)
    })

    it('should compile without TypeScript errors with async searchParams', () => {
      // This is validated by the overall build, but we check syntax here
      const signinContent = fs.readFileSync(signinPagePath, 'utf-8')

      // Check for common TypeScript errors with async searchParams:
      // - Forgetting await
      // - Wrong type annotation
      // - Missing async keyword

      // If searchParams is typed as Promise, function must be async
      const hasPromiseType = /searchParams[^:]*:\s*Promise/.test(signinContent)
      const isAsync = /async\s+function/.test(signinContent)

      if (hasPromiseType) {
        expect(isAsync).toBe(true)
      }

      // If accessing .redirect or .error, should have await somewhere
      const accessesProps = /searchParams\.(redirect|error)/.test(signinContent)
      const hasAwait = /await\s+searchParams/.test(signinContent)

      if (accessesProps) {
        expect(hasAwait).toBe(true)
      }
    })
  })

  describe('Conditional Query Parameter Access', () => {
    it('should handle optional searchParams properties correctly', () => {
      const signinContent = fs.readFileSync(signinPagePath, 'utf-8')

      // Check for conditional access: if (searchParams.error)
      // After await, this is safe
      const hasConditional = /if\s*\([^)]*error/.test(signinContent)

      if (hasConditional) {
        // Should have awaited searchParams before conditional
        const hasAwaitBeforeConditional = /await\s+searchParams/.test(signinContent)
        expect(hasAwaitBeforeConditional).toBe(true)
      }
    })

    it('should use optional chaining or default values appropriately', () => {
      const signinContent = fs.readFileSync(signinPagePath, 'utf-8')

      // Check for safe access patterns:
      // - searchParams?.redirect
      // - searchParams.redirect || '/'
      // - redirect ?? '/'

      const hasSafeAccess =
        /redirect\s*\?\?/.test(signinContent) ||
        /redirect\s*\|\|/.test(signinContent) ||
        /redirect\?:/.test(signinContent) // optional in type

      expect(hasSafeAccess).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing searchParams gracefully', () => {
      const signinContent = fs.readFileSync(signinPagePath, 'utf-8')

      // searchParams should be optional in function signature
      const hasOptionalParam =
        /searchParams\?:/.test(signinContent) ||
        /searchParams[^:]*:\s*Promise<\{[^}]*\?\s*:/.test(signinContent)

      // Note: searchParams is always provided by Next.js, but good practice
      // For this test, we just verify it's handled as optional in types
      if (hasOptionalParam) {
        // Pattern found - optional parameter is being used
      } else {
        // Not required to be optional, but should handle undefined values
        const hasNullishCoalescing = /\?\?/.test(signinContent)
        expect(hasNullishCoalescing).toBe(true)
      }
    })

    it('should handle array-type query parameters', () => {
      // searchParams can have string | string[] | undefined values
      const signinContent = fs.readFileSync(signinPagePath, 'utf-8')

      // Check type includes string[]
      const hasArrayType =
        /string\s*\|\s*string\[\]/.test(signinContent) ||
        /string\[\]\s*\|\s*string/.test(signinContent)

      // For this app, we only use string params, so this is optional
      // But documenting the Next.js 15 pattern here
      if (hasArrayType) {
        // Pattern found - array type is being handled
      }
    })
  })
})
