# Technical Debt

This document tracks known technical debt items for future implementation.

## Color Science - Kubelka-Munk Mixing Theory Tests

**Created**: 2025-10-02
**Priority**: Medium
**Effort**: 2-3 days
**Category**: Test Coverage

### Background

During Feature 005 (Codebase Analysis), a test file was created for Kubelka-Munk mixing theory (`src/lib/color-science/__tests__/kubelka-munk-enhanced.test.ts`) but the implementation was never completed. The test file caused CI/CD failures with 80+ TypeScript errors and was removed to restore pipeline functionality.

### What's Missing

Six functions are tested but not implemented:

1. **KubelkaMunkCalculator** - Core class for K-M calculations
2. **calculateMixtureColor** - Predict mixture color from paint ratios
3. **optimizeFormula** - Optimize paint mixing formulas
4. **validatePaintData** - Validate paint optical properties
5. **generateMixingReport** - Generate mixing instructions
6. **performQualityChecks** - Quality assurance for formulas

### Implementation Requirements

- Use Vitest syntax (not Jest)
- Export all functions from `/src/lib/color-science/kubelka-munk.ts`
- Follow strict TypeScript mode (no implicit any)
- Achieve 90%+ test coverage for critical paths
- Integration with existing color-science module

### Test Coverage Goals

- Unit tests: All K-M calculation functions
- Integration tests: End-to-end mixing workflows
- Edge cases: Invalid inputs, boundary conditions
- Performance tests: Large paint datasets

### References

- Removed test file: commit cd7f91b
- GitHub Actions failure: Run #18224505241
- Related: Constitutional Principle II (Color Science Accuracy)
- Related: Kubelka-Munk coefficients in paint database

### Suggested Approach

1. Implement core K-M calculation functions
2. Add optical properties to Paint type
3. Write unit tests following Vitest patterns
4. Validate against real-world paint mixing data
5. Document mathematical formulas and assumptions

### Dependencies

- Paint database with K-M coefficients
- Color science utilities (LAB, Delta E)
- Optimization algorithm framework

---

## Optimization Algorithms - Advanced Paint Mixing

**Created**: 2025-10-03
**Priority**: Medium
**Effort**: 4-5 days
**Category**: Algorithm Implementation & Test Coverage

### Background

Two advanced optimization algorithm test files were created during Feature 005 but the implementations were never completed. Both test files caused CI/CD failures with 100+ TypeScript errors and were removed to restore pipeline functionality.

### What's Missing

Two optimization algorithm implementations with their test suites:

1. **DifferentialEvolutionOptimizer** (`src/lib/optimization/differential-evolution.ts`)
   - Advanced evolutionary algorithm for paint mixing optimization
   - Better accuracy than basic algorithms for complex color matching
   - Handles multi-dimensional optimization with constraints

2. **TPEHybridOptimizer** (`src/lib/optimization/tpe-hybrid.ts`)
   - Tree-structured Parzen Estimator hybrid approach
   - Bayesian optimization for intelligent search space exploration
   - Efficient convergence for high-dimensional paint combinations

### Implementation Requirements

- Use Vitest syntax (not Jest) for all tests
- Follow strict TypeScript mode (no implicit any)
- Proper Paint type structure using ColorValue interface (not raw `lab_l`, `lab_a`, `lab_b` fields)
- Export all classes and functions from implementation files before writing tests
- Integration with existing color-science module (LAB, Delta E)
- 90%+ test coverage for optimization algorithms

### Test Files Removed

- `src/lib/optimization/__tests__/differential-evolution.test.ts` (755 lines)
- `src/lib/optimization/__tests__/tpe-hybrid.test.ts` (643 lines)

### Common Errors Found

1. **Missing imports**: Modules don't exist (`../differential-evolution`, `../tpe-hybrid`)
2. **Wrong test syntax**: Jest matchers instead of Vitest (`toBeGreaterThan` → `greaterThan`, `toBe` → proper Vitest assertions)
3. **Type mismatches**: Using `lab_l`, `lab_a`, `lab_b` directly on Paint instead of ColorValue interface
4. **Implicit any types**: 15+ parameter types not specified

### Algorithm Specifications

#### Differential Evolution
- Population-based metaheuristic optimization
- Mutation, crossover, and selection operators
- Constraint handling for volume limits and paint counts
- Convergence criteria and early stopping
- Performance requirements: <500ms for 8-paint optimization

#### TPE Hybrid
- Gaussian mixture models for search space modeling
- Adaptive exploration/exploitation balance
- Prior knowledge integration from historical mixing data
- Parallel candidate evaluation
- Performance requirements: <1000ms for complex optimizations

### References

- Removed test files: commit [pending]
- GitHub Actions failures: Run #18224960348, #18224969096
- Related: Constitutional Principle II (Color Science Accuracy)
- Related: Optimization module structure in `/src/lib/optimization/`

### Suggested Approach

1. Research and document algorithm mathematics
2. Implement DifferentialEvolutionOptimizer class with proper types
3. Implement TPEHybridOptimizer class with proper types
4. Write Vitest tests following existing patterns
5. Integrate with color-matching workflow
6. Add performance benchmarks
7. Document API and usage examples

### Dependencies

- Color science utilities (LAB, Delta E, color conversions)
- Paint database with ColorValue interface
- Existing optimization framework types
- Performance monitoring utilities
