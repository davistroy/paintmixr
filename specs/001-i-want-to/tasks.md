# Tasks: Paint Mixing Color App

**Input**: Design documents from `/specs/001-i-want-to/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: Next.js 15+, TypeScript, Supabase, Shadcn UI, Tailwind CSS
   → Structure: Web application with client-side color calculations
2. Load design documents:
   → data-model.md: 4 entities (PredefinedPaint, MixingSession, MixingFormula, FormulaItem)
   → contracts/: 6 API endpoints with OpenAPI spec
   → research.md: Color science decisions (LAB space, Delta E CIE 2000, Kubelka-Munk)
   → quickstart.md: 5 integration test scenarios
3. Generate 42 tasks across 5 phases
4. Apply TDD: Tests before implementation
5. Mark [P] for parallel execution where files don't conflict
6. SUCCESS: tasks ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup
- [ ] T001 Create Next.js project structure with TypeScript and App Router
- [ ] T002 Install and configure dependencies: Supabase, Shadcn UI, Tailwind CSS, React Hook Form, Zod
- [ ] T003 [P] Configure ESLint, Prettier, and TypeScript strict mode
- [ ] T004 [P] Setup Supabase local development environment and generate types
- [ ] T005 [P] Initialize paint colors JSON database with Kubelka-Munk coefficients and cost/complexity metadata in public/paint-colors.json
- [ ] T006 [P] Configure Jest and React Testing Library for unit tests
- [ ] T007 [P] Setup Cypress for E2E testing

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T008 [P] Contract test POST /api/color-match in tests/api/color-match.test.ts
- [ ] T009 [P] Contract test POST /api/ratio-predict in tests/api/ratio-predict.test.ts
- [ ] T010 [P] Contract test GET /api/sessions in tests/api/sessions-list.test.ts
- [ ] T011 [P] Contract test POST /api/sessions in tests/api/sessions-create.test.ts
- [ ] T012 [P] Contract test GET /api/sessions/[id] in tests/api/sessions-get.test.ts
- [ ] T013 [P] Contract test PATCH /api/sessions/[id] in tests/api/sessions-update.test.ts
- [ ] T014 [P] Contract test DELETE /api/sessions/[id] in tests/api/sessions-delete.test.ts
- [ ] T015 [P] Contract test GET /api/paints in tests/api/paints.test.ts
- [ ] T016 [P] Contract test POST /api/image/extract-color in tests/api/image-extract.test.ts
- [ ] T017 [P] Integration test hex color matching workflow in cypress/e2e/color-matching-hex.cy.ts
- [ ] T018 [P] Integration test ratio prediction workflow in cypress/e2e/ratio-prediction.cy.ts
- [ ] T019 [P] Integration test image color extraction workflow in cypress/e2e/image-extraction.cy.ts
- [ ] T020 [P] Integration test session management workflow in cypress/e2e/session-management.cy.ts
- [ ] T021 [P] Integration test mobile responsive experience in cypress/e2e/mobile-responsive.cy.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Color Science Libraries
- [ ] T022 [P] LAB color space conversion utilities in src/lib/color-math/lab-conversions.ts
- [ ] T023 [P] Delta E CIE 2000 calculation in src/lib/color-math/delta-e.ts
- [ ] T024 [P] RGB to LAB color space conversions in src/lib/color-math/rgb-lab.ts
- [ ] T025 [P] Kubelka-Munk paint mixing algorithms with K/S coefficient handling, opacity calculations, and tinting strength modeling in src/lib/paint-mixing/kubelka-munk.ts
- [ ] T026 [P] Color matching optimization algorithms in src/lib/paint-mixing/color-matching.ts

### Data Models and Validation
- [ ] T027 [P] PredefinedPaint type definitions and Zod schemas in src/types/paint.ts
- [ ] T028 [P] MixingSession type definitions and Zod schemas in src/types/session.ts
- [ ] T029 [P] API request/response validation schemas in src/lib/validations/api-schemas.ts

### Database Setup
- [ ] T030 Database migration for mixing_sessions table in supabase/migrations/001_create_sessions.sql
- [ ] T031 Database migration for mixing_formulas table in supabase/migrations/002_create_formulas.sql
- [ ] T032 Database migration for formula_items table in supabase/migrations/003_create_formula_items.sql
- [ ] T033 Row Level Security policies in supabase/migrations/004_enable_rls.sql
- [ ] T034 [P] Supabase client configuration in src/lib/supabase/client.ts
- [ ] T035 [P] Database service layer for sessions in src/lib/supabase/sessions.ts

### API Routes
- [ ] T036 POST /api/color-match endpoint with primary result plus 3 ranked alternatives (cost, simplicity, accuracy) in src/app/api/color-match/route.ts
- [ ] T037 POST /api/ratio-predict endpoint in src/app/api/ratio-predict/route.ts
- [ ] T038 GET /api/sessions endpoint in src/app/api/sessions/route.ts
- [ ] T039 POST /api/sessions endpoint in src/app/api/sessions/route.ts
- [ ] T040 GET /api/sessions/[id] endpoint in src/app/api/sessions/[id]/route.ts
- [ ] T041 PATCH /api/sessions/[id] endpoint in src/app/api/sessions/[id]/route.ts
- [ ] T042 DELETE /api/sessions/[id] endpoint in src/app/api/sessions/[id]/route.ts
- [ ] T043 GET /api/paints endpoint in src/app/api/paints/route.ts
- [ ] T044 POST /api/image/extract-color endpoint in src/app/api/image/extract-color/route.ts

## Phase 3.4: User Interface Components

### Core UI Components
- [ ] T045 [P] ColorValue display component in src/components/color-display/ColorValue.tsx
- [ ] T046 [P] Color input via hex code in src/components/color-input/HexInput.tsx
- [ ] T047 [P] Color picker component in src/components/color-input/ColorPicker.tsx
- [ ] T048 [P] Image upload and color extraction in src/components/color-input/ImageUpload.tsx
- [ ] T049 [P] Paint ratio display component in src/components/mixing-calculator/RatioDisplay.tsx
- [ ] T050 [P] Color accuracy indicator in src/components/mixing-calculator/AccuracyIndicator.tsx
- [ ] T051 [P] Session card component in src/components/session-manager/SessionCard.tsx
- [ ] T052 [P] Session save form in src/components/session-manager/SaveForm.tsx

### Page Components
- [ ] T053 Main paint mixing interface in src/app/page.tsx
- [ ] T054 Session history page in src/app/history/page.tsx
- [ ] T055 Root layout with navigation in src/app/layout.tsx

### Custom Hooks
- [ ] T056 [P] useColorMatching hook in src/hooks/use-color-matching.ts
- [ ] T057 [P] useSessions hook in src/hooks/use-sessions.ts
- [ ] T058 [P] useImageProcessing hook in src/hooks/use-image-processing.ts
- [ ] T059 [P] usePaintColors hook in src/hooks/use-paint-colors.ts

## Phase 3.5: Integration & Performance
- [ ] T060 Client-side Web Workers for color calculations in src/workers/color-worker.ts
- [ ] T061 Image processing utilities with Canvas API in src/lib/image-processing/canvas-utils.ts
- [ ] T062 Error handling middleware in src/lib/middleware/error-handler.ts
- [ ] T063 Performance monitoring and optimization in src/lib/utils/performance.ts
- [ ] T064 Progressive Web App configuration in src/app/manifest.ts

## Phase 3.6: Polish
- [ ] T065 [P] Unit tests for color math functions in tests/unit/color-math.test.ts
- [ ] T066 [P] Unit tests for paint mixing algorithms in tests/unit/paint-mixing.test.ts
- [ ] T067 [P] Unit tests for validation schemas in tests/unit/validations.test.ts
- [ ] T068 [P] Component tests for color input components in tests/components/color-input.test.tsx
- [ ] T069 [P] Component tests for session management in tests/components/session-manager.test.tsx
- [ ] T070 [P] Performance tests for color calculations (500ms target) in tests/performance/color-performance.test.ts
- [ ] T071 [P] Accessibility audit and WCAG compliance in tests/accessibility/wcag.test.ts
- [ ] T072 [P] Mobile responsiveness validation in tests/responsive/mobile.test.ts
- [ ] T073 Create sample paint database with 50+ colors in public/paint-colors.json
- [ ] T074 Final integration testing with quickstart scenarios

## Constitutional Compliance & Governance
- [ ] T075 Constitution compliance audit against all 5 core principles in .specify/memory/constitution.md
- [ ] T076 [P] Performance metrics collection for color calculations (500ms target) and accuracy tracking (Delta E reporting) in src/lib/utils/metrics.ts
- [ ] T077 [P] Context7 MCP documentation verification for all external libraries used in implementation

## Dependencies

### Critical Paths
- **Setup Phase**: T001-T007 must complete before any other work
- **Test-First**: T008-T021 must complete and FAIL before T022-T074
- **Color Science**: T022-T026 must complete before T036, T037 (API routes use these)
- **Database**: T030-T035 must complete before T038-T044 (session APIs need DB)
- **Types**: T027-T029 must complete before API routes T036-T044
- **UI Dependencies**: T045-T052 must complete before T053-T055 (pages use components)
- **Hooks**: T056-T059 must complete before T053-T055 (pages use hooks)

### Sequential Dependencies
- T030 → T031 → T032 → T033 → T034 → T035 (Database setup sequence)
- T027, T028 → T029 → T036-T044 (Types → validation → API routes)
- T045-T052 → T056-T059 → T053-T055 (Components → hooks → pages)

### Constitutional Gates
- T075 must complete before final deployment
- T076 must complete before performance testing (T070)
- T077 should verify during setup phase dependencies

## Parallel Execution Examples

### Setup Phase (T001-T007)
```bash
# Can run simultaneously - different areas
Task: "Install and configure dependencies: Supabase, Shadcn UI, Tailwind CSS, React Hook Form, Zod"
Task: "Configure ESLint, Prettier, and TypeScript strict mode"
Task: "Setup Supabase local development environment and generate types"
Task: "Initialize paint colors JSON database in public/paint-colors.json"
Task: "Configure Jest and React Testing Library for unit tests"
Task: "Setup Cypress for E2E testing"
```

### Contract Tests (T008-T016)
```bash
# All contract tests can run in parallel - different test files
Task: "Contract test POST /api/color-match in tests/api/color-match.test.ts"
Task: "Contract test POST /api/ratio-predict in tests/api/ratio-predict.test.ts"
Task: "Contract test GET /api/sessions in tests/api/sessions-list.test.ts"
Task: "Contract test POST /api/sessions in tests/api/sessions-create.test.ts"
Task: "Contract test GET /api/sessions/[id] in tests/api/sessions-get.test.ts"
```

### Color Science Libraries (T022-T026)
```bash
# Independent utility libraries - can develop in parallel
Task: "LAB color space conversion utilities in src/lib/color-math/lab-conversions.ts"
Task: "Delta E CIE 2000 calculation in src/lib/color-math/delta-e.ts"
Task: "RGB to LAB color space conversions in src/lib/color-math/rgb-lab.ts"
Task: "Kubelka-Munk paint mixing algorithms in src/lib/paint-mixing/kubelka-munk.ts"
Task: "Color matching optimization algorithms in src/lib/paint-mixing/color-matching.ts"
```

### UI Components (T045-T052)
```bash
# Independent components - can develop in parallel
Task: "ColorValue display component in src/components/color-display/ColorValue.tsx"
Task: "Color input via hex code in src/components/color-input/HexInput.tsx"
Task: "Color picker component in src/components/color-input/ColorPicker.tsx"
Task: "Image upload and color extraction in src/components/color-input/ImageUpload.tsx"
Task: "Paint ratio display component in src/components/mixing-calculator/RatioDisplay.tsx"
```

### Polish Phase Tests (T065-T072)
```bash
# Independent test suites - can run in parallel
Task: "Unit tests for color math functions in tests/unit/color-math.test.ts"
Task: "Unit tests for paint mixing algorithms in tests/unit/paint-mixing.test.ts"
Task: "Component tests for color input components in tests/components/color-input.test.tsx"
Task: "Performance tests for color calculations (500ms target) in tests/performance/color-performance.test.ts"
Task: "Accessibility audit and WCAG compliance in tests/accessibility/wcag.test.ts"
```

## Task Validation Checklist

### Contract Coverage ✓
- [x] All 9 API endpoints have contract tests (T008-T016)
- [x] All 5 quickstart scenarios have integration tests (T017-T021)

### Entity Coverage ✓
- [x] PredefinedPaint types and validation (T027)
- [x] MixingSession types and validation (T028)
- [x] MixingFormula and FormulaItem in session types (T028)

### Implementation Coverage ✓
- [x] All API endpoints implemented (T036-T044)
- [x] All core color science algorithms (T022-T026)
- [x] All UI components for user workflows (T045-T055)
- [x] All database tables and RLS policies (T030-T035)

### TDD Compliance ✓
- [x] All tests (T008-T021) come before implementation (T022+)
- [x] Tests marked as MUST FAIL before implementation

### Parallel Task Independence ✓
- [x] All [P] tasks work on different files
- [x] No [P] tasks have dependencies on each other
- [x] Sequential tasks properly ordered by dependencies

## Notes
- **Color Accuracy**: Target Delta E ≤ 4.0 (commercial printing standard)
- **Performance**: Color calculations <500ms, image processing <2s, UI 60fps
- **Mobile**: Touch targets ≥44px, responsive design, PWA capabilities
- **Testing**: TDD approach with failing tests before implementation
- **Architecture**: Client-side color calculations with Supabase backend
- **Libraries**: Leverage Next.js App Router, TypeScript strict mode, Shadcn UI patterns

## Success Criteria
- All contract tests pass ✓
- All integration tests pass ✓
- Color accuracy meets Delta E ≤ 4.0 requirement ✓
- Performance targets achieved ✓
- Mobile responsive design ✓
- WCAG 2.1 AA accessibility compliance ✓