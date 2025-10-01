# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 3.1: Setup
- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T004 [P] Contract test POST /api/users in tests/contract/test_users_post.py
- [ ] T005 [P] Contract test GET /api/users/{id} in tests/contract/test_users_get.py
- [ ] T006 [P] Integration test user registration in tests/integration/test_registration.py
- [ ] T007 [P] Integration test auth flow in tests/integration/test_auth.py
- [ ] T008 [P] E2E test critical user workflow in cypress/e2e/user_workflow.cy.ts
- [ ] T009 [P] Accessibility test for WCAG compliance in tests/accessibility/wcag.test.ts
- [ ] T010 [P] Performance test for response times in tests/performance/performance.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T011 [P] User model in src/models/user.py
- [ ] T012 [P] UserService CRUD in src/services/user_service.py
- [ ] T013 [P] CLI --create-user in src/cli/user_commands.py
- [ ] T014 POST /api/users endpoint
- [ ] T015 GET /api/users/{id} endpoint
- [ ] T016 Input validation
- [ ] T017 Error handling and logging

## Phase 3.4: Integration
- [ ] T018 Connect UserService to DB
- [ ] T019 Auth middleware
- [ ] T020 Request/response logging
- [ ] T021 CORS and security headers

## Phase 3.5: Polish
- [ ] T022 [P] Unit tests for validation in tests/unit/test_validation.py
- [ ] T023 [P] Update docs/api.md
- [ ] T024 Remove duplication
- [ ] T025 Run E2E test validation in cypress/e2e/
- [ ] T026 Verify accessibility compliance with automated testing
- [ ] T027 Performance regression validation with established baselines

## Dependencies
- Tests (T004-T010) before implementation (T011-T017)
- T011 blocks T012, T018
- T019 blocks T021
- Implementation before polish (T022-T027)
- E2E tests (T008) require basic implementation for workflow validation

## Parallel Example
```
# Launch T004-T010 together:
Task: "Contract test POST /api/users in tests/contract/test_users_post.py"
Task: "Contract test GET /api/users/{id} in tests/contract/test_users_get.py"
Task: "Integration test registration in tests/integration/test_registration.py"
Task: "Integration test auth in tests/integration/test_auth.py"
Task: "E2E test critical user workflow in cypress/e2e/user_workflow.cy.ts"
Task: "Accessibility test for WCAG compliance in tests/accessibility/wcag.test.ts"
Task: "Performance test for response times in tests/performance/performance.test.ts"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task
   
2. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks
   
3. **From User Stories**:
   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [ ] All contracts have corresponding tests
- [ ] All entities have model tasks
- [ ] All tests come before implementation
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task