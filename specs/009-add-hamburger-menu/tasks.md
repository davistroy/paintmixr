# Tasks: Hamburger Navigation Menu

**Feature**: 009-add-hamburger-menu
**Input**: Design documents from `/specs/009-add-hamburger-menu/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/components.md, quickstart.md

## Execution Flow
Tasks are ordered by dependencies following TDD principles: Setup → Tests → Implementation → Integration → Polish. Tests MUST be written and MUST FAIL before any implementation code.

---

## Phase 3.1: Setup

- [X] **T001** Install shadcn/ui DropdownMenu and Dialog components via `npx shadcn@latest add dropdown-menu dialog`

- [X] **T002** [P] Create type definitions in `src/lib/debug/types.ts`:
  - `DebugLogEntry` (id, timestamp, level, category, message, metadata)
  - `DebugSession` (sessionId, startTime, endTime, entries, totalSize)
  - `AppMetadata` (version, releaseDate, developers, githubUrl)
  - `MenuState` (isOpen, isDebugModeEnabled, isModalOpen)
  - All with Zod schemas for runtime validation

- [X] **T003** [P] Create app metadata configuration in `src/lib/config/app-metadata.ts`:
  - Export `APP_METADATA` constant reading from package.json
  - Include version, releaseDate (from env var), developers array, githubUrl

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL**: These tests MUST be written and MUST FAIL before ANY implementation code.

### Unit Tests (Components)

- [X] **T004** [P] Write component test for HamburgerMenu in `__tests__/components/HamburgerMenu.test.tsx`:
  - Renders hamburger icon on mount
  - Opens menu on click
  - Closes menu on outside click
  - Closes menu on ESC key press
  - Hides icon when `isModalOpen` prop is true
  - Shows 4 menu items when open
  - Test MUST FAIL (component doesn't exist yet)

- [X] **T005** [P] Write component test for DebugConsole in `__tests__/components/DebugConsole.test.tsx`:
  - Renders last 10 log entries when `isVisible=true`
  - Auto-scrolls to newest entry when new log added
  - Toggles text wrapping on checkbox change
  - Disables "Download Logs" button when `entries.length === 0`
  - Enables "Download Logs" button when entries exist
  - Test MUST FAIL (component doesn't exist yet)

- [X] **T006** [P] Write component test for AboutDialog in `__tests__/components/AboutDialog.test.tsx`:
  - Renders all 4 metadata fields (version, releaseDate, developers, githubUrl)
  - Closes on close button click
  - Closes on ESC key press
  - GitHub URL has `target="_blank"` attribute
  - Test MUST FAIL (component doesn't exist yet)

- [X] **T007** [P] Write component test for LogoutButton in `__tests__/components/LogoutButton.test.tsx`:
  - Calls `supabase.auth.signOut()` on button click
  - Calls `router.push('/auth/signin')` after signOut
  - Shows loading state during async operation
  - Test MUST FAIL (component doesn't exist yet)

### Unit Tests (Contexts & Utilities)

- [X] **T008** [P] Write context test for DebugContext in `__tests__/contexts/DebugContext.test.tsx`:
  - Enables debug mode and creates new session
  - Disables debug mode and clears session
  - Logs entry and adds to buffer
  - Removes oldest entry when exceeds 5MB
  - Returns last 10 entries for UI via `visibleEntries`
  - Test MUST FAIL (context doesn't exist yet)

- [X] **T009** [P] Write utility test for CircularBuffer in `__tests__/lib/debug/circular-buffer.test.ts`:
  - Adds entry to buffer
  - Removes oldest entry when size exceeds 5MB (FIFO)
  - Calculates total byte size correctly
  - Clears all entries on `clear()` call
  - Test MUST FAIL (utility doesn't exist yet)

### Integration Tests

- [X] **T010** [P] Write integration test for menu-debug flow in `__tests__/integration/menu-debug-flow.test.tsx`:
  - Open menu → Click Debug Mode → Console appears
  - Generate log entry → Entry appears in console
  - Download logs → Blob created with plain text content
  - Test MUST FAIL (components don't exist yet)

- [X] **T011** [P] Write integration test for modal interaction in `__tests__/integration/modal-interaction.test.tsx`:
  - Open modal → Hamburger icon disappears
  - Close modal → Hamburger icon reappears
  - Test MUST FAIL (ModalContext doesn't exist yet)

### E2E Tests (Cypress)

- [X] **T012** [P] Write E2E test for hamburger menu in `cypress/e2e/hamburger-menu.cy.ts`:
  - Scenario 1: Menu open/close interaction (from quickstart.md)
  - Scenario 2: Session History navigation
  - Scenario 9: Modal interaction (menu hiding)
  - Test MUST FAIL (components don't exist yet)

- [X] **T013** [P] Write E2E test for debug mode in `cypress/e2e/debug-mode.cy.ts`:
  - Scenario 3: Debug Mode activation & logging
  - Scenario 4: Log download
  - Scenario 5: Debug Mode toggle off (clear logs)
  - Scenario 6: FIFO log rotation (5MB limit)
  - Test MUST FAIL (debug console doesn't exist yet)

- [X] **T014** [P] Write E2E test for about/logout in `cypress/e2e/about-logout.cy.ts`:
  - Scenario 7: About dialog display
  - Scenario 8: Logout flow
  - Test MUST FAIL (components don't exist yet)

### Accessibility & Performance Tests

- [X] **T015** [P] Write accessibility test in `cypress/e2e/accessibility.cy.ts`:
  - Scenario 10: Keyboard navigation (Tab, Enter, ESC)
  - Screen reader compatibility (ARIA labels/roles)
  - Color contrast validation (≥4.5:1)
  - Motion sensitivity (prefers-reduced-motion)
  - Test MUST FAIL (components don't have ARIA attributes yet)

- [X] **T016** [P] Write performance test in `cypress/e2e/performance.cy.ts`:
  - Scenario 11: Menu animation completes within 200ms
  - Debug console handles 50 events/sec without lag
  - Memory leak detection (enable/disable 100 times, delta <10MB)
  - Test MUST FAIL (components don't exist yet)

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

**Prerequisites**: All tests in Phase 3.2 must be written and failing.

### Utilities & Data Layer

- [ ] **T017** [P] Implement CircularBuffer class in `src/lib/debug/circular-buffer.ts`:
  - Constructor with maxSize parameter (5MB = 5 * 1024 * 1024 bytes)
  - `push(entry: DebugLogEntry)` method with FIFO removal when exceeds maxSize
  - `getAll()` returns all entries in chronological order
  - `getLast(n: number)` returns last N entries
  - `clear()` empties buffer
  - `getTotalSize()` calculates current byte size
  - Make T009 test PASS

- [ ] **T018** [P] Implement log formatter in `src/lib/debug/log-formatter.ts`:
  - `formatLogEntryText(entry: DebugLogEntry): string` - Plain text format
  - `serializeLogsToText(entries: DebugLogEntry[]): string` - Full session export
  - `downloadLogsAsFile(entries: DebugLogEntry[], sessionId: string): void` - Browser download

- [ ] **T019** [P] Implement event interceptors in `src/lib/debug/event-interceptors.ts`:
  - `interceptFetch()` - Wrap `window.fetch` to log API calls
  - `interceptClicks()` - Add global click listener for user interactions
  - `interceptErrors()` - Add `window.onerror` handler for error logging
  - Return cleanup functions to restore original behavior

### Context Providers

- [ ] **T020** Implement DebugContext provider in `src/contexts/DebugContext.tsx`:
  - State: `session: DebugSession | null`, `circularBuffer: CircularBuffer`
  - Actions: `enableDebugMode()`, `disableDebugMode()`, `log(...)`, `downloadLogs()`, `clearLogs()`
  - Derived: `visibleEntries` (last 10 entries)
  - Activate event interceptors when debug mode enabled
  - Make T008 test PASS
  - **Dependencies**: T017 (CircularBuffer), T018 (log formatter), T019 (interceptors)

- [ ] **T021** [P] Implement ModalContext provider in `src/contexts/ModalContext.tsx`:
  - State: `isModalOpen: boolean`
  - Actions: `openModal()`, `closeModal()`
  - Make T011 test PASS (integration test)

### Hooks

- [ ] **T022** [P] Implement useDebugLog hook in `src/hooks/useDebugLog.ts`:
  - Access `log` function from DebugContext
  - Return manual logging API: `{ log }`
  - **Dependencies**: T020 (DebugContext)

- [ ] **T023** [P] Implement useModalDetection hook in `src/hooks/useModalDetection.ts`:
  - Access `isModalOpen` from ModalContext
  - Return: `{ isModalOpen }`
  - **Dependencies**: T021 (ModalContext)

### Components

- [ ] **T024** Implement HamburgerMenu component in `src/components/HamburgerMenu.tsx`:
  - Use Radix UI DropdownMenu primitive (from T001)
  - State: `isOpen` (menu dropdown), `isDebugModeEnabled` (debug toggle)
  - Render hamburger icon (3 horizontal lines) with 44px tap target
  - Show 4 menu items: Session History, Debug Mode (toggle), About, Logout
  - Hide icon when `useModalDetection().isModalOpen === true`
  - Close menu on: item click, outside click, ESC key
  - Call `router.push('/sessions')` for Session History (or show "coming soon" toast)
  - Call `enableDebugMode()`/`disableDebugMode()` for Debug Mode toggle
  - Open About dialog on About click
  - Call LogoutButton handler for Logout click
  - CSS transitions: 150ms ease-in-out (meets <200ms requirement)
  - Respect `@media (prefers-reduced-motion: reduce)` → no animation
  - ARIA: `aria-label="Open navigation menu"`, `aria-expanded`, `aria-haspopup="menu"`
  - Make T004 test PASS
  - **Dependencies**: T020 (DebugContext for debug toggle), T023 (modal detection)

- [ ] **T025** Implement DebugConsole component in `src/components/DebugConsole.tsx`:
  - Props: `isVisible: boolean` (controlled by Debug Mode state)
  - State: `wrapText: boolean` (default: false)
  - Access `visibleEntries` (last 10) and `downloadLogs` from DebugContext
  - Render log entries in scrollable container (10 lines visible)
  - Auto-scroll to bottom when new entry added (use `useEffect` + ref)
  - Show "Wrap Text" checkbox below console
  - Show "Download Logs" button (disabled when `entries.length === 0`)
  - Horizontal scroll by default; word-wrap when `wrapText === true`
  - Position at bottom of page with fixed height
  - ARIA: `role="log"`, `aria-live="polite"`, `aria-label="Debug console"`
  - Debounce entry updates to 100ms (use `useMemo` + `useDebounce`)
  - Make T005 test PASS
  - **Dependencies**: T020 (DebugContext for entries + download)

- [ ] **T026** [P] Implement AboutDialog component in `src/components/AboutDialog.tsx`:
  - Props: `isOpen: boolean`, `onClose: () => void`, `metadata: AppMetadata`
  - Use Radix UI Dialog primitive (from T001)
  - Render all 4 fields: version, releaseDate, developers (as list), githubUrl (as link)
  - GitHub link: `<a href={githubUrl} target="_blank" rel="noopener noreferrer">`
  - Close on: close button, outside click, ESC key
  - Integrate with ModalContext: call `openModal()` on open, `closeModal()` on close
  - ARIA: `aria-labelledby="about-dialog-title"`
  - Make T006 test PASS
  - **Dependencies**: T003 (APP_METADATA), T021 (ModalContext)

- [ ] **T027** [P] Implement LogoutButton component in `src/components/LogoutButton.tsx`:
  - Props: `onLogoutStart?: () => void`, `onLogoutComplete?: () => void`, `className?: string`
  - State: `isLoading: boolean`
  - On click: `supabase.auth.signOut()` → `router.push('/auth/signin')`
  - Show loading spinner during async operation
  - Error handling: Always redirect even if signOut fails (network error)
  - Make T007 test PASS

---

## Phase 3.4: Integration

- [ ] **T028** Wire up HamburgerMenu in root layout (`src/app/layout.tsx`):
  - Wrap app with `<ModalProvider>` and `<DebugProvider>`
  - Add `<HamburgerMenu />` after header (top-right positioning)
  - Conditionally render `<DebugConsole isVisible={isDebugModeEnabled} />`
  - **Dependencies**: T020, T021, T024, T025

- [ ] **T029** Integrate event interceptors in DebugContext:
  - Call `interceptFetch()`, `interceptClicks()`, `interceptErrors()` when debug mode enabled
  - Clean up interceptors when debug mode disabled (call returned cleanup functions)
  - Verify logs capture API calls, clicks, errors automatically
  - **Dependencies**: T019, T020

- [ ] **T030** Add modal detection to existing modals:
  - Update SaveForm dialog to call `openModal()`/`closeModal()` via ModalContext
  - Update AboutDialog to integrate with ModalContext (already done in T026)
  - Test that hamburger icon hides when any modal is open
  - **Dependencies**: T021, Feature 006 SaveForm component

- [ ] **T031** Create `/sessions` route (or placeholder):
  - IF route doesn't exist: Create `src/app/sessions/page.tsx` with "Coming soon" message
  - OR: Show toast notification "Session history view coming soon"
  - Verify HamburgerMenu navigation works without errors
  - **Dependencies**: T024

---

## Phase 3.5: Polish

### Unit Test Coverage

- [ ] **T032** [P] Add unit tests for log formatter in `__tests__/lib/debug/log-formatter.test.ts`:
  - Format single entry as plain text
  - Serialize multiple entries with timestamps
  - Download triggers browser Blob API

- [ ] **T033** [P] Add unit tests for event interceptors in `__tests__/lib/debug/event-interceptors.test.ts`:
  - Fetch interception logs API calls
  - Click interception logs user interactions
  - Error interception logs window errors
  - Cleanup functions restore original behavior

- [ ] **T034** [P] Add unit tests for hooks in `__tests__/hooks/`:
  - `useDebugLog.test.ts` - Returns log function
  - `useModalDetection.test.ts` - Returns isModalOpen state

### Accessibility & Responsive Design

- [ ] **T035** Enhance accessibility for all components:
  - Add keyboard navigation support (Tab, Enter, ESC) to HamburgerMenu
  - Add focus indicators (visible outline on `:focus-visible`)
  - Verify ARIA labels and roles on all interactive elements
  - Test screen reader announcements (manual or automated with axe-core)
  - Make T015 test PASS (accessibility E2E)
  - **Dependencies**: T024, T025, T026, T027

- [ ] **T036** Implement mobile responsive design:
  - Ensure hamburger icon has 44x44px minimum tap target (add padding if needed)
  - Test debug console layout on mobile (no horizontal overflow)
  - Verify text readability on small screens (min 16px font size)
  - Test touch interactions (tap to open menu, swipe to close)
  - **Dependencies**: T024, T025

### Performance Optimization

- [ ] **T037** Optimize debug console rendering performance:
  - Use `React.memo` on DebugConsole component to prevent unnecessary re-renders
  - Debounce log entry updates to 100ms batch window
  - Use `useCallback` for event handlers
  - Verify handles 50 events/sec without UI lag (run performance test T016)
  - Make T016 test PASS (performance E2E)
  - **Dependencies**: T025

- [ ] **T038** Add animation performance verification:
  - Test menu open/close animation completes within 200ms
  - Use Chrome DevTools Performance panel to profile
  - Ensure 60fps maintained during animation
  - Verify `prefers-reduced-motion` disables animation
  - **Dependencies**: T024

### Documentation & Validation

- [ ] **T039** [P] Update CLAUDE.md with feature implementation notes:
  - Add "Hamburger Navigation Menu (Feature 009)" section
  - Document DebugContext usage for future logging needs
  - Note ModalContext pattern for future modal implementations
  - Mention CircularBuffer pattern for bounded in-memory storage

- [ ] **T040** Run full E2E test suite validation:
  - Execute all Cypress tests: `npm run test:e2e`
  - Verify all 12 quickstart scenarios pass
  - Ensure no console errors during test execution
  - Make T012, T013, T014, T015, T016 tests PASS
  - **Dependencies**: All implementation tasks T017-T038

- [ ] **T041** Verify accessibility compliance with automated testing:
  - Run axe-core accessibility audit via Cypress
  - Achieve WCAG 2.1 AA compliance (no violations)
  - Test with keyboard-only navigation (no mouse)
  - Verify color contrast ratios ≥4.5:1
  - **Dependencies**: T035

- [ ] **T042** Performance regression validation with baselines:
  - Establish performance baselines for menu animation (<200ms)
  - Establish baseline for debug logging throughput (>10 events/sec)
  - Run memory leak detection test (enable/disable 100 times, delta <10MB)
  - Document baselines in test files for future regression detection
  - **Dependencies**: T037, T038

---

## Dependencies Graph

```
Setup Phase:
T001, T002, T003 (all parallel)
  ↓
Tests Phase (T004-T016 all parallel, can run together):
  ↓
Core Implementation:
T017, T018, T019 (parallel utilities)
  ↓
T020 (DebugContext - depends on T017, T018, T019)
T021 (ModalContext - parallel with T020)
  ↓
T022, T023 (hooks - depend on T020, T021 respectively)
  ↓
T024 (HamburgerMenu - depends on T020, T023)
T025 (DebugConsole - depends on T020)
T026 (AboutDialog - depends on T003, T021)
T027 (LogoutButton - parallel with T024-T026)
  ↓
Integration Phase:
T028 (wire up in layout - depends on T020, T021, T024, T025)
T029 (event interceptors - depends on T019, T020)
T030 (modal detection - depends on T021)
T031 (/sessions route - depends on T024)
  ↓
Polish Phase (most parallel):
T032, T033, T034 (unit tests - parallel)
T035 (accessibility - depends on T024-T027)
T036 (responsive - depends on T024, T025)
T037 (performance console - depends on T025)
T038 (performance animation - depends on T024)
T039 (docs - parallel)
T040 (E2E validation - depends on ALL implementation)
T041 (accessibility validation - depends on T035)
T042 (performance validation - depends on T037, T038)
```

---

## Parallel Execution Examples

### Tests Phase (run all together after T001-T003 complete):
```bash
# All test files can be created in parallel
Task: "Write component test for HamburgerMenu in __tests__/components/HamburgerMenu.test.tsx"
Task: "Write component test for DebugConsole in __tests__/components/DebugConsole.test.tsx"
Task: "Write component test for AboutDialog in __tests__/components/AboutDialog.test.tsx"
Task: "Write component test for LogoutButton in __tests__/components/LogoutButton.test.tsx"
Task: "Write context test for DebugContext in __tests__/contexts/DebugContext.test.tsx"
Task: "Write utility test for CircularBuffer in __tests__/lib/debug/circular-buffer.test.ts"
Task: "Write integration test for menu-debug flow in __tests__/integration/menu-debug-flow.test.tsx"
Task: "Write integration test for modal interaction in __tests__/integration/modal-interaction.test.tsx"
Task: "Write E2E test for hamburger menu in cypress/e2e/hamburger-menu.cy.ts"
Task: "Write E2E test for debug mode in cypress/e2e/debug-mode.cy.ts"
Task: "Write E2E test for about/logout in cypress/e2e/about-logout.cy.ts"
Task: "Write accessibility test in cypress/e2e/accessibility.cy.ts"
Task: "Write performance test in cypress/e2e/performance.cy.ts"
```

### Utilities Phase (run together after tests fail):
```bash
Task: "Implement CircularBuffer class in src/lib/debug/circular-buffer.ts"
Task: "Implement log formatter in src/lib/debug/log-formatter.ts"
Task: "Implement event interceptors in src/lib/debug/event-interceptors.ts"
```

### Polish Phase (run together after integration complete):
```bash
Task: "Add unit tests for log formatter in __tests__/lib/debug/log-formatter.test.ts"
Task: "Add unit tests for event interceptors in __tests__/lib/debug/event-interceptors.test.ts"
Task: "Add unit tests for hooks in __tests__/hooks/"
Task: "Update CLAUDE.md with feature implementation notes"
```

---

## Notes

- **[P] marker**: Tasks with [P] can run in parallel (different files, no dependencies)
- **TDD critical**: All tests (T004-T016) MUST be written and failing BEFORE implementation (T017-T027)
- **Verify tests fail**: Run `npm test` after writing tests to confirm they fail
- **Commit strategy**: Commit after each task or logical group of [P] tasks
- **Accessibility priority**: WCAG 2.1 AA compliance is non-negotiable (Constitution Principle V)
- **Performance targets**: <200ms animation, 10-50 events/sec logging, no UI lag (NFR-001, NFR-002)
- **No localStorage**: Debug logs are in-memory only per clarifications (session-scoped)
- **FIFO rotation**: Circular buffer enforces 5MB limit automatically

---

## Validation Checklist

**GATE: All items must be checked before feature is complete**

- [x] All contracts have corresponding tests (6 component tests + 2 context tests)
- [x] All entities have type definitions (DebugLogEntry, DebugSession, AppMetadata, MenuState in T002)
- [x] All tests come before implementation (T004-T016 before T017-T042)
- [x] Parallel tasks truly independent (verified file paths)
- [x] Each task specifies exact file path (all paths absolute or src-relative)
- [x] No task modifies same file as another [P] task (checked dependencies)
- [x] All quickstart scenarios covered by E2E tests (T012-T014 map to 12 scenarios)
- [x] Accessibility testing automated (T015, T041)
- [x] Performance regression testing included (T016, T042)
- [x] Constitutional compliance verified (TDD, TypeScript strict, WCAG 2.1 AA, Cypress E2E)

---

**Total Tasks**: 42
**Estimated Completion**: 35-40 hours (assumes 1 task = ~1 hour avg)
**Ready for execution**: After user approval of plan.md and tasks.md
