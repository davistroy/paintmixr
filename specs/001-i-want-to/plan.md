
# Implementation Plan: Paint Mixing Color App

**Branch**: `001-i-want-to` | **Date**: 2025-09-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-i-want-to/spec.md`

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
Paint mixing application for accurate color matching using predefined oil paint colors. Users input target colors via hex codes, color picker, or image upload, and receive precise milliliter mixing ratios. The system also predicts resulting colors from mixing ratios and stores sessions for future reference. Built as a Next.js web application with Supabase backend, emphasizing color accuracy (Delta E ≤ 4.0) and support for complex oil paint mixing properties.

## Technical Context
**Language/Version**: TypeScript (strict mode), Next.js 15+ with App Router
**Primary Dependencies**: Next.js, React 18+, Supabase (database/auth/storage), Shadcn UI, Tailwind CSS, Zod validation, React Hook Form
**Storage**: Supabase PostgreSQL for sessions/formulas, Supabase Storage for image uploads, JSON file for predefined paint colors
**Testing**: Jest with React Testing Library, Cypress for E2E, Supabase local testing
**Target Platform**: Web browsers (desktop/mobile), progressive web app capabilities
**Project Type**: Web application (frontend + backend via Supabase)
**Performance Goals**: <500ms color calculation response, <2s image processing, 60fps UI interactions
**Constraints**: Delta E ≤ 4.0 color accuracy, 100-1000ml mixing volumes, mobile-responsive design, color-accurate displays
**Scale/Scope**: Single-user focus initially, ~50 predefined colors, unlimited saved sessions, browser-based image processing

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Since the constitution file is a template, applying standard web development principles:
- ✅ **Type Safety**: TypeScript strict mode enforced throughout
- ✅ **Test-First Development**: TDD approach with tests before implementation
- ✅ **Security**: Supabase RLS policies for data access, Zod validation for inputs
- ✅ **Performance**: Specific performance goals defined (<500ms, <2s, 60fps)
- ✅ **Accessibility**: Following color contrast guidelines, mobile-responsive design
- ✅ **Maintainability**: Shadcn UI patterns, clear separation of concerns

**Status**: PASS - No constitutional violations identified

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
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Main paint mixing interface
│   ├── history/           # Saved sessions page
│   └── layout.tsx         # Root layout with color theme
├── components/            # Shadcn UI components
│   ├── ui/               # Base Shadcn components
│   ├── color-input/      # Color picker, hex input, image upload
│   ├── mixing-calculator/ # Ratio calculation display
│   ├── session-manager/  # Save/load session functionality
│   └── color-display/    # Color accuracy displays
├── lib/                  # Utilities and services
│   ├── supabase/         # Database client and types
│   ├── color-math/       # Delta E, RGB/LAB conversions
│   ├── paint-mixing/     # Oil paint mixing algorithms
│   ├── validations/      # Zod schemas
│   └── utils/            # General utilities
├── hooks/                # Custom React hooks
│   ├── use-color-matching/ # Color calculation logic
│   ├── use-sessions/     # Session management
│   └── use-image-processing/ # Image color extraction
└── types/                # TypeScript definitions
    ├── paint.ts          # Paint color types
    ├── session.ts        # Mixing session types
    └── supabase.ts       # Generated Supabase types

tests/
├── components/           # React component tests
├── lib/                  # Library function tests
├── integration/          # E2E tests with Cypress
└── __mocks__/           # Test mocks and fixtures

public/
├── paint-colors.json     # Predefined paint color database
└── assets/              # Static assets

supabase/
├── migrations/          # Database schema migrations
└── functions/           # Edge functions (if needed)
```

**Structure Decision**: Next.js web application with Supabase backend. Frontend-focused structure since backend logic is handled by Supabase services. Color calculation and paint mixing algorithms are client-side for performance.

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
- Color science library tasks: LAB conversions, Delta E calculations, Kubelka-Munk mixing [P]
- Supabase setup tasks: Database schema, RLS policies, TypeScript types [P]
- UI component tasks: Color input, display, session management [P]
- Integration tasks: API routes, color processing workflows
- Test tasks: Unit tests for color calculations, E2E tests for user scenarios

**Ordering Strategy**:
- **Phase 3a (Setup)**: Environment, database, basic project structure [P]
- **Phase 3b (Core Libraries)**: Color science, paint mixing algorithms (tests first) [P]
- **Phase 3c (Data Layer)**: Supabase schema, API routes, validation
- **Phase 3d (UI Components)**: Shadcn components, color inputs, displays [P]
- **Phase 3e (Integration)**: Complete workflows, session management
- **Phase 3f (Polish)**: Performance optimization, accessibility, mobile responsiveness

**Estimated Output**: 35-40 numbered, dependency-ordered tasks in tasks.md

**Key Parallel Task Groups**:
- Color math libraries (independent of UI)
- UI component development (independent of backend)
- Test suite development (can run alongside implementation)

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
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

**Artifacts Generated**:
- [x] `/specs/001-i-want-to/research.md` - Technical research and decisions
- [x] `/specs/001-i-want-to/data-model.md` - Entity definitions and database schema
- [x] `/specs/001-i-want-to/contracts/api-spec.yaml` - OpenAPI specification
- [x] `/specs/001-i-want-to/contracts/types.ts` - TypeScript type definitions
- [x] `/specs/001-i-want-to/quickstart.md` - Integration test scenarios
- [x] `/CLAUDE.md` - Updated agent context with tech stack decisions

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
