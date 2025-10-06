# Implementation Plan: Technical Debt Remediation & Code Quality Improvements

**Branch**: `010-using-refactor-recommendations` | **Date**: 2025-10-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/davistroy/dev/paintmixr/specs/010-using-refactor-recommendations/spec.md`
**User Context**: and when it is fully complete, /tasks and when that is fully complete, /analyze

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
2. Fill Technical Context (scan for NEEDS CLARIFICATION) ✓
3. Fill Constitution Check section ✓
4. Evaluate Constitution Check section
5. Execute Phase 0 → research.md
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
7. Re-evaluate Constitution Check section
8. Plan Phase 2 → Describe task generation approach
9. STOP - Ready for /tasks command
```

## Summary
This feature systematically addresses technical debt, security vulnerabilities, and code quality issues identified in REFACTOR-RECOMMENDATIONS.md audit. The implementation consolidates duplicate type definitions, updates outdated dependencies (React 19, Next.js 15, Zod 4, Cypress 15), refactors oversized components to meet 300-line standard, implements performance optimizations (API caching, connection pooling, query monitoring), enhances security (rate limiting, input sanitization, Supabase client patterns), and establishes observability through structured logging and API contract testing. This refactoring maintains the existing color accuracy architecture while improving maintainability, performance, and developer experience for the single-user personal app.

## Technical Context
**Language/Version**: TypeScript 5.9 (strict mode), Next.js 14.2 → 15.5, React 18.3 → 19.2
**Primary Dependencies**: Next.js 15, Supabase (@supabase/ssr), Radix UI, Tailwind CSS, Zod 3.25 → 4.1, Cypress 13.17 → 15.3, Jest, Testing Library
**Storage**: Supabase (PostgreSQL) with Row Level Security, file-based type definitions
**Testing**: Jest (unit/integration), Cypress (E2E), Testing Library (components), performance regression baselines
**Target Platform**: Vercel (Next.js serverless), modern browsers (PWA-capable), single-user deployment
**Project Type**: web (Next.js App Router, full-stack)
**Performance Goals**: API response <200ms (p95), DB queries <100ms (p95), cache hit rate >70%, color calculations <500ms (existing)
**Constraints**: Single-user app (skip CSRF), personal budget (defer error tracking), fix breaking changes inline during migration
**Scale/Scope**: 282 TypeScript files, 85k LOC, 257 test files, 22 outdated dependencies, 6 categories of improvements

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I - Color Accuracy First**: PASS - No changes to color calculation architecture (LAB color space, Delta E ≤4.0, Kubelka-Munk coefficients preserved)
**Principle II - Documentation Currency**: PASS - Context7 MCP will be used for dependency migration guides (React 19, Next.js 15, Zod 4, Cypress 15)
**Principle III - Test-First Development**: PASS - TDD approach for refactored components, API contract tests written before DTO layer, performance baselines before regression testing
**Principle IV - Type Safety & Validation**: PASS - TypeScript strict mode enforcement (FR-003: replace 53 any/unknown), Zod validation enhanced (FR-008: XSS sanitization), centralized types (FR-001/002)
**Principle V - Performance & Accessibility**: PASS - Performance optimizations (FR-016-020: caching, monitoring, connection pooling), existing WCAG 2.1 AA compliance maintained
**Principle VI - Real-World Testing**: PASS - Existing Cypress E2E tests maintained, API contract tests added (FR-025), test coverage increased to >80% global/>90% critical (FR-024)

**Production Standards Compliance**: PASS - PWA compliance maintained, Supabase RLS security enhanced (FR-009: client patterns), session management unchanged, offline functionality preserved

*No constitutional violations - all refactoring preserves existing color accuracy, testing, and production standards*

## Project Structure

### Documentation (this feature)
```
specs/010-using-refactor-recommendations/
├── spec.md              # Feature specification
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Next.js App Router web application
src/
├── app/                 # Next.js App Router (pages + API routes)
│   ├── api/             # API routes (will add DTO layer, version headers, rate limiting)
│   └── */page.tsx       # Pages (will refactor oversized components)
├── components/          # React components (will refactor to <300 lines)
├── contexts/            # React Context providers (unchanged)
├── lib/                 # Core business logic
│   ├── types/           # Centralized type definitions (will consolidate from /src/types/)
│   ├── auth/            # Authentication utilities (will fix client patterns)
│   ├── color-science/   # Color algorithms (unchanged - constitutional)
│   ├── database/        # Supabase repositories (will refactor oversized files)
│   ├── mixing-optimization/ # Optimization algorithms (will refactor DE algorithm)
│   ├── supabase/        # Supabase client factories (will audit client usage)
│   ├── logging/         # Structured logger (new - FR-021)
│   ├── api/             # API DTOs (new - FR-026)
│   └── cache/           # Caching utilities (new - FR-016/019)
├── types/               # Legacy types (will delete - FR-002)
└── workers/             # Web Workers (will delete - FR-013)

__tests__/               # Test files
├── unit/                # Unit tests (will increase coverage to >80%)
├── integration/         # Integration tests
├── e2e/                 # Cypress E2E tests (will add API contract tests)
├── performance/         # Performance baselines (will add regression tests)
└── tmp/                 # Performance baselines JSON files

.specify/                # Specify workflow
└── scripts/bash/        # Development scripts
```

**Structure Decision**: Next.js App Router web application (Option 2 equivalent). Centralized types in `/src/lib/types/`, delete legacy `/src/types/` and `/src/workers/`. Refactor oversized files in `/src/app/page.tsx` (684→250 lines), `/src/lib/database/repositories/enhanced-paint-repository.ts` (1234→600 lines), `/src/lib/mixing-optimization/differential-evolution.ts` (1009→500 lines). Add new utilities in `/src/lib/logging/`, `/src/lib/api/`, `/src/lib/cache/` for observability and performance improvements.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context**:
   - React 19 migration guide → breaking changes, new features, SSR changes
   - Next.js 15 migration guide → App Router updates, Turbopack, metadata changes
   - Zod 4 migration guide → schema API changes, new validators
   - Cypress 15 migration guide → E2E test updates
   - ESLint 9 migration guide → flat config format
   - SWR library best practices → stale-while-revalidate pattern
   - Supabase connection pooling → configuration, environment setup
   - API DTO pattern → decoupling frontend from database types
   - Structured logging pattern → severity levels, context injection

2. **Generate and dispatch research agents**:
   - Task: "Research React 19 migration breaking changes for Next.js app"
   - Task: "Research Next.js 15 App Router updates and Turbopack stable features"
   - Task: "Research Zod 4 schema API changes and migration path from 3.25"
   - Task: "Research Cypress 15 breaking changes and E2E test updates"
   - Task: "Research ESLint 9 flat config migration from .eslintrc.json"
   - Task: "Research SWR library best practices for API response caching"
   - Task: "Research Supabase connection pooling configuration for production"
   - Task: "Research API DTO pattern for decoupling database types from frontend"
   - Task: "Research structured logging best practices for Next.js serverless"

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all dependency migration strategies resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Type Definition (centralized TypeScript types in @/lib/types)
   - API DTO (Data Transfer Objects for frontend/backend decoupling)
   - Performance Baseline (p95/p99 metrics JSON)
   - Structured Log Entry (severity, message, context, timestamp)
   - Security Policy (rate limit rules, XSS sanitization rules)
   - Dependency Update Migration (step-by-step guide)

2. **Generate API contracts** from functional requirements:
   - No new API endpoints (refactoring existing)
   - Update existing contracts for DTO layer (FR-026)
   - Add version headers to responses (FR-028)
   - Document rate limiting rules (FR-007: 5 req/min on /api/optimize)
   - Output TypeScript types to `/contracts/`

3. **Generate contract tests** from contracts:
   - Validate existing API responses match DTO schemas
   - Validate version headers present (X-API-Version)
   - Validate rate limiting behavior (429 after 5 requests)
   - Tests must fail (no DTO implementation yet)

4. **Extract test scenarios** from user stories:
   - Type consolidation test: Import from @/lib/types, zero TS errors
   - Security test: Rate limit triggers, input sanitization blocks XSS
   - Dependency test: All tests pass on React 19/Next.js 15/Zod 4
   - Performance test: API <200ms p95, DB <100ms p95, cache >70% hit rate
   - Quickstart test = refactor component, verify <300 lines, all tests pass

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
   - Add: Dependency update decisions (React 19, Next.js 15, Zod 4 strategies)
   - Add: Structured logging pattern choice
   - Add: API DTO layer design
   - Add: SWR caching strategy
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from 6 requirement categories:
  1. Type System & Code Structure (FR-001 to FR-005)
  2. Security (FR-006 to FR-010)
  3. Dependencies & Technical Debt (FR-011 to FR-015)
  4. Performance & Scalability (FR-016 to FR-020)
  5. Monitoring & Observability (FR-021 to FR-025)
  6. API Layer Decoupling (FR-026 to FR-028)
- Each requirement → test task + implementation task
- Dependency updates → migration tasks (React, Next.js, Zod, Cypress, ESLint)
- Refactoring → component extraction tasks (page.tsx, repository, DE algorithm)

**Ordering Strategy**:
- Phase 1: Type consolidation (foundation)
- Phase 2: Dependency updates (breaking changes fixed inline)
- Phase 3: Code refactoring (oversized components)
- Phase 4: Performance optimizations (caching, monitoring, pooling)
- Phase 5: Security & observability (rate limiting, logging, contract tests)
- Mark [P] for parallel execution (independent file changes)

**Estimated Output**: 40-50 numbered, ordered tasks in tasks.md (6 categories × ~7 tasks each)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No constitutional violations - table not needed*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (no violations)
- [x] Post-Design Constitution Check: PASS (re-evaluated, no new violations)
- [x] All NEEDS CLARIFICATION resolved (via research.md)
- [x] Complexity deviations documented (N/A)

---
*Based on Constitution v1.1.0 - See `.specify/memory/constitution.md`*
