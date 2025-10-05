# Project Cleanup Recommendations

**Date**: 2025-10-05
**Status**: Post Feature 008/009 Deployment

## ✅ Completed Cleanup (2025-10-05)

### Files Moved to `/junk` Directory

All temporary investigation reports, test scripts, and build artifacts have been moved to the `/junk` folder for eventual deletion.

#### Root-Level Reports (33 files → `junk/root-reports/`)
- API_ERROR_400_FIX_REPORT.md
- AUTHORIZATION-STATUS.md
- CODEBASE_ANALYSIS_REPORT.md
- COMPONENT_REFACTORING_REPORT.md
- COMPREHENSIVE_E2E_TEST_REPORT.md
- DEPLOYMENT_VERIFICATION_COMPLETE.md
- E2E_TESTING_REPORT.md
- ENHANCED_ACCURACY_MODE_TEST_REPORT.md
- FEATURE_005_COMPLETION_REPORT.md
- FINAL_COMPLETION_REPORT.md
- IMPLEMENTATION_COMPLETE.md
- IMPLEMENTATION_STATUS.md
- IMPLEMENTATION_SUMMARY.md
- IMPLEMENTATION_VERIFIED.md
- MANUAL_TASKS.md
- MIGRATION_REPORT.md
- MIGRATION_REPORT_T058-T059.md
- NEXT_JS_ERROR_DIAGNOSTIC.md
- OAUTH_FIX_SUMMARY.md
- PHASE1_COMPLETE.md
- PHASE2_COMPLETE.md
- PHASE2_ENV_COMMANDS.md
- PRODUCTION_TEST_RESULTS.md
- SECURITY-ISSUE-UNAUTHORIZED-SAVES.md
- SESSION_SAVE_FIX.md
- T011-COMPLETION-SUMMARY.md
- T041-T042-FINAL-REPORT.md
- T041-T042-MIGRATION-SUMMARY.md
- T041-T042-STATUS.txt
- T072-T073-TEST-RESULTS-REPORT.md
- TECHNICAL_DEBT.md
- TEST_RESULTS_SUMMARY.txt
- TEST_VALIDATION_REPORT.md
- VERCEL_TEST.md

#### Test Results (`junk/test-results/`)
- enhanced-mode-success.png
- session-save-toast-issue-final-2025-10-05.md
- production-testing-results-2025-10-05.md
- toast-issue-investigation-2025-10-05.md
- feature-008-completion-report-2025-10-05.md
- production-test-2025-10-04.md
- comprehensive-test-plan-2025-10-04.md
- e2e-auth-fix-2025-10-05.md
- e2e-auth-fix-summary-2025-10-05.md

#### Scripts (`junk/scripts/`)
- test-enhanced-mode.sh
- test-production.sh
- fix-syntax.py
- artillery-auth-load.yml

#### Build Artifacts (`junk/build-artifacts/`)
- strict-mode-errors.txt
- strict-mode-errors-2.txt
- test-output.txt
- tsconfig.tsbuildinfo
- package-minimal.json

#### Archived Specs (`junk/archived-specs/`)
- specs/004-add-email-add/IMPLEMENTATION_SUMMARY.md
- specs/008-cleanup-using-the/IMPLEMENTATION_SUMMARY.md
- specs/005-use-codebase-analysis/T064-T066_COMPLETION_SUMMARY.md
- user_info/ directory (sample data)

### Remaining Root Files (Clean)

Only essential configuration and documentation remains:

```
CLAUDE.md                 ← Project instructions for Claude Code
DEPLOYMENT.md             ← Deployment documentation
README.md                 ← Project README
cypress.config.ts         ← E2E test configuration
jest.config.js            ← Unit test configuration
jest.setup.js             ← Test environment setup
next-env.d.ts             ← Next.js TypeScript definitions
next.config.js            ← Next.js configuration
package-lock.json         ← Dependency lockfile
package.json              ← Package manifest
postcss.config.js         ← PostCSS configuration
tailwind.config.js        ← Tailwind CSS configuration
tsconfig.json             ← TypeScript configuration
vercel.json               ← Vercel deployment configuration
```

## 🔍 Recommended Additional Cleanup

### 1. Delete Junk Folder (After Verification)

**Timeline**: After Feature 010+ is stable
**Command**: `rm -rf junk/`

**Prerequisites**:
1. ✅ Verify all important information is captured in CLAUDE.md
2. ✅ Confirm no active features reference junk files
3. ✅ Take final backup if uncertain

### 2. Consolidate Specification Documents

**Current State**: 9 feature directories in `specs/`

**Recommendations**:
- Archive completed features (001-006) to `specs/archive/` after Feature 010+
- Keep only active/recent features (007-009) in root `specs/`
- Maintain CLAUDE.md as single source of truth for recent decisions

**Proposed Structure**:
```
specs/
├── archive/
│   ├── 001-i-want-to/
│   ├── 002-improve-app-accuracy/
│   ├── 003-deploy-to-vercel/
│   ├── 004-add-email-add/
│   ├── 005-use-codebase-analysis/
│   └── 006-fix-issues-fix/
├── 007-enhanced-mode-1/
├── 008-cleanup-using-the/
└── 009-add-hamburger-menu/
```

### 3. Clean Up Test Baselines

**Files**: `__tests__/tmp/*.json` (6 baseline files)

**Action**: Review and update baselines after major refactors
- `test-quality-baseline.json` - Update after test suite changes
- `build-metrics.json` - Update after build optimizations
- `component-size-baseline.json` - Update after component refactors
- `placeholder-report.json` - Delete if no longer needed
- `bundle-size-baseline.json` - Update after dependency changes
- `shared-utilities-baseline.json` - Update after utility refactors

### 4. Reduce CLAUDE.md Size

**Current**: 23,838 bytes (manageable but growing)

**Recommendations**:
- Move constitutional updates to `.specify/memory/constitution.md`
- Archive Feature 004-006 technical decisions to `specs/archive/TECHNICAL-DECISIONS.md`
- Keep only Features 007-009 in "Recent Technical Decisions"
- Use `update-agent-context.sh` script to maintain <150 lines

### 5. Clean Up Cypress Support Files

**Files to Review**:
- `cypress/support/auth-pattern-guide.md` - Move to `docs/testing/` if still relevant
- Consolidate E2E test patterns into single guide

### 6. Remove Obsolete Dependencies (Future)

**After Stabilization**:
1. Run `npm outdated` to check for updates
2. Run `npx depcheck` to find unused dependencies
3. Consider removing development-only packages if not actively used

### 7. Git Cleanup

**After junk folder deletion**:
```bash
# Add junk/ to .gitignore (already done)
echo "junk/" >> .gitignore

# Remove from git history (optional, after verification)
git rm -r junk/
git commit -m "chore: Remove temporary investigation files"
```

### 8. Documentation Consolidation

**Current Locations**:
- Root: CLAUDE.md, DEPLOYMENT.md, README.md
- `.specify/memory/`: constitution.md
- `docs/`: admin-user-creation.md, api/enhanced-accuracy-endpoints.md
- `cypress/support/`: auth-pattern-guide.md

**Recommendation**: Create `docs/` structure:
```
docs/
├── README.md                    ← Index of all documentation
├── deployment/
│   └── DEPLOYMENT.md            ← Move from root
├── development/
│   ├── CLAUDE.md                ← Symlink from root
│   └── constitution.md          ← Link from .specify/
├── api/
│   └── enhanced-accuracy-endpoints.md
├── testing/
│   ├── cypress-patterns.md      ← From cypress/support/
│   └── test-baselines.md        ← Document baseline files
└── admin/
    └── user-creation.md
```

## 📊 Impact Summary

### Before Cleanup
- **Root files**: 53 files
- **Documentation scattered**: 5+ locations
- **Temporary reports**: 33+ files in root

### After Cleanup
- **Root files**: 14 files (74% reduction)
- **Organized junk**: All temporary files in `junk/`
- **Clean structure**: Only essential configs in root

## 🎯 Next Actions

### Immediate (Now)
1. ✅ Review junk folder contents
2. ✅ Verify no active features reference moved files
3. ⏭️ Commit cleanup changes

### Short-Term (After Feature 010)
1. Delete `junk/` folder entirely
2. Archive old specs (001-006) to `specs/archive/`
3. Update test baselines

### Long-Term (After Feature 012+)
1. Consolidate documentation to `docs/` structure
2. Run dependency audit
3. Establish maintenance schedule for baselines

---

**Last Updated**: 2025-10-05
**Next Review**: After Feature 010 completion
