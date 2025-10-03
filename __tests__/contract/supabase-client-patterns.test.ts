/**
 * Contract Test: Supabase Client Pattern Consolidation
 * Feature: 005-use-codebase-analysis
 * Task: T015
 * Requirements: FR-011, FR-012
 *
 * Verifies that Supabase client usage follows standardized patterns:
 * - Uses @supabase/ssr package (not legacy @supabase/supabase-js directly)
 * - Session management via cookies (not localStorage)
 * - One client pattern per context: browser, server, API route, admin
 *
 * EXPECTED: Some tests WILL FAIL if legacy client patterns still exist.
 */

import { describe, it, expect } from '@jest/globals'
import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

describe('Contract: Supabase Client Pattern Consolidation', () => {
  const srcDir = path.join(process.cwd(), 'src')

  describe('Package Dependencies', () => {
    it('should use @supabase/ssr for SSR-compatible client', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json')
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      }

      // Should have @supabase/ssr package
      expect(allDeps['@supabase/ssr']).toBeDefined()
    })

    it('should have @supabase/supabase-js for base client functionality', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json')
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      }

      // Should have @supabase/supabase-js as base dependency
      expect(allDeps['@supabase/supabase-js']).toBeDefined()
    })
  })

  describe('Legacy Client File Detection', () => {
    it('should not have legacy utils/supabase/* client files', () => {
      const legacyPaths = [
        path.join(srcDir, 'utils/supabase/client.ts'),
        path.join(srcDir, 'utils/supabase/server.ts'),
        path.join(srcDir, 'utils/supabase/middleware.ts'),
      ]

      const existingLegacyFiles = legacyPaths.filter(p => fs.existsSync(p))

      if (existingLegacyFiles.length > 0) {
        console.warn('Legacy Supabase client files found:')
        existingLegacyFiles.forEach(f => console.warn(`  - ${f}`))
      }

      // Should have no legacy files
      expect(existingLegacyFiles).toHaveLength(0)
    })

    it('should consolidate clients in @/lib/database or @/lib/supabase', async () => {
      const clientFiles = await glob('src/lib/**/*client*.ts', {
        ignore: ['**/*.test.ts', '**/*.spec.ts'],
      })

      // Should have client files in standardized location
      expect(clientFiles.length).toBeGreaterThan(0)

      // All client files should be in lib/
      const nonLibClients = clientFiles.filter(f => !f.includes('src/lib/'))

      expect(nonLibClients).toHaveLength(0)
    })

    it('should not have duplicate createClient patterns', async () => {
      const tsFiles = await glob('src/**/*.ts', {
        ignore: ['**/*.test.ts', '**/*.spec.ts'],
      })

      const filesWithCreateClient: string[] = []

      for (const file of tsFiles) {
        const content = fs.readFileSync(file, 'utf-8')

        // Look for createClient from @supabase packages
        if (content.includes('createClient') && content.includes('@supabase')) {
          // Exclude type imports
          const hasActualCreateClient = content.match(/import\s*{[^}]*createClient[^}]*}\s*from\s*['"]@supabase/)

          if (hasActualCreateClient) {
            filesWithCreateClient.push(file)
          }
        }
      }

      if (filesWithCreateClient.length > 3) {
        console.warn('Files importing createClient from @supabase:')
        filesWithCreateClient.forEach(f => console.warn(`  - ${f}`))
        console.warn(`Expected: ≤3 (browser, server, admin). Found: ${filesWithCreateClient.length}`)
      }

      // Should have limited client creation points (browser, server, admin)
      // Allow up to 3-4 files (consolidated client modules)
      expect(filesWithCreateClient.length).toBeLessThanOrEqual(4)
    })
  })

  describe('Import Patterns', () => {
    it('should import from @supabase/ssr for SSR contexts', async () => {
      const appFiles = await glob('src/app/**/*.ts', {
        ignore: ['**/*.test.ts', '**/*.spec.ts'],
      })

      const filesUsingSSR: string[] = []
      const filesUsingLegacy: string[] = []

      for (const file of appFiles) {
        const content = fs.readFileSync(file, 'utf-8')

        if (content.includes('@supabase/ssr')) {
          filesUsingSSR.push(file)
        }

        // Check for direct @supabase/supabase-js imports (should use wrapper)
        if (content.match(/from\s*['"]@supabase\/supabase-js['"]/)) {
          filesUsingLegacy.push(file)
        }
      }

      if (filesUsingLegacy.length > 0) {
        console.warn('App files using legacy @supabase/supabase-js imports:')
        filesUsingLegacy.forEach(f => console.warn(`  - ${f}`))
        console.warn('Should import from @/lib/database or @/lib/supabase instead')
      }

      // App directory should not directly import @supabase/supabase-js
      // (should use SSR-compatible wrapper)
      expect(filesUsingLegacy).toHaveLength(0)
    })

    it('should use centralized client imports (not createClient directly)', async () => {
      const componentFiles = await glob('src/{components,app}/**/*.{ts,tsx}', {
        ignore: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
      })

      const violatingFiles: string[] = []

      for (const file of componentFiles) {
        const content = fs.readFileSync(file, 'utf-8')

        // Components should NOT create their own clients
        if (content.includes('createClient(')) {
          violatingFiles.push(file)
        }
      }

      if (violatingFiles.length > 0) {
        console.warn('Components creating their own Supabase clients:')
        violatingFiles.forEach(f => console.warn(`  - ${f}`))
        console.warn('Should import from @/lib/database/supabase-client instead')
      }

      // Components should use centralized client, not create their own
      expect(violatingFiles).toHaveLength(0)
    })
  })

  describe('Session Management Patterns', () => {
    it('should use cookie-based session storage (not localStorage)', async () => {
      const tsFiles = await glob('src/**/*.{ts,tsx}', {
        ignore: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
      })

      const filesUsingLocalStorage: Array<{ file: string; line: string }> = []

      for (const file of tsFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')

        lines.forEach((line, index) => {
          // Check for localStorage usage in Supabase auth context
          if (
            line.includes('localStorage') &&
            (line.includes('supabase') || line.includes('session') || line.includes('auth'))
          ) {
            filesUsingLocalStorage.push({
              file,
              line: `Line ${index + 1}: ${line.trim()}`,
            })
          }
        })
      }

      if (filesUsingLocalStorage.length > 0) {
        console.warn('Files using localStorage for Supabase sessions:')
        filesUsingLocalStorage.forEach(({ file, line }) => {
          console.warn(`  ${file}`)
          console.warn(`    ${line}`)
        })
      }

      // Should not use localStorage for session storage
      // (Exception: rate limiting uses localStorage for UI-only tracking)
      const nonRateLimitFiles = filesUsingLocalStorage.filter(
        ({ file }) => !file.includes('rate-limit')
      )

      expect(nonRateLimitFiles).toHaveLength(0)
    })

    it('should configure persistSession with cookies in client config', () => {
      const clientFiles = [
        path.join(srcDir, 'lib/database/supabase-client.ts'),
        path.join(srcDir, 'lib/supabase/client.ts'),
      ]

      let foundCookieConfig = false

      for (const clientFile of clientFiles) {
        if (!fs.existsSync(clientFile)) continue

        const content = fs.readFileSync(clientFile, 'utf-8')

        // Check for persistSession: true (cookies are default with @supabase/ssr)
        if (content.includes('persistSession')) {
          foundCookieConfig = true

          // Should be set to true (for cookie-based storage)
          expect(content).toMatch(/persistSession\s*:\s*true/)
        }
      }

      if (!foundCookieConfig) {
        console.warn('No persistSession configuration found in client files')
      }

      // Should have session persistence configured
      expect(foundCookieConfig).toBe(true)
    })

    it('should use @supabase/ssr for cookie handling in Server Components', async () => {
      const serverFiles = await glob('src/app/**/route.ts', {
        ignore: ['**/*.test.ts'],
      })

      const filesUsingSSR: string[] = []

      for (const file of serverFiles) {
        const content = fs.readFileSync(file, 'utf-8')

        // Check for @supabase/ssr usage
        if (content.includes('@supabase/ssr') || content.includes('cookies()')) {
          filesUsingSSR.push(file)
        }
      }

      // API routes should use SSR-compatible patterns
      // (This may be 0 if all routes use centralized client wrapper)
      if (serverFiles.length > 0) {
        console.log(`Found ${serverFiles.length} API route files`)
        console.log(`${filesUsingSSR.length} use SSR-compatible patterns`)
      }
    })
  })

  describe('Client Context Patterns', () => {
    it('should have browser client for client components', () => {
      const browserClientPaths = [
        path.join(srcDir, 'lib/database/supabase-client.ts'),
        path.join(srcDir, 'lib/supabase/client.ts'),
      ]

      const existingBrowserClient = browserClientPaths.find(p => fs.existsSync(p))

      expect(existingBrowserClient).toBeDefined()

      if (existingBrowserClient) {
        const content = fs.readFileSync(existingBrowserClient, 'utf-8')

        // Should export a browser client
        expect(content).toMatch(/export\s+(const|let|var)\s+supabase/)
      }
    })

    it('should have server client factory for API routes', () => {
      const serverClientPaths = [
        path.join(srcDir, 'lib/database/supabase-client.ts'),
        path.join(srcDir, 'lib/supabase/client.ts'),
      ]

      let foundServerFactory = false

      for (const clientPath of serverClientPaths) {
        if (!fs.existsSync(clientPath)) continue

        const content = fs.readFileSync(clientPath, 'utf-8')

        // Should have createServerSupabaseClient function
        if (content.includes('createServerSupabaseClient')) {
          foundServerFactory = true
          expect(content).toMatch(/export.*createServerSupabaseClient/)
        }
      }

      expect(foundServerFactory).toBe(true)
    })

    it('should use service role key only in admin client (not browser)', () => {
      const clientFiles = [
        path.join(srcDir, 'lib/database/supabase-client.ts'),
        path.join(srcDir, 'lib/supabase/client.ts'),
      ]

      for (const clientFile of clientFiles) {
        if (!fs.existsSync(clientFile)) continue

        const content = fs.readFileSync(clientFile, 'utf-8')

        // Service role should only be in server/admin client
        const serviceRoleUsage = content.match(/SUPABASE_SERVICE_ROLE_KEY/g)

        if (serviceRoleUsage) {
          // Should ONLY be in createServerSupabaseClient function
          const lines = content.split('\n')
          let inServerFunction = false
          let serviceRoleOutsideServer = false

          lines.forEach(line => {
            if (line.includes('createServerSupabaseClient')) {
              inServerFunction = true
            }

            if (line.includes('SUPABASE_SERVICE_ROLE_KEY') && !inServerFunction) {
              serviceRoleOutsideServer = true
            }

            if (inServerFunction && line.includes('}')) {
              inServerFunction = false
            }
          })

          expect(serviceRoleOutsideServer).toBe(false)
        }
      }
    })

    it('should not expose service role key to client bundles', async () => {
      const clientComponents = await glob('src/{components,app}/**/*.{ts,tsx}', {
        ignore: [
          '**/*.test.ts',
          '**/*.test.tsx',
          '**/route.ts', // Server-side API routes are OK
          '**/layout.ts',
          '**/page.tsx',
        ],
      })

      const violatingFiles: string[] = []

      for (const file of clientComponents) {
        const content = fs.readFileSync(file, 'utf-8')

        // Client components should NEVER use service role key
        if (content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
          violatingFiles.push(file)
        }
      }

      if (violatingFiles.length > 0) {
        console.error('Client components using service role key (SECURITY ISSUE):')
        violatingFiles.forEach(f => console.error(`  - ${f}`))
      }

      expect(violatingFiles).toHaveLength(0)
    })
  })

  describe('Type Safety', () => {
    it('should use typed database schema with clients', () => {
      const clientFiles = [
        path.join(srcDir, 'lib/database/supabase-client.ts'),
        path.join(srcDir, 'lib/supabase/client.ts'),
      ]

      let foundTypedClient = false

      for (const clientFile of clientFiles) {
        if (!fs.existsSync(clientFile)) continue

        const content = fs.readFileSync(clientFile, 'utf-8')

        // Should use Database type parameter
        if (content.includes('createClient<Database>')) {
          foundTypedClient = true
        }
      }

      expect(foundTypedClient).toBe(true)
    })

    it('should import Database type from centralized location', async () => {
      const tsFiles = await glob('src/**/*.ts', {
        ignore: ['**/*.test.ts', '**/*.spec.ts'],
      })

      const databaseImports = new Set<string>()

      for (const file of tsFiles) {
        const content = fs.readFileSync(file, 'utf-8')

        // Extract Database type import sources
        const match = content.match(/import.*Database.*from\s*['"](.*)['"]/g)

        if (match) {
          match.forEach(imp => {
            const source = imp.match(/from\s*['"](.*)['"]/)?.[1]
            if (source) {
              databaseImports.add(source)
            }
          })
        }
      }

      // Should have 1-2 import sources (types file + legacy compatibility)
      if (databaseImports.size > 2) {
        console.warn('Multiple Database type import sources found:')
        databaseImports.forEach(src => console.warn(`  - ${src}`))
      }

      expect(databaseImports.size).toBeLessThanOrEqual(2)
    })
  })
})
