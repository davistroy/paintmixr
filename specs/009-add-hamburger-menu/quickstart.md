# Quickstart: Hamburger Navigation Menu

**Feature**: 009-add-hamburger-menu
**Date**: 2025-10-05
**Purpose**: Integration test scenarios validating all user-facing functionality

## Prerequisites

1. **Environment Setup**:
   ```bash
   npm install
   npm run dev  # Start Next.js dev server
   ```

2. **Test Data**:
   - Authenticated user session (sign in via /auth/signin)
   - Supabase connection active
   - package.json contains valid version and repository fields

3. **Browser Requirements**:
   - Chrome/Firefox/Safari (latest versions)
   - JavaScript enabled
   - Network access for Supabase auth

---

## Scenario 1: Menu Open/Close Interaction

**Goal**: Verify hamburger menu basic functionality

**Steps**:
1. Navigate to any authenticated page (e.g., `/`)
2. Locate hamburger icon in top-right corner (3 horizontal lines icon)
3. **Action**: Click hamburger icon
4. **Verify**: Menu dropdown appears showing 4 items:
   - Session History
   - Debug Mode (with toggle/checkbox)
   - About
   - Logout
5. **Action**: Click outside the menu (on page background)
6. **Verify**: Menu closes
7. **Action**: Click hamburger icon again to re-open
8. **Verify**: Menu opens
9. **Action**: Press `ESC` key
10. **Verify**: Menu closes

**Expected Results**:
- ✅ Menu opens within 200ms (smooth slide/fade animation)
- ✅ Menu closes within 200ms
- ✅ Animation respects `prefers-reduced-motion` setting
- ✅ Hamburger icon has minimum 44px tap target on mobile

**Failure Cases**:
- ❌ Menu doesn't appear → Check component rendering
- ❌ Animation too slow → Check CSS transition duration
- ❌ ESC key doesn't close → Check keyboard event handler

---

## Scenario 2: Session History Navigation

**Goal**: Verify navigation to Session History page

**Steps**:
1. Open hamburger menu (click icon)
2. **Action**: Click "Session History" menu item
3. **Verify**: Menu closes immediately
4. **Verify**: Browser navigates to `/sessions` route
   - If route exists: Session History page loads
   - If route doesn't exist: "Coming soon" toast appears (fallback behavior)

**Expected Results**:
- ✅ Menu closes on item click
- ✅ Navigation completes within 500ms
- ✅ URL changes to `/sessions`

**Failure Cases**:
- ❌ Navigation fails → Check Next.js router integration
- ❌ Menu stays open → Check `onItemClick` handler

---

## Scenario 3: Debug Mode Activation & Logging

**Goal**: Verify debug console appears and captures events

**Steps**:
1. Open hamburger menu
2. **Action**: Click "Debug Mode" toggle (or checkbox)
3. **Verify**: Debug console appears at bottom of page
4. **Verify**: Console shows header: "Debug Console" with "Wrap Text" checkbox and "Download Logs" button
5. **Perform user actions**:
   - Click a button on the page
   - Submit a form
   - Trigger an API call (e.g., save a session)
6. **Verify**: Debug console displays log entries in format:
   ```
   [timestamp] [level] category: message
   ```
7. **Verify**: Console auto-scrolls to show newest 10 entries
8. **Action**: Toggle "Wrap Text" checkbox ON
9. **Verify**: Long log messages wrap to multiple lines
10. **Action**: Toggle "Wrap Text" checkbox OFF
11. **Verify**: Long messages show horizontal scroll

**Expected Results**:
- ✅ Console appears within 100ms of toggle
- ✅ Logs capture API calls, user interactions, state changes
- ✅ Auto-scroll keeps newest entry visible
- ✅ Text wrapping toggles work correctly
- ✅ No UI lag when logging 10-50 events/sec

**Failure Cases**:
- ❌ Console doesn't appear → Check DebugContext provider
- ❌ No logs captured → Check event interceptors (fetch, click listeners)
- ❌ UI lags during logging → Check debouncing/throttling

---

## Scenario 4: Log Download

**Goal**: Verify debug logs download as plain text file

**Steps**:
1. Enable Debug Mode (see Scenario 3)
2. Generate at least 20 log entries (perform various actions)
3. **Verify**: "Download Logs" button is **enabled**
4. **Action**: Click "Download Logs" button
5. **Verify**: Browser downloads file named `paintmixr-debug-{sessionId}.txt`
6. **Action**: Open downloaded file in text editor
7. **Verify**: File contains all log entries in plain text format:
   ```
   2025-10-05T10:30:15.123Z [info] api: Fetch: /api/sessions
   2025-10-05T10:30:15.456Z [info] user: Click: button#save-session
   2025-10-05T10:30:16.789Z [warn] state: Session state updated
   ```
8. **Action**: Disable Debug Mode (toggle off)
9. **Action**: Re-enable Debug Mode
10. **Verify**: "Download Logs" button is **disabled** (no logs exist in new session)

**Expected Results**:
- ✅ File downloads successfully
- ✅ File contains all entries (not just visible 10)
- ✅ Timestamps are ISO 8601 format
- ✅ Button disabled when no logs exist

**Failure Cases**:
- ❌ Download fails → Check Blob creation and download trigger
- ❌ File contains < 20 entries → Check FIFO buffer serialization
- ❌ Button enabled when empty → Check `entries.length > 0` condition

---

## Scenario 5: Debug Mode Toggle Off (Clear Logs)

**Goal**: Verify logs clear when Debug Mode disabled

**Steps**:
1. Enable Debug Mode
2. Generate 10+ log entries
3. **Verify**: Debug console shows entries
4. **Action**: Open hamburger menu and toggle Debug Mode OFF
5. **Verify**: Debug console disappears from page
6. **Action**: Toggle Debug Mode ON again
7. **Verify**: Debug console appears **empty** (no previous entries)

**Expected Results**:
- ✅ Logs cleared immediately on toggle off
- ✅ New session starts fresh with empty buffer

**Failure Cases**:
- ❌ Logs persist after toggle off → Check `clearLogs()` in DebugContext

---

## Scenario 6: FIFO Log Rotation (5MB Limit)

**Goal**: Verify oldest logs removed when exceeding 5MB

**Steps**:
1. Enable Debug Mode
2. **Generate large volume of logs** (simulate via script):
   ```typescript
   // In browser console
   for (let i = 0; i < 20000; i++) {
     debugContext.log('info', 'api', `Test log entry ${i}`, { data: 'x'.repeat(200) });
   }
   ```
3. **Verify**: Total buffer size stays ≤ 5MB (check DevTools memory)
4. **Verify**: Oldest entries (log 0, 1, 2...) no longer in buffer
5. **Verify**: Newest entries still present
6. **Action**: Download logs
7. **Verify**: File size ≤ 5MB

**Expected Results**:
- ✅ Buffer removes oldest entries when exceeds 5MB
- ✅ No memory leaks (use Chrome DevTools Heap Snapshot)
- ✅ FIFO order maintained

**Failure Cases**:
- ❌ Memory exceeds 5MB → Check `CircularBuffer.push()` FIFO logic
- ❌ Newest entries missing → FIFO removing wrong end of array

---

## Scenario 7: About Dialog

**Goal**: Verify About dialog displays metadata correctly

**Steps**:
1. Open hamburger menu
2. **Action**: Click "About" menu item
3. **Verify**: Modal dialog opens with title "About PaintMixr"
4. **Verify**: Dialog displays all 4 fields:
   - **Version**: Matches package.json version (e.g., "1.2.3")
   - **Release Date**: ISO date string (e.g., "2025-10-05")
   - **Developers**: List of names (e.g., "Your Name")
   - **GitHub**: Clickable link (e.g., "https://github.com/user/paintmixr")
5. **Action**: Click GitHub link
6. **Verify**: Link opens in **new tab** (target="_blank")
7. **Action**: Press `ESC` key
8. **Verify**: Dialog closes
9. **Action**: Re-open About dialog and click outside dialog
10. **Verify**: Dialog closes

**Expected Results**:
- ✅ All metadata fields render correctly
- ✅ GitHub link is clickable and opens in new tab
- ✅ Dialog closes on ESC and outside click
- ✅ Hamburger menu is hidden while dialog is open

**Failure Cases**:
- ❌ Version shows "Unknown" → Check package.json import
- ❌ GitHub link 404s → Check repository URL in package.json
- ❌ Dialog doesn't close → Check `onOpenChange` handler

---

## Scenario 8: Logout Flow

**Goal**: Verify logout terminates session and redirects

**Steps**:
1. Ensure user is signed in (check for auth cookie)
2. Open hamburger menu
3. **Action**: Click "Logout" menu item
4. **Verify**: Loading spinner appears briefly
5. **Verify**: Browser redirects to `/auth/signin`
6. **Verify**: User is signed out (no auth cookie)
7. **Action**: Navigate to protected page (e.g., `/`)
8. **Verify**: Redirected back to `/auth/signin` (session invalid)

**Expected Results**:
- ✅ `supabase.auth.signOut()` called
- ✅ Session cookie cleared
- ✅ Redirect to signin page within 1 second
- ✅ Protected routes inaccessible after logout

**Failure Cases**:
- ❌ Still signed in after logout → Check `signOut()` integration
- ❌ No redirect → Check `router.push()` after signOut
- ❌ Protected pages still accessible → Check Supabase middleware

---

## Scenario 9: Modal Interaction (Menu Hiding)

**Goal**: Verify hamburger menu hides when modal opens

**Steps**:
1. **Verify**: Hamburger icon visible in top-right corner
2. **Action**: Open About dialog (via menu)
3. **Verify**: Hamburger icon **disappears** while dialog is open
4. **Action**: Close About dialog (ESC or close button)
5. **Verify**: Hamburger icon **reappears**
6. **Action**: Open another modal (e.g., Save Session dialog)
7. **Verify**: Hamburger icon disappears again

**Expected Results**:
- ✅ Menu hides whenever any modal is open
- ✅ Menu reappears when all modals closed

**Failure Cases**:
- ❌ Menu still visible → Check ModalContext integration

---

## Scenario 10: Accessibility Validation

**Goal**: Verify WCAG 2.1 AA compliance

**Steps**:
1. **Keyboard Navigation**:
   - Press `Tab` to focus hamburger icon
   - Press `Enter` to open menu
   - Press `Tab` to cycle through 4 menu items
   - Press `Enter` on "About" to open dialog
   - Press `Tab` within dialog to navigate
   - Press `ESC` to close dialog
   - **Verify**: All interactions work without mouse

2. **Screen Reader** (use NVDA/JAWS/VoiceOver):
   - Focus hamburger icon
   - **Verify**: Announces "Open navigation menu, button"
   - Open menu
   - **Verify**: Announces "Menu expanded"
   - Navigate to Debug Mode item
   - **Verify**: Announces "Debug Mode, toggle"
   - Enable Debug Mode
   - **Verify**: Debug console announces new log entries (aria-live="polite")

3. **Color Contrast** (use browser DevTools):
   - Inspect all text in menu, console, dialog
   - **Verify**: Contrast ratio ≥ 4.5:1 for all text

4. **Motion Sensitivity**:
   - Enable `prefers-reduced-motion` in OS settings
   - Open/close menu
   - **Verify**: No animation (instant open/close)

**Expected Results**:
- ✅ Fully keyboard accessible
- ✅ Screen reader compatible
- ✅ Sufficient color contrast
- ✅ Respects motion preferences

**Failure Cases**:
- ❌ Tab navigation skips elements → Check `tabIndex` attributes
- ❌ Screen reader silent → Check ARIA labels/roles
- ❌ Low contrast → Adjust text colors in Tailwind config

---

## Scenario 11: Performance Validation

**Goal**: Verify performance meets NFRs

**Tests**:
1. **Menu Animation** (NFR-001: <200ms):
   - Open Chrome DevTools → Performance tab
   - Record performance
   - Open menu
   - Stop recording
   - **Verify**: Animation completes within 200ms

2. **Debug Console Throughput** (NFR-002: 10-50 events/sec):
   - Enable Debug Mode
   - Run stress test script:
     ```typescript
     const startTime = Date.now();
     for (let i = 0; i < 500; i++) {
       debugContext.log('info', 'api', `Event ${i}`);
     }
     const duration = Date.now() - startTime;
     console.log(`Logged 500 events in ${duration}ms`); // Should be < 10 seconds
     ```
   - **Verify**: No UI freezing during logging
   - **Verify**: Frame rate stays ≥ 30fps (use Performance monitor)

3. **Memory Leak Detection**:
   - Open Chrome DevTools → Memory tab
   - Take heap snapshot (Snapshot 1)
   - Enable/disable Debug Mode 100 times
   - Take heap snapshot (Snapshot 2)
   - **Verify**: Memory delta < 10MB (no leaks)

**Expected Results**:
- ✅ Menu animation: <200ms
- ✅ Debug logging: >10 events/sec
- ✅ No memory leaks

**Failure Cases**:
- ❌ Animation >200ms → Optimize CSS or reduce complexity
- ❌ UI lags during logging → Add throttling/debouncing
- ❌ Memory leaks → Check for unremoved event listeners

---

## Scenario 12: Mobile Responsiveness

**Goal**: Verify mobile device functionality

**Steps**:
1. Open browser DevTools → Device toolbar
2. Select mobile device (e.g., iPhone 12, Pixel 5)
3. **Verify**: Hamburger icon visible and properly positioned
4. **Action**: Tap hamburger icon (touch event)
5. **Verify**: Menu opens
6. **Measure**: Tap target size ≥ 44x44px (use DevTools ruler)
7. **Action**: Tap outside menu
8. **Verify**: Menu closes
9. **Enable Debug Mode**:
   - **Verify**: Debug console appears at bottom, doesn't overlap content
   - **Verify**: Text readable on small screen
   - **Action**: Scroll console horizontally (long messages)
   - **Verify**: Horizontal scroll works smoothly

**Expected Results**:
- ✅ All interactions work on touch devices
- ✅ Tap targets meet 44px minimum (NFR-005)
- ✅ Responsive layout (no horizontal overflow)

**Failure Cases**:
- ❌ Tap target too small → Increase button padding
- ❌ Console overlaps content → Adjust z-index/positioning

---

## Integration with Existing Features

### Feature 006 Compatibility (Session Save Toast)
- Verify: Debug Mode captures toast display events
- Verify: About dialog doesn't conflict with session dialogs
- Verify: Logout clears any active session state

### Feature 007 Compatibility (Enhanced Mode)
- Verify: Debug Mode logs optimization API calls (`/api/optimize`)
- Verify: Menu accessible during long-running optimizations (no blocking)

### Feature 004 Compatibility (Auth)
- Verify: Logout clears Supabase auth session
- Verify: Redirect to `/auth/signin` works correctly
- Verify: Menu only renders for authenticated users

---

## Automated Test Coverage

**Unit Tests** (Jest + React Testing Library):
- [ ] HamburgerMenu component rendering
- [ ] DebugConsole log display logic
- [ ] AboutDialog metadata rendering
- [ ] DebugContext state management
- [ ] CircularBuffer FIFO logic

**Integration Tests** (Jest):
- [ ] Menu → Debug Mode → Console flow
- [ ] Menu → About → Dialog → Close flow
- [ ] Menu → Logout → Redirect flow
- [ ] ModalContext hiding menu

**E2E Tests** (Cypress):
- [ ] Scenario 1: Menu open/close
- [ ] Scenario 2: Session History navigation
- [ ] Scenario 3: Debug Mode activation
- [ ] Scenario 4: Log download
- [ ] Scenario 7: About dialog
- [ ] Scenario 8: Logout flow
- [ ] Scenario 10: Accessibility (axe-core)
- [ ] Scenario 11: Performance (Lighthouse)

**Target Coverage**: ≥90% for all components (lines, branches, functions)

---

## Success Criteria

All scenarios PASS when:
1. ✅ All 12 scenarios execute without failures
2. ✅ Automated test suite passes (unit + integration + E2E)
3. ✅ Accessibility audit passes (axe-core, Lighthouse)
4. ✅ Performance benchmarks met (NFR-001, NFR-002)
5. ✅ No console errors during normal usage
6. ✅ Works on Chrome, Firefox, Safari (latest versions)
7. ✅ Works on mobile (iOS Safari, Chrome Mobile)

**Ready for production when all criteria met.**
