
# Implementation Plan: Enhanced Accuracy Mode - Server-Side Optimization

**Branch**: `007-enhanced-mode-1` | **Date**: 2025-10-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/davistroy/dev/paintmixr/specs/007-enhanced-mode-1/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Re-enable Enhanced Accuracy Mode by replacing Web Worker-based client-side optimization with server-side optimization algorithms compatible with Vercel serverless functions. Support paint formulas using 2-5 colors (expanding beyond current 3-paint limit) to achieve Delta E ≤ 2.0 color matching accuracy. Implement 30-second timeout with automatic fallback to Standard mode, 5-second progress indicators, and graceful handling of up to 100-paint collections.

## Technical Context
**Language/Version**: TypeScript 5.9.2, Next.js 14.2.33, Node.js ES2017+
**Primary Dependencies**: Next.js App Router, @supabase/ssr, Zod 3.24, React Hook Form 7.54, ml-matrix 6.12 (optimization algorithms)
**Storage**: Supabase PostgreSQL with Row Level Security policies
**Testing**: Jest 29.7 (unit/integration), Cypress 13.15 (E2E), jest-axe (accessibility)
**Target Platform**: Vercel serverless functions (Node.js runtime, no Web Workers)
**Project Type**: Web application (Next.js App Router with server-side API routes)
**Performance Goals**: Delta E ≤ 2.0 accuracy, <30s p95 optimization time, <500ms color calculations, 60fps UI
**Constraints**: Vercel serverless timeout (10-60s), no browser APIs server-side, 100-paint collections max
**Scale/Scope**: Professional painters, 2-5 paint formulas, server-side optimization replacing Web Workers

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I - Color Accuracy First**: PASS - Delta E ≤ 2.0 target (exceeds ≤4.0 requirement), LAB color space for all calculations, Kubelka-Munk coefficients used in mixing formulas (existing kubelka-munk.ts:line 72-233)
**Principle II - Documentation Currency**: PASS - Context7 MCP will be used for ml-matrix optimization library research and serverless patterns
**Principle III - Test-First Development**: PASS - TDD approach planned: contract tests → unit tests → implementation, performance tests with <30s timeout validation
**Principle IV - Type Safety & Validation**: PASS - TypeScript strict mode enabled (tsconfig.json:line 7-18), Zod validation for API request schemas, existing ColorValue interface (types/index.ts)
**Principle V - Performance & Accessibility**: VIOLATION JUSTIFIED - Removing Web Workers (client-side) in favor of server-side optimization due to Vercel serverless incompatibility. UI remains 60fps, WCAG 2.1 AA compliance maintained for progress indicators
**Principle VI - Real-World Testing**: PASS - Cypress E2E tests for Enhanced mode workflow planned, performance regression testing with 30s timeout validation, accessibility testing for new progress UI

**Production Standards Compliance**: PASS - Supabase RLS for user paint collections (existing pattern), session management via @supabase/ssr (existing), PWA offline fallback to Standard mode

*Document any violations in Complexity Tracking section with justification*

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── app/
│   ├── api/
│   │   └── optimize/
│   │       └── route.ts              # Server-side optimization endpoint (MODIFY)
│   └── page.tsx                      # Main dashboard with Enhanced mode toggle (MODIFY)
├── components/
│   └── dashboard/
│       └── paint-mixing-dashboard.tsx # Enhanced mode UI controls (MODIFY)
├── lib/
│   ├── kubelka-munk.ts               # Paint mixing physics (EXISTING)
│   ├── color-science.ts              # Delta E calculations (EXISTING)
│   ├── mixing-optimization/          # NEW directory
│   │   ├── algorithms.ts             # Server-side optimization algorithms
│   │   ├── constraints.ts            # Volume constraints (EXISTING)
│   │   └── enhanced-optimizer.ts     # Main enhanced mode optimizer
│   ├── supabase/
│   │   ├── route-handler.ts          # Supabase client for API routes (EXISTING)
│   │   └── client.ts                 # Browser Supabase client (EXISTING)
│   └── types/
│       └── index.ts                  # Shared types (MODIFY - add optimization types)
├── hooks/
│   └── use-color-matching.ts         # Color matching hook (MODIFY)
└── workers/
    └── color-optimization.worker.ts  # DEPRECATED - to be removed

__tests__/
├── contract/
│   └── optimize-enhanced-api.test.ts # NEW - API contract tests
├── unit/
│   ├── mixing-optimizer.test.ts      # EXISTING - extend for 5-paint support
│   └── enhanced-algorithms.test.ts   # NEW - algorithm unit tests
└── integration/
    └── enhanced-mode.test.ts         # NEW - end-to-end optimization tests

cypress/e2e/
└── enhanced-accuracy-mode.cy.ts      # NEW - E2E Enhanced mode workflow
```

**Structure Decision**: Next.js App Router web application structure. Server-side optimization logic in `src/lib/mixing-optimization/` directory, API route at `/api/optimize`, client UI in dashboard component. Deprecate existing Web Worker implementation in `src/workers/`.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle V: Removing Web Workers for calculations | Vercel serverless functions don't support browser-specific Worker API; optimization must run server-side | Keeping client-side Web Workers would make Enhanced mode unusable in production deployment; no serverless platform supports Workers in Node.js runtime |


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
- [x] Initial Constitution Check: PASS (1 justified violation: Web Workers → server-side)
- [x] Post-Design Constitution Check: PASS (same violation remains justified)
- [x] All NEEDS CLARIFICATION resolved (spec.md clarification session complete)
- [x] Complexity deviations documented (Complexity Tracking section)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
