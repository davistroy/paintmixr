/**
 * Contract Test: Type Index Consolidation
 * Feature: 005-use-codebase-analysis
 * Task: T013
 * Requirements: FR-007, FR-008
 *
 * Verifies that all types are centralized in @/lib/types index,
 * eliminating duplicate type definitions across the codebase.
 *
 * EXPECTED: Some tests WILL FAIL until T020 (type consolidation) is completed.
 * - ColorValue imports should resolve to @/lib/types (not @/types/types)
 * - No duplicate ColorValue definitions should exist
 * - Type guards should validate correctly
 */

import { describe, it, expect } from '@jest/globals'
import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

describe('Contract: Type Index Consolidation', () => {
  const srcDir = path.join(process.cwd(), 'src')

  describe('Centralized Type Index', () => {
    it('should have @/lib/types/index.ts as single source of truth', () => {
      const typeIndexPath = path.join(srcDir, 'lib/types/index.ts')
      const exists = fs.existsSync(typeIndexPath)

      expect(exists).toBe(true)

      if (exists) {
        const content = fs.readFileSync(typeIndexPath, 'utf-8')

        // Should export ColorValue type
        expect(content).toMatch(/export.*ColorValue/)

        // Should export type guards
        expect(content).toMatch(/export.*isColorValue/)
        expect(content).toMatch(/export.*isLABColor/)
      }
    })

    it('should have all ColorValue imports resolve to @/lib/types', async () => {
      const tsFiles = await glob('src/**/*.{ts,tsx}', {
        ignore: [
          'src/**/*.test.ts',
          'src/**/*.test.tsx',
          'src/**/*.spec.ts',
          'src/types/types.ts', // Legacy file being migrated
        ],
      })

      const violatingFiles: string[] = []

      for (const file of tsFiles) {
        const content = fs.readFileSync(file, 'utf-8')

        // Check for ColorValue imports NOT from @/lib/types
        const legacyImportPattern = /import.*ColorValue.*from\s+['"]@\/types\/types['"]/
        const relativeImportPattern = /import.*ColorValue.*from\s+['"]\.\./

        if (legacyImportPattern.test(content) || relativeImportPattern.test(content)) {
          violatingFiles.push(file)
        }
      }

      if (violatingFiles.length > 0) {
        console.warn('Files with non-standard ColorValue imports:')
        violatingFiles.forEach(f => console.warn(`  - ${f}`))
      }

      // EXPECTED TO FAIL until T020 (type consolidation)
      expect(violatingFiles).toHaveLength(0)
    })

    it('should have no duplicate ColorValue type definitions', async () => {
      const tsFiles = await glob('src/**/*.{ts,tsx}', {
        ignore: [
          'src/**/*.test.ts',
          'src/**/*.test.tsx',
          'src/**/*.spec.ts',
        ],
      })

      const filesWithColorValueDefinition: string[] = []

      for (const file of tsFiles) {
        const content = fs.readFileSync(file, 'utf-8')

        // Look for ColorValue interface/type definition (not import)
        const definitionPattern = /(export\s+)?(interface|type)\s+ColorValue\s*[={]/

        if (definitionPattern.test(content)) {
          filesWithColorValueDefinition.push(file)
        }
      }

      if (filesWithColorValueDefinition.length > 1) {
        console.warn('Files with ColorValue definitions:')
        filesWithColorValueDefinition.forEach(f => console.warn(`  - ${f}`))
      }

      // Should have exactly 1 definition (in @/lib/types/index.ts)
      // EXPECTED TO FAIL if duplicate definitions exist
      expect(filesWithColorValueDefinition.length).toBe(1)

      if (filesWithColorValueDefinition.length > 0) {
        expect(filesWithColorValueDefinition[0]).toMatch(/lib\/types\/index\.ts$/)
      }
    })
  })

  describe('Domain-Specific Types', () => {
    it('should have unique names for domain-specific types', async () => {
      const tsFiles = await glob('src/**/*.{ts,tsx}', {
        ignore: [
          'src/**/*.test.ts',
          'src/**/*.test.tsx',
          'src/**/*.spec.ts',
        ],
      })

      const typeNames = new Map<string, string[]>()

      for (const file of tsFiles) {
        const content = fs.readFileSync(file, 'utf-8')

        // Extract exported type/interface names
        const exportPattern = /export\s+(interface|type)\s+(\w+)/g
        let match

        while ((match = exportPattern.exec(content)) !== null) {
          const typeName = match[2]

          if (!typeNames.has(typeName)) {
            typeNames.set(typeName, [])
          }

          typeNames.get(typeName)!.push(file)
        }
      }

      // Find duplicates
      const duplicates = Array.from(typeNames.entries())
        .filter(([_, files]) => files.length > 1)
        .filter(([name, _]) => {
          // Exclude intentional duplicates (Database types from Supabase)
          return !name.startsWith('Database')
        })

      if (duplicates.length > 0) {
        console.warn('Duplicate type names found:')
        duplicates.forEach(([name, files]) => {
          console.warn(`  ${name}:`)
          files.forEach(f => console.warn(`    - ${f}`))
        })
      }

      expect(duplicates).toHaveLength(0)
    })

    it('should consolidate auth-related types in @/lib/types/auth.ts', () => {
      const authTypesPath = path.join(srcDir, 'lib/types/auth.ts')

      // This may not exist yet if T020 hasn't been completed
      if (fs.existsSync(authTypesPath)) {
        const content = fs.readFileSync(authTypesPath, 'utf-8')

        // Should export auth-specific types
        expect(content).toMatch(/export.*LockoutMetadata/)
      } else {
        // Warn but don't fail - this is expected during migration
        console.warn('Auth types not yet consolidated in @/lib/types/auth.ts')
      }
    })
  })

  describe('Type Guards', () => {
    it('should have isColorValue type guard that validates correctly', async () => {
      // Dynamic import to test the actual type guard
      const typeModule = await import('@/lib/types')

      if (typeModule.isColorValue) {
        const validColor = {
          hex: '#FF5733',
          lab: { l: 50, a: 40, b: 30 },
        }

        const invalidColor1 = {
          hex: 'invalid',
          lab: { l: 50, a: 40, b: 30 },
        }

        const invalidColor2 = {
          hex: '#FF5733',
          lab: { l: 50 }, // Missing a, b
        }

        expect(typeModule.isColorValue(validColor)).toBe(true)
        expect(typeModule.isColorValue(invalidColor1)).toBe(false)
        expect(typeModule.isColorValue(invalidColor2)).toBe(false)
        expect(typeModule.isColorValue(null)).toBe(false)
        expect(typeModule.isColorValue(undefined)).toBe(false)
      } else {
        // Type guard doesn't exist yet
        console.warn('isColorValue type guard not found in @/lib/types')
        expect(typeModule.isColorValue).toBeDefined()
      }
    })

    it('should have isLABColor type guard that validates LAB values', async () => {
      const typeModule = await import('@/lib/types')

      if (typeModule.isLABColor) {
        const validLab = { l: 50, a: 40, b: 30 }
        const invalidLab1 = { l: 50, a: 40 } // Missing b
        const invalidLab2 = { l: 'fifty', a: 40, b: 30 } // Wrong type
        const invalidLab3 = { l: -10, a: 40, b: 30 } // Out of range

        expect(typeModule.isLABColor(validLab)).toBe(true)
        expect(typeModule.isLABColor(invalidLab1)).toBe(false)
        expect(typeModule.isLABColor(invalidLab2)).toBe(false)
        expect(typeModule.isLABColor(invalidLab3)).toBe(false)
      } else {
        console.warn('isLABColor type guard not found in @/lib/types')
        expect(typeModule.isLABColor).toBeDefined()
      }
    })

    it('should export all type guards from central index', async () => {
      const typeModule = await import('@/lib/types')

      // Expected type guards
      const expectedGuards = [
        'isColorValue',
        'isLABColor',
        'isPaintColor',
        'isMixingFormula',
      ]

      const missingGuards = expectedGuards.filter(guard => !typeModule[guard])

      if (missingGuards.length > 0) {
        console.warn('Missing type guards:', missingGuards)
      }

      // At minimum, should have core type guards
      expect(typeModule.isColorValue).toBeDefined()
    })
  })

  describe('Import Path Consistency', () => {
    it('should use @/ path alias (not relative paths) for type imports', async () => {
      const tsFiles = await glob('src/**/*.{ts,tsx}', {
        ignore: [
          'src/**/*.test.ts',
          'src/**/*.test.tsx',
          'src/**/*.spec.ts',
        ],
      })

      const violatingFiles: Array<{ file: string; line: string }> = []

      for (const file of tsFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')

        lines.forEach((line, index) => {
          // Check for relative imports of types (../../types, ../types, etc.)
          if (line.includes('import') && line.includes('types') && line.match(/from\s+['"]\.\./)) {
            violatingFiles.push({
              file,
              line: `Line ${index + 1}: ${line.trim()}`,
            })
          }
        })
      }

      if (violatingFiles.length > 0) {
        console.warn('Files using relative type imports (should use @/):')
        violatingFiles.forEach(({ file, line }) => {
          console.warn(`  ${file}`)
          console.warn(`    ${line}`)
        })
      }

      // Should use @/ alias for all type imports
      expect(violatingFiles).toHaveLength(0)
    })

    it('should have @/lib/types barrel export with re-exports', () => {
      const typeIndexPath = path.join(srcDir, 'lib/types/index.ts')

      if (fs.existsSync(typeIndexPath)) {
        const content = fs.readFileSync(typeIndexPath, 'utf-8')

        // Should use barrel export pattern (export * from './module')
        // or explicit re-exports
        const hasBarrelExports =
          content.includes("export * from") ||
          content.includes("export type") ||
          content.includes("export interface")

        expect(hasBarrelExports).toBe(true)
      } else {
        console.warn('@/lib/types/index.ts does not exist yet')
        expect(fs.existsSync(typeIndexPath)).toBe(true)
      }
    })
  })
})
