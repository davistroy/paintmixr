# Component Contracts: Hamburger Navigation Menu

**Feature**: 009-add-hamburger-menu
**Date**: 2025-10-05

## Overview
This document defines the component interfaces and contracts for the hamburger navigation menu feature. All components follow React TypeScript patterns with strict prop validation.

---

## 1. HamburgerMenu Component

**Purpose**: Main navigation menu with hamburger icon trigger

**Props**:
```typescript
interface HamburgerMenuProps {
  className?: string; // Optional Tailwind classes for positioning
}
```

**State**:
```typescript
{
  isOpen: boolean; // Menu dropdown open/closed
  isDebugModeEnabled: boolean; // Debug Mode toggle state
}
```

**Contract**:
- ✅ MUST render hamburger icon in top-right corner (FR-001)
- ✅ MUST hide icon when modals are open (FR-001)
- ✅ MUST open menu on icon click, showing 4 options (FR-002)
- ✅ MUST close menu on: item click, outside click, ESC key (FR-012)
- ✅ MUST animate open/close within 200ms (NFR-001)
- ✅ MUST respect `prefers-reduced-motion` (NFR-001)
- ✅ MUST have 44px minimum tap target (NFR-005)
- ✅ MUST support keyboard navigation (Tab, Enter, Escape) (FR-013)
- ✅ MUST have proper ARIA labels (FR-013)

**Events Emitted**:
- `onSessionHistoryClick`: () => void - Navigate to /sessions
- `onDebugModeToggle`: (enabled: boolean) => void - Toggle debug mode
- `onAboutClick`: () => void - Open About dialog
- `onLogoutClick`: () => void - Initiate logout flow

**Accessibility**:
```typescript
// Required ARIA attributes
<button
  aria-label="Open navigation menu"
  aria-expanded={isOpen}
  aria-haspopup="menu"
>
  <HamburgerIcon />
</button>
```

**Test Scenarios**:
1. Renders hamburger icon on mount
2. Opens menu on click
3. Closes menu on outside click
4. Closes menu on ESC key press
5. Hides icon when modal opens
6. Shows icon when modal closes
7. Keyboard navigation cycles through 4 menu items
8. Animation completes within 200ms (performance test)

---

## 2. DebugConsole Component

**Purpose**: Displays last 10 debug log entries with scrolling and controls

**Props**:
```typescript
interface DebugConsoleProps {
  isVisible: boolean; // Controlled by Debug Mode toggle
  onClose?: () => void; // Optional close button handler
  className?: string;
}
```

**State**:
```typescript
{
  wrapText: boolean; // Text wrapping toggle (default: false)
}
```

**Contract**:
- ✅ MUST display last 10 log entries when visible (FR-005)
- ✅ MUST auto-scroll to newest entry (FR-006)
- ✅ MUST show horizontal scroll by default for long messages (FR-005)
- ✅ MUST provide "Wrap Text" checkbox toggle (FR-005)
- ✅ MUST render "Download Logs" button (FR-009)
- ✅ MUST disable "Download Logs" when no logs exist (FR-009)
- ✅ MUST handle 10-50 events/sec without UI lag (NFR-002)
- ✅ MUST position at bottom of page (below main content)

**Events Emitted**:
- `onDownloadLogs`: () => void - Trigger log file download

**Accessibility**:
```typescript
<div
  role="log"
  aria-live="polite"
  aria-label="Debug console"
>
  {/* Log entries */}
</div>
```

**Performance**:
- Use `React.memo` to prevent unnecessary re-renders
- Debounce entry updates to 100ms batch window
- Virtualize log list if > 10 entries visible (future enhancement)

**Test Scenarios**:
1. Renders 10 most recent entries
2. Auto-scrolls when new entry added
3. Toggles text wrapping on checkbox change
4. Disables download button when entries array empty
5. Enables download button when entries exist
6. Handles 50 events/sec without dropping frames (performance test)
7. Screen reader announces new log entries (accessibility test)

---

## 3. AboutDialog Component

**Purpose**: Displays application metadata in modal dialog

**Props**:
```typescript
interface AboutDialogProps {
  isOpen: boolean; // Controlled by parent
  onClose: () => void;
  metadata: AppMetadata; // Injected app metadata
}

interface AppMetadata {
  version: string;
  releaseDate: string;
  developers: string[];
  githubUrl: string;
}
```

**Contract**:
- ✅ MUST display all 4 metadata fields (FR-010)
- ✅ MUST render as modal dialog (blocks background interaction)
- ✅ MUST close on: close button click, outside click, ESC key
- ✅ MUST make GitHub URL clickable link (opens in new tab)
- ✅ MUST have accessible close button (ARIA label)

**Accessibility**:
```typescript
<Dialog
  open={isOpen}
  onOpenChange={onClose}
  aria-labelledby="about-dialog-title"
>
  <DialogTitle id="about-dialog-title">About PaintMixr</DialogTitle>
  {/* Content */}
</Dialog>
```

**Test Scenarios**:
1. Renders all metadata fields correctly
2. Closes on close button click
3. Closes on ESC key press
4. GitHub URL opens in new tab
5. Focus traps within dialog when open (accessibility test)

---

## 4. DebugContext Provider

**Purpose**: Global state provider for debug logging system

**Props**:
```typescript
interface DebugProviderProps {
  children: React.ReactNode;
}
```

**Context Value**:
```typescript
interface DebugContextValue {
  isEnabled: boolean; // Debug Mode on/off
  entries: DebugLogEntry[]; // All captured logs
  visibleEntries: DebugLogEntry[]; // Last 10 entries
  totalSize: number; // Current buffer size in bytes

  // Actions
  enableDebugMode: () => void;
  disableDebugMode: () => void;
  log: (level: LogLevel, category: LogCategory, message: string, metadata?: Record<string, unknown>) => void;
  downloadLogs: () => void;
  clearLogs: () => void;
}
```

**Contract**:
- ✅ MUST store logs in-memory only (FR-008)
- ✅ MUST enforce 5MB FIFO limit (FR-008)
- ✅ MUST reset state on Debug Mode disable (FR-004)
- ✅ MUST capture all event types when enabled (FR-007)
- ✅ MUST generate plain text file on download (NFR-003)

**Internal State**:
```typescript
{
  session: DebugSession | null;
  circularBuffer: CircularBuffer; // 5MB FIFO buffer
}
```

**Test Scenarios**:
1. Enables debug mode and creates new session
2. Disables debug mode and clears session
3. Logs entry and adds to buffer
4. Removes oldest entry when exceeds 5MB
5. Returns last 10 entries for UI
6. Downloads logs as .txt file
7. Session resets on page refresh (integration test)

---

## 5. LogoutButton Component

**Purpose**: Handles Supabase Auth signOut and redirect

**Props**:
```typescript
interface LogoutButtonProps {
  onLogoutStart?: () => void; // Optional pre-logout callback
  onLogoutComplete?: () => void; // Optional post-logout callback
  className?: string;
}
```

**Contract**:
- ✅ MUST call `supabase.auth.signOut()` (FR-011)
- ✅ MUST redirect to `/auth/signin` after signOut (FR-011)
- ✅ MUST handle network errors gracefully (still redirect)
- ✅ MUST show loading state during async operation

**Flow**:
```
1. User clicks Logout button
2. onLogoutStart() callback (if provided)
3. supabase.auth.signOut() async call
4. onLogoutComplete() callback (if provided)
5. router.push('/auth/signin')
6. Page navigation clears all React state
```

**Test Scenarios**:
1. Calls signOut on button click
2. Redirects to /auth/signin after signOut
3. Redirects even if signOut fails (network error)
4. Shows loading spinner during async call
5. Clears Supabase session cookie (integration test)

---

## 6. ModalContext Provider

**Purpose**: Global state tracking for modal open/closed status

**Props**:
```typescript
interface ModalProviderProps {
  children: React.ReactNode;
}
```

**Context Value**:
```typescript
interface ModalContextValue {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}
```

**Contract**:
- ✅ MUST track global modal state (any modal open = true)
- ✅ MUST integrate with shadcn/ui Dialog `onOpenChange`
- ✅ MUST trigger HamburgerMenu hide when true

**Usage Pattern**:
```typescript
// In AboutDialog component
const { openModal, closeModal } = useModalContext();

<Dialog
  open={isOpen}
  onOpenChange={(open) => {
    if (open) openModal();
    else closeModal();
  }}
>
```

**Test Scenarios**:
1. Sets isModalOpen=true when modal opens
2. Sets isModalOpen=false when modal closes
3. HamburgerMenu hides when isModalOpen=true (integration test)

---

## Component Hierarchy

```
<ModalProvider>
  <DebugProvider>
    <App>
      <HamburgerMenu>
        ├── Session History (link to /sessions)
        ├── Debug Mode (toggle)
        ├── About (opens dialog)
        └── Logout (auth action)
      </HamburgerMenu>

      {/* Conditionally rendered based on DebugContext */}
      <DebugConsole
        isVisible={isDebugModeEnabled}
        onDownloadLogs={downloadLogs}
      />

      {/* Conditionally rendered based on local state */}
      <AboutDialog
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
        metadata={APP_METADATA}
      />
    </App>
  </DebugProvider>
</ModalProvider>
```

---

## Shared Utilities

### useDebugLog Hook
```typescript
export function useDebugLog() {
  const { log, isEnabled } = useDebugContext();

  useEffect(() => {
    if (!isEnabled) return;

    // Auto-intercept fetch for API call logging
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      log('info', 'api', `Fetch: ${args[0]}`);
      const result = await originalFetch(...args);
      log('info', 'api', `Response: ${result.status}`);
      return result;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [isEnabled, log]);

  return { log };
}
```

### useModalDetection Hook
```typescript
export function useModalDetection() {
  const { isModalOpen } = useModalContext();
  return { isModalOpen };
}
```

---

## Testing Strategy

### Unit Tests (Jest + React Testing Library)
- Component rendering with various props
- Event handler invocations
- State transitions
- ARIA attribute presence

### Integration Tests (Jest)
- Context provider interactions
- Multi-component workflows (open menu → click Debug Mode → see console)
- Modal state affecting menu visibility

### E2E Tests (Cypress)
- Full user flows (Acceptance Scenarios from spec.md)
- Accessibility testing (axe-core)
- Performance testing (animation timing, log throughput)

### Performance Tests
- Debug console handles 50 events/sec without lag
- Menu animation completes within 200ms
- Circular buffer FIFO removal under 1ms

---

## Accessibility Requirements

All components MUST meet WCAG 2.1 AA standards:

1. **Keyboard Navigation**: Tab, Enter, Escape support
2. **Screen Reader Support**: Proper ARIA roles and labels
3. **Color Contrast**: ≥4.5:1 for all text
4. **Focus Indicators**: Visible focus rings on all interactive elements
5. **Motion Sensitivity**: Respect `prefers-reduced-motion`
6. **Touch Targets**: Minimum 44x44px for mobile

---

## File Locations (Implementation Phase)

```
src/
├── components/
│   ├── HamburgerMenu.tsx
│   ├── DebugConsole.tsx
│   ├── AboutDialog.tsx
│   └── LogoutButton.tsx
├── contexts/
│   ├── DebugContext.tsx
│   └── ModalContext.tsx
├── hooks/
│   ├── useDebugLog.ts
│   └── useModalDetection.ts
└── lib/
    ├── debug/
    │   ├── circular-buffer.ts
    │   ├── log-formatter.ts
    │   └── event-interceptors.ts
    └── config/
        └── app-metadata.ts
```
