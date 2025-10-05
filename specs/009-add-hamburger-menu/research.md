# Research: Hamburger Navigation Menu

**Feature**: 009-add-hamburger-menu
**Date**: 2025-10-05
**Phase**: 0 - Technical Research

## Overview
This document captures technical research for implementing a hamburger navigation menu with four menu options: Session History, Debug Mode (with comprehensive logging), About dialog, and Logout functionality.

## Research Areas

### 1. Menu Component Library Selection

**Decision**: Use Radix UI DropdownMenu primitive via shadcn/ui

**Rationale**:
- Already in tech stack (CLAUDE.md references Radix UI + Tailwind CSS)
- Provides accessible menu patterns out-of-box (ARIA roles, keyboard navigation)
- shadcn/ui provides pre-styled components matching existing design system
- Supports animations with CSS transitions (meets NFR-001: <200ms animation)
- Handles click-outside and ESC key behavior (FR-012)

**Alternatives Considered**:
- **Headless UI**: Good accessibility, but would require manual Tailwind styling (more work than shadcn/ui)
- **Custom implementation**: Maximum control but risks accessibility gaps and higher maintenance
- **Material UI**: Heavier bundle size, different design language than existing Tailwind setup

**Implementation Notes**:
- Install via `npx shadcn@latest add dropdown-menu`
- Use `DropdownMenu.Trigger` for hamburger icon
- Use `DropdownMenu.Content` for menu items
- Integrate with existing modal detection for FR-001 (hide when modals open)

### 2. Debug Console Architecture

**Decision**: In-memory circular buffer with React Context for global state

**Rationale**:
- Meets FR-008: 5MB limit with FIFO rotation without external dependencies
- React Context provides global access for all app components to log events
- Circular buffer prevents memory leaks during long sessions
- Session-only storage aligns with clarification (no persistence required)

**Alternatives Considered**:
- **localStorage**: Considered but rejected per clarification (in-memory only)
- **IndexedDB**: Overkill for ephemeral session data
- **Server-side logging**: Adds network latency, requires backend changes, fails for offline scenarios

**Implementation Pattern**:
```typescript
// src/contexts/DebugContext.tsx
interface DebugLogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: 'api' | 'user' | 'state' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
}

class CircularBuffer {
  private buffer: DebugLogEntry[];
  private maxSize: number; // ~17,000 entries for 5MB (300 bytes/entry)

  push(entry: DebugLogEntry): void {
    if (this.getSize() >= 5MB) {
      this.buffer.shift(); // FIFO removal
    }
    this.buffer.push(entry);
  }
}
```

**Performance Considerations**:
- Byte-size estimation per entry: ~300 bytes (timestamp + level + category + message + overhead)
- 5MB ÷ 300 bytes ≈ 17,000 entries capacity
- Use `useMemo` to avoid recalculating buffer size on every render
- Debounce UI updates to 100ms for high-frequency logging (NFR-002: 10-50 events/sec)

### 3. Event Interception Strategy

**Decision**: Higher-order component (HOC) + React hooks for automatic logging

**Rationale**:
- Centralized logging logic reduces duplication across components
- HOC pattern allows wrapping existing components without modification
- Custom hooks (useDebugLog) provide manual logging API for edge cases
- Meets FR-007: capture API calls, user interactions, state changes, errors

**Implementation Approach**:
```typescript
// src/lib/debug/hooks.ts
export function useDebugLog() {
  const { log, isEnabled } = useDebugContext();

  // Intercept fetch for API calls
  useEffect(() => {
    if (!isEnabled) return;
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      log('api', `Fetch: ${args[0]}`);
      return originalFetch(...args);
    };
  }, [isEnabled]);

  return { log };
}

// Wrap components for user interaction logging
export function withDebugLogging<P>(Component: React.FC<P>) {
  return (props: P) => {
    const { log, isEnabled } = useDebugContext();

    return (
      <div onClick={isEnabled ? (e) => log('user', `Click: ${e.target}`) : undefined}>
        <Component {...props} />
      </div>
    );
  };
}
```

**Alternatives Considered**:
- **Proxy-based interception**: More comprehensive but risks breaking third-party libraries
- **Manual logging calls**: Tedious, error-prone, inconsistent coverage
- **Browser DevTools Protocol**: Over-engineered for this use case

### 4. About Dialog Content Source

**Decision**: Static package.json metadata + Supabase config for GitHub URL

**Rationale**:
- Version number: Read from `package.json` version field (single source of truth)
- Release date: Use `package.json` or environment variable set during build
- Developer credits: Hardcoded in component (unlikely to change frequently)
- GitHub repository: Read from `package.json` repository field or environment variable

**Implementation Notes**:
```typescript
// src/lib/config/app-metadata.ts
import packageJson from '../../../package.json';

export const APP_METADATA = {
  version: packageJson.version,
  releaseDate: process.env.NEXT_PUBLIC_RELEASE_DATE || 'Unknown',
  developers: ['Your Name'], // Hardcoded
  githubUrl: packageJson.repository?.url || process.env.NEXT_PUBLIC_GITHUB_URL,
};
```

**Alternatives Considered**:
- **Supabase table**: Overkill for static metadata that changes with releases
- **Hardcoded strings**: No single source of truth, manual updates prone to errors
- **Build-time code generation**: Adds complexity without clear benefit

### 5. Logout Flow Integration

**Decision**: Use existing Supabase Auth signOut method with client-side redirect

**Rationale**:
- Aligns with existing auth architecture (CLAUDE.md references Supabase Auth)
- `supabase.auth.signOut()` handles token invalidation server-side
- Client-side redirect to `/auth/signin` maintains consistency with existing auth flow
- No new API routes required (leverages existing session management)

**Implementation Pattern**:
```typescript
// src/components/HamburgerMenu.tsx
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const handleLogout = async () => {
  const supabase = createClient();
  await supabase.auth.signOut();
  router.push('/auth/signin');
};
```

**Error Handling**:
- Network failure during signOut: Still redirect to signin page (session will be invalid on server)
- Race condition (concurrent signOut calls): Idempotent operation, safe to retry

### 6. Animation Performance

**Decision**: CSS transitions with prefers-reduced-motion support

**Rationale**:
- Native CSS transitions are GPU-accelerated (meets 60fps requirement)
- `prefers-reduced-motion` media query meets WCAG accessibility standards
- <200ms animation easily achievable with `transition-duration: 150ms`
- No JavaScript animation libraries needed (reduces bundle size)

**Implementation Pattern**:
```css
/* src/components/HamburgerMenu.module.css */
.menuContent {
  transition: opacity 150ms ease-in-out, transform 150ms ease-in-out;
  transform-origin: top right;
}

.menuContent[data-state="open"] {
  opacity: 1;
  transform: scale(1);
}

.menuContent[data-state="closed"] {
  opacity: 0;
  transform: scale(0.95);
}

@media (prefers-reduced-motion: reduce) {
  .menuContent {
    transition: none;
  }
}
```

**Performance Testing**:
- Use Chrome DevTools Performance panel to verify <200ms open/close
- Test on mobile devices (lower-powered CPUs) to ensure 60fps maintained

### 7. Modal Detection Strategy

**Decision**: React Context provider tracking modal state globally

**Rationale**:
- Centralized modal state prevents race conditions (multiple modals)
- Allows hamburger menu to reactively hide/show based on modal state
- Integrates with existing shadcn/ui Dialog components
- No DOM mutation observers needed (performance-friendly)

**Implementation Pattern**:
```typescript
// src/contexts/ModalContext.tsx
interface ModalContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

// HamburgerMenu component
const { isModalOpen } = useModalContext();
return !isModalOpen ? <HamburgerIcon /> : null;
```

**Alternatives Considered**:
- **CSS z-index layering**: Doesn't prevent interaction, only visual overlap
- **MutationObserver**: Performance overhead for DOM watching
- **Portal detection**: Fragile, depends on implementation details of modal libraries

### 8. Session History Navigation

**Decision**: Use Next.js App Router navigation to `/sessions` route

**Rationale**:
- Assumes existing or planned Sessions page at `/sessions` route
- Next.js `useRouter().push()` provides client-side navigation (no full page reload)
- If route doesn't exist yet, create placeholder page per Feature 006 pattern ("coming soon" toast)

**Implementation Note**:
```typescript
// src/components/HamburgerMenu.tsx
const router = useRouter();

const handleSessionHistory = () => {
  closeMenu();
  router.push('/sessions'); // Or show "coming soon" toast if not implemented
};
```

**Fallback Strategy**:
- If `/sessions` route not yet implemented, show toast: "Session history view coming soon"
- Aligns with existing UX pattern from Feature 006 (SessionCard onDetailClick)

## Technology Stack Summary

| Component | Technology | Justification |
|-----------|-----------|---------------|
| Menu Component | Radix UI DropdownMenu (shadcn/ui) | Accessibility, existing stack, minimal setup |
| Debug Storage | In-memory circular buffer | Session-scoped, FIFO rotation, no persistence needed |
| Logging Interception | HOC + React hooks | Centralized logic, automatic capture, minimal duplication |
| About Metadata | package.json + env vars | Single source of truth, build-time injection |
| Logout | Supabase Auth signOut | Existing auth integration, server-side token invalidation |
| Animation | CSS transitions | GPU-accelerated, prefers-reduced-motion support |
| Modal Detection | React Context | Global state, reactive updates, no DOM observers |
| Navigation | Next.js App Router | Existing routing system, client-side transitions |

## Open Questions (Resolved via Clarifications)
- ✅ Debug Mode persistence → Session-only (no localStorage)
- ✅ Log file format → Plain text (.txt)
- ✅ Log storage location → In-memory only
- ✅ Menu animation → Yes, with prefers-reduced-motion support
- ✅ Modal interaction → Hide menu when modals open
- ✅ Log rotation policy → 5MB FIFO

## Next Steps
Proceed to Phase 1: Design & Contracts
- Define DebugLogEntry interface in data-model.md
- Create component contracts for HamburgerMenu, DebugConsole, AboutDialog
- Generate quickstart integration scenarios
