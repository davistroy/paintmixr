
# Implementation Plan: Hamburger Navigation Menu

**Branch**: `009-add-hamburger-menu` | **Date**: 2025-10-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-add-hamburger-menu/spec.md`

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
Add a hamburger navigation menu to provide persistent access to Session History, Debug Mode (with comprehensive logging), About dialog, and Logout functionality. The menu includes a sophisticated debug console with in-memory log storage (5MB FIFO), text wrapping controls, and plain-text log download capabilities.

## Technical Context
**Language/Version**: TypeScript 5.x with Next.js 15
**Primary Dependencies**: React 18+, Radix UI (DropdownMenu, Dialog), Tailwind CSS, shadcn/ui components
**Storage**: In-memory for debug logs (session-scoped), Supabase for version metadata
**Testing**: Jest (unit), React Testing Library (component), Cypress (E2E)
**Target Platform**: Web (PWA-compliant), responsive design for mobile/desktop
**Project Type**: Web (frontend-focused with existing backend)
**Performance Goals**: <200ms menu animation, 10-50 events/sec debug logging without UI lag, 60fps UI interactions
**Constraints**: 5MB in-memory log limit with FIFO rotation, session-only debug state (no persistence), WCAG 2.1 AA accessibility
**Scale/Scope**: Single-user concurrent sessions, 4 menu items, 1 debug console component, ~8-10 new components

**User Context**: and when completely finished, execute /tasks, and when completely finished with that, execute /analyze and then stop for me to review

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I - Color Accuracy First**: N/A - This feature does not involve color calculations or color display components

**Principle II - Documentation Currency**: PASS - Will use Context7 MCP for Radix UI and React documentation lookups during implementation

**Principle III - Test-First Development**: PASS - TDD approach planned: component tests → E2E scenarios → implementation; performance tests for debug logging throughput

**Principle IV - Type Safety & Validation**: PASS - TypeScript strict mode enforced, Zod schemas for log entry validation, proper type definitions for all components

**Principle V - Performance & Accessibility**: PASS - <200ms menu animation with prefers-reduced-motion support, WCAG 2.1 AA compliance (44px tap targets, keyboard navigation, ARIA labels), 60fps UI maintained during logging

**Principle VI - Real-World Testing**: PASS - Cypress E2E tests for all menu flows (Session History navigation, Debug Mode toggle, About dialog, Logout), accessibility automated testing, performance regression for log buffering

**Production Standards Compliance**: PASS - Integrates with existing Supabase Auth session (logout flow), no new RLS policies required (read-only version metadata), PWA-compatible (no offline functionality needed for ephemeral debug logs)

*No constitutional violations - feature aligns with existing architecture*

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
├── components/
│   ├── HamburgerMenu.tsx           # Main navigation menu
│   ├── DebugConsole.tsx             # Debug log viewer
│   ├── AboutDialog.tsx              # App metadata modal
│   └── LogoutButton.tsx             # Logout component
├── contexts/
│   ├── DebugContext.tsx             # Global debug state provider
│   └── ModalContext.tsx             # Modal visibility tracker
├── hooks/
│   ├── useDebugLog.ts               # Debug logging hook
│   └── useModalDetection.ts         # Modal state hook
├── lib/
│   ├── debug/
│   │   ├── circular-buffer.ts       # FIFO log buffer (5MB limit)
│   │   ├── log-formatter.ts         # Plain text serializer
│   │   ├── event-interceptors.ts    # Auto-capture API/user/state events
│   │   └── types.ts                 # DebugLogEntry, DebugSession types
│   └── config/
│       └── app-metadata.ts          # Version/release date/GitHub URL

__tests__/
├── components/
│   ├── HamburgerMenu.test.tsx
│   ├── DebugConsole.test.tsx
│   └── AboutDialog.test.tsx
├── contexts/
│   └── DebugContext.test.tsx
├── lib/
│   └── debug/
│       └── circular-buffer.test.ts
└── integration/
    ├── menu-debug-flow.test.tsx
    └── modal-interaction.test.tsx

cypress/
└── e2e/
    ├── hamburger-menu.cy.ts         # E2E: Menu open/close/navigation
    ├── debug-mode.cy.ts              # E2E: Debug console activation
    └── accessibility.cy.ts           # E2E: WCAG compliance
```

**Structure Decision**: Web application (Next.js frontend). All components in `src/components/`, global state in `src/contexts/`, utility logic in `src/lib/debug/`. Testing follows TDD with Jest (unit/integration) and Cypress (E2E). No backend changes required (leverages existing Supabase Auth).

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
- Setup phase: Install shadcn/ui components, create type definitions
- Test phase (TDD): Write failing tests for all contracts
- Core implementation: Models → Contexts → Components
- Integration: Wire up event interceptors, modal detection
- Polish: Accessibility, performance optimization, E2E tests

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependency order:
  1. Type definitions (DebugLogEntry, AppMetadata schemas) [P]
  2. Circular buffer logic [P]
  3. Context providers (DebugContext, ModalContext)
  4. Core components (HamburgerMenu, DebugConsole, AboutDialog)
  5. Integration logic (event interceptors, modal detection)
  6. E2E scenarios from quickstart.md
- Mark [P] for parallel execution (independent modules)

**Estimated Task Breakdown**:
- Setup: 3 tasks (shadcn/ui install, type definitions, test scaffolding)
- Core implementation: 12 tasks (6 components, 2 contexts, 4 utilities)
- Testing: 10 tasks (8 unit test files, 2 integration tests)
- E2E: 6 tasks (menu, debug mode, about, logout, accessibility, performance)
- Polish: 4 tasks (mobile responsive, prefers-reduced-motion, ARIA labels, bundle size)
- **Total**: ~35 numbered, dependency-ordered tasks

**Key Parallel Opportunities**:
- Type definitions can be written in parallel with shadcn/ui installation
- Component tests can be written in parallel once contracts are defined
- Circular buffer tests independent from React components

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
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - approach described)
- [ ] Phase 3: Tasks generated (/tasks command) - awaiting execution
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (no violations)
- [x] Post-Design Constitution Check: PASS (re-verified after Phase 1)
- [x] All NEEDS CLARIFICATION resolved (12 clarifications completed 2025-10-05)
- [x] Complexity deviations documented (none - no violations)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
