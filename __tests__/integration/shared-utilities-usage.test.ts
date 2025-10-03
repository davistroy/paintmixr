/**
 * Integration Test: Shared Utilities Usage Contract (T024)
 * Feature: 005-use-codebase-analysis
 * Phase: 3.2 TDD - Code Quality Contracts
 *
 * Requirements: FR-010 (Shared Utilities Adoption)
 *
 * Verifies that shared utilities are being used consistently:
 * - 10+ components use shared API client (apiPost/apiGet)
 * - Forms use shared validation schemas
 * - Components use shared hooks (usePagination/useFilters)
 * - No duplicate API fetch patterns
 *
 * EXPECTED: Tests FAIL (shared utilities not widely adopted yet)
 */

import { describe, it, expect } from '@jest/globals'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { globSync } from 'glob'

describe('Integration: Shared Utilities Usage Contract', () => {
  const projectRoot = process.cwd()
  const srcDir = path.join(projectRoot, 'src')

  /**
   * Search for pattern in files using grep
   */
  function searchPattern(pattern: string, directory: string, fileExtension: string = 'tsx?'): string[] {
    try {
      const output = execSync(`grep -rl "${pattern}" ${directory} --include="*.${fileExtension}"`, {
        cwd: projectRoot,
        encoding: 'utf-8',
      })

      return output
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .map(file => path.relative(projectRoot, file))
    } catch {
      // grep returns exit code 1 if no matches found
      return []
    }
  }

  /**
   * Count occurrences of pattern in file
   */
  function countPattern(filePath: string, pattern: RegExp): number {
    const content = fs.readFileSync(filePath, 'utf-8')
    const matches = content.match(pattern)
    return matches ? matches.length : 0
  }

  describe('Shared API Client Adoption', () => {
    it('should have shared API client utilities', () => {
      const apiClientPath = path.join(srcDir, 'lib/api/client.ts')

      if (!fs.existsSync(apiClientPath)) {
        console.warn('⚠️  Shared API client not found at src/lib/api/client.ts')
        console.warn('   Expected exports: apiGet, apiPost, apiPut, apiDelete\n')
      }

      // Don't fail - just check existence
      // API client may be in different location
    })

    it('should have 10+ components using shared API client', () => {
      const componentsDir = path.join(srcDir, 'components')

      // Search for imports of shared API utilities
      const apiGetUsage = searchPattern('apiGet', componentsDir, 'tsx')
      const apiPostUsage = searchPattern('apiPost', componentsDir, 'tsx')

      // Combine and deduplicate
      const allUsage = new Set([...apiGetUsage, ...apiPostUsage])

      console.log('\n📡 Shared API Client Adoption:')
      console.log(`  Components using apiGet: ${apiGetUsage.length}`)
      console.log(`  Components using apiPost: ${apiPostUsage.length}`)
      console.log(`  Total components: ${allUsage.size}`)
      console.log('')

      if (allUsage.size > 0) {
        console.log('  Files using shared API client:')
        allUsage.forEach(file => console.log(`    ${file}`))
        console.log('')
      }

      // Target: 10+ components
      const TARGET_COMPONENTS = 10

      if (allUsage.size < TARGET_COMPONENTS) {
        console.warn(`⚠️  Only ${allUsage.size}/${TARGET_COMPONENTS} components use shared API client\n`)
      }

      expect(allUsage.size).toBeGreaterThanOrEqual(TARGET_COMPONENTS)
    })

    it('should not have duplicate fetch patterns', () => {
      const componentsDir = path.join(srcDir, 'components')

      // Search for raw fetch() calls (should be replaced with apiClient)
      const rawFetchFiles = searchPattern('fetch\\(', componentsDir, 'tsx')

      console.log('\n🔍 Raw fetch() Calls Detection:')
      console.log(`  Components with raw fetch(): ${rawFetchFiles.length}`)

      if (rawFetchFiles.length > 0) {
        console.log('\n  Files with raw fetch() (should use apiClient):')
        rawFetchFiles.forEach(file => console.log(`    ${file}`))
        console.log('')
      }

      // No components should use raw fetch (all should use shared client)
      expect(rawFetchFiles).toHaveLength(0)
    })

    it('should use consistent error handling in API calls', () => {
      const apiClientPath = path.join(srcDir, 'lib/api/client.ts')

      if (!fs.existsSync(apiClientPath)) {
        console.warn('⏭️  Skipping: API client not found')
        return
      }

      const content = fs.readFileSync(apiClientPath, 'utf-8')

      // Check for error handling patterns
      const hasErrorHandling = content.includes('try') && content.includes('catch')
      const hasResponseValidation = content.includes('response.ok') || content.includes('response.status')

      console.log('\n🛡️  API Client Error Handling:')
      console.log(`  Has try/catch: ${hasErrorHandling}`)
      console.log(`  Validates responses: ${hasResponseValidation}`)
      console.log('')

      expect(hasErrorHandling).toBe(true)
      expect(hasResponseValidation).toBe(true)
    })
  })

  describe('Shared Validation Schemas Adoption', () => {
    it('should have shared validation schemas', () => {
      const schemaPath = path.join(srcDir, 'lib/validation/schemas.ts')

      if (!fs.existsSync(schemaPath)) {
        // Try auth-specific schemas
        const authSchemaPath = path.join(srcDir, 'lib/auth/validation.ts')

        if (fs.existsSync(authSchemaPath)) {
          console.log('✅ Found auth validation schemas at src/lib/auth/validation.ts')
        } else {
          console.warn('⚠️  No shared validation schemas found')
          console.warn('   Expected at: src/lib/validation/schemas.ts\n')
        }
      }

      // This is informational - schemas may be in different locations
    })

    it('should have forms using shared validation schemas', () => {
      const componentsDir = path.join(srcDir, 'components')

      // Search for schema imports
      const schemaImports = searchPattern('Schema', componentsDir, 'tsx')

      // Common schema names
      const signinSchemaUsage = searchPattern('signinSchema\\|emailSigninSchema', componentsDir, 'tsx')
      const zodResolverUsage = searchPattern('zodResolver', componentsDir, 'tsx')

      console.log('\n📋 Shared Validation Schema Adoption:')
      console.log(`  Components importing schemas: ${schemaImports.length}`)
      console.log(`  Components using signin schema: ${signinSchemaUsage.length}`)
      console.log(`  Components using zodResolver: ${zodResolverUsage.length}`)
      console.log('')

      if (zodResolverUsage.length > 0) {
        console.log('  Forms with Zod validation:')
        zodResolverUsage.forEach(file => console.log(`    ${file}`))
        console.log('')
      }

      // At least some forms should use shared schemas
      expect(zodResolverUsage.length).toBeGreaterThan(0)
    })

    it('should not have inline validation logic in forms', () => {
      const componentsDir = path.join(srcDir, 'components')

      // Search for inline validation patterns
      const inlineValidation = searchPattern('z\\.object\\(', componentsDir, 'tsx')

      console.log('\n🔍 Inline Validation Detection:')
      console.log(`  Components with inline z.object(): ${inlineValidation.length}`)

      if (inlineValidation.length > 0) {
        console.log('\n  Files with inline validation (should extract to schemas):')
        inlineValidation.forEach(file => console.log(`    ${file}`))
        console.log('')
      }

      // Forms should import schemas, not define them inline
      expect(inlineValidation).toHaveLength(0)
    })
  })

  describe('Shared Hooks Adoption', () => {
    it('should have custom hooks directory', () => {
      const hooksDir = path.join(srcDir, 'hooks')

      if (!fs.existsSync(hooksDir)) {
        console.warn('⚠️  No hooks directory found at src/hooks/')
        console.warn('   Expected shared hooks: usePagination, useFilters, useDebounce\n')
      }

      // This is informational
    })

    it('should have components using shared hooks', () => {
      const componentsDir = path.join(srcDir, 'components')

      // Search for common shared hooks
      const usePaginationUsage = searchPattern('usePagination', componentsDir, 'tsx')
      const useFiltersUsage = searchPattern('useFilters', componentsDir, 'tsx')
      const useDebounceUsage = searchPattern('useDebounce', componentsDir, 'tsx')

      console.log('\n🪝 Shared Hooks Adoption:')
      console.log(`  Components using usePagination: ${usePaginationUsage.length}`)
      console.log(`  Components using useFilters: ${useFiltersUsage.length}`)
      console.log(`  Components using useDebounce: ${useDebounceUsage.length}`)
      console.log('')

      const totalHookUsage = usePaginationUsage.length + useFiltersUsage.length + useDebounceUsage.length

      if (totalHookUsage > 0) {
        const allFiles = new Set([...usePaginationUsage, ...useFiltersUsage, ...useDebounceUsage])
        console.log('  Components using shared hooks:')
        allFiles.forEach(file => console.log(`    ${file}`))
        console.log('')
      }

      // EXPECTED TO FAIL if hooks not created yet
      expect(totalHookUsage).toBeGreaterThan(0)
    })

    it('should not have duplicate hook implementations', () => {
      const componentsDir = path.join(srcDir, 'components')

      // Search for custom hook definitions in component files
      const customHookDefinitions = searchPattern('function use[A-Z]', componentsDir, 'tsx')

      console.log('\n🔍 Custom Hook Definitions in Components:')
      console.log(`  Components defining custom hooks: ${customHookDefinitions.length}`)

      if (customHookDefinitions.length > 0) {
        console.log('\n  Files with custom hooks (should be in src/hooks/):')
        customHookDefinitions.forEach(file => console.log(`    ${file}`))
        console.log('')
      }

      // Components should import hooks, not define them
      // (Some component-specific hooks are OK)
      if (customHookDefinitions.length > 5) {
        console.warn(`⚠️  Too many custom hooks defined in components`)
        console.warn('   Consider extracting to src/hooks/\n')
      }
    })
  })

  describe('Shared UI Components Adoption', () => {
    it('should have shared UI component library', () => {
      const uiDir = path.join(srcDir, 'components/ui')

      if (!fs.existsSync(uiDir)) {
        console.warn('⚠️  No UI component library found at src/components/ui/')
        return
      }

      const uiComponents = globSync(path.join(uiDir, '*.tsx'))

      console.log('\n🎨 Shared UI Components:')
      console.log(`  Total UI components: ${uiComponents.length}`)

      if (uiComponents.length > 0) {
        console.log('\n  Available components:')
        uiComponents.forEach(file => {
          const name = path.basename(file, '.tsx')
          console.log(`    ${name}`)
        })
        console.log('')
      }

      // Should have UI component library
      expect(uiComponents.length).toBeGreaterThan(0)
    })

    it('should have components using shared UI library', () => {
      const componentsDir = path.join(srcDir, 'components')
      const uiDir = path.join(componentsDir, 'ui')

      if (!fs.existsSync(uiDir)) {
        console.warn('⏭️  Skipping: UI library not found')
        return
      }

      // Get all UI components
      const uiComponents = globSync(path.join(uiDir, '*.tsx'))
      const componentNames = uiComponents.map(f => path.basename(f, '.tsx'))

      // Count imports of each UI component
      const usageByComponent: Record<string, number> = {}

      componentNames.forEach(name => {
        // Search for imports from @/components/ui/{name}
        const usage = searchPattern(`from ['"]@/components/ui/${name}['"]`, componentsDir, 'tsx')
        usageByComponent[name] = usage.length
      })

      console.log('\n📊 UI Component Usage:')
      Object.entries(usageByComponent)
        .sort(([, a], [, b]) => b - a)
        .forEach(([name, count]) => {
          console.log(`  ${name}: ${count} imports`)
        })
      console.log('')

      // Most UI components should be used
      const totalUsage = Object.values(usageByComponent).reduce((sum, count) => sum + count, 0)
      expect(totalUsage).toBeGreaterThan(0)
    })
  })

  describe('Code Reuse Metrics', () => {
    it('should measure shared utility adoption rate', () => {
      const componentsDir = path.join(srcDir, 'components')
      const allComponents = globSync(path.join(componentsDir, '**/*.tsx'))

      // Count components using shared utilities
      let usingApiClient = 0
      let usingSharedHooks = 0
      let usingSharedValidation = 0

      allComponents.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8')

        if (content.includes('apiGet') || content.includes('apiPost')) {
          usingApiClient++
        }

        if (content.includes('usePagination') || content.includes('useFilters') || content.includes('useDebounce')) {
          usingSharedHooks++
        }

        if (content.includes('zodResolver') || content.includes('Schema')) {
          usingSharedValidation++
        }
      })

      const totalComponents = allComponents.length
      const apiAdoptionRate = (usingApiClient / totalComponents) * 100
      const hooksAdoptionRate = (usingSharedHooks / totalComponents) * 100
      const validationAdoptionRate = (usingSharedValidation / totalComponents) * 100

      console.log('\n📈 Shared Utility Adoption Rates:')
      console.log(`  Total components: ${totalComponents}`)
      console.log(`  API client adoption: ${apiAdoptionRate.toFixed(1)}%`)
      console.log(`  Shared hooks adoption: ${hooksAdoptionRate.toFixed(1)}%`)
      console.log(`  Shared validation adoption: ${validationAdoptionRate.toFixed(1)}%`)
      console.log('')

      // Store baseline
      const baseline = {
        timestamp: new Date().toISOString(),
        metrics: {
          totalComponents,
          apiClientAdoption: apiAdoptionRate,
          hooksAdoption: hooksAdoptionRate,
          validationAdoption: validationAdoptionRate,
        },
      }

      const baselineFile = path.join(projectRoot, '__tests__/tmp/shared-utilities-baseline.json')
      const tmpDir = path.dirname(baselineFile)

      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true })
      }

      fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2))
      console.log(`Baseline saved to: ${baselineFile}\n`)
    })

    it('should identify components not using shared utilities', () => {
      const componentsDir = path.join(srcDir, 'components')
      const allComponents = globSync(path.join(componentsDir, '**/*.tsx'))

      const notUsingUtilities: string[] = []

      allComponents.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8')

        // Skip UI library components (they are the utilities)
        if (file.includes('/ui/')) {
          return
        }

        const usesApiClient = content.includes('apiGet') || content.includes('apiPost')
        const usesSharedHooks = content.includes('usePagination') || content.includes('useFilters')
        const usesValidation = content.includes('zodResolver')

        // If component doesn't use any shared utilities, flag it
        if (!usesApiClient && !usesSharedHooks && !usesValidation) {
          notUsingUtilities.push(path.relative(projectRoot, file))
        }
      })

      console.log('\n🔍 Components Not Using Shared Utilities:')
      console.log(`  Total: ${notUsingUtilities.length}`)

      if (notUsingUtilities.length > 0) {
        console.log('\n  Review these for refactoring opportunities:')
        notUsingUtilities.forEach(file => console.log(`    ${file}`))
        console.log('')
      }

      // This is informational - helps identify refactoring targets
    })
  })
})
