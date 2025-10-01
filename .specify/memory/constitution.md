<!--
Sync Impact Report:
- Version change: 1.0.0 → 1.1.0
- Modified principles: Color Accuracy First (expanded validation requirements), Performance & Accessibility Standards (added E2E testing)
- Added sections: Real-World Testing & Validation (Principle VI), Production Standards
- Removed sections: none
- Templates requiring updates: ⚠ plan-template.md (Constitution Check), ⚠ tasks-template.md (E2E task types)
- Follow-up TODOs: none
-->

# Paint Mixer App Constitution

## Core Principles

### I. Color Accuracy First (NON-NEGOTIABLE)
All color-related calculations, displays, and user interfaces MUST prioritize color accuracy over convenience or speed. Delta E ≤ 4.0 commercial printing standard is the minimum acceptable accuracy for color matching. Color science calculations MUST use proper LAB color space conversions and CIE 2000 Delta E formulas with validated reference implementations. UI design MUST use neutral backgrounds (#FFFFFF for color swatches, neutral grays for interface) to prevent color contamination during evaluation. Paint database MUST include Kubelka-Munk coefficients (k and s values) for opacity and scattering simulation.

### II. Documentation Currency via Context7 MCP
All external library documentation, API references, and technical research MUST be obtained through the context7 MCP server to ensure latest information is used at all times. Development decisions based on documentation MUST verify currency through context7 before implementation. Cached or stale documentation sources are prohibited for making technical choices.

### III. Test-First Development (NON-NEGOTIABLE)
TDD mandatory for all color calculation algorithms and core functionality: Tests written → User approved → Tests fail → Then implement. Red-Green-Refactor cycle strictly enforced. Color accuracy tests MUST include reference implementations and known-good color conversion cases. Performance tests MUST verify sub-500ms response times for color calculations and include regression detection.

### IV. Type Safety & Validation
TypeScript strict mode enforced throughout with all compiler flags enabled (noImplicitAny, strictNullChecks, strictFunctionTypes, noImplicitReturns, noFallthroughCasesInSwitch). All user inputs MUST be validated with Zod schemas before processing. API contracts MUST be defined with TypeScript type generation and runtime validation. Color values MUST use validated ColorValue interface with proper hex and LAB representations including type guards.

### V. Performance & Accessibility Standards
Color calculations MUST complete within 500ms, image processing within 2 seconds, UI interactions at 60fps. Web Workers MUST be used for intensive calculations to prevent UI blocking. WCAG 2.1 AA accessibility standards MUST be met including color contrast ratios ≥4.5:1 for normal text and touch targets minimum 44px for mobile interfaces. Performance monitoring MUST be implemented with automated regression detection.

### VI. Real-World Testing & Validation
Cypress E2E testing MUST cover all critical user workflows including color matching, paint mixing, session management, and image processing. Accessibility testing MUST be automated with WCAG compliance verification. Performance regression testing MUST run on every build with established baselines. User authentication and data isolation MUST be verified through automated tests. All features MUST be validated against real-world paint mixing scenarios with physical verification where possible.

## Color Accuracy Standards

### Measurement Requirements
All color matching MUST achieve Delta E ≤ 4.0 (commercial printing standard) between target and achievable colors. Color conversions MUST preserve accuracy through proper XYZ intermediate space with D65 illuminant. Paint mixing algorithms MUST implement Kubelka-Munk theory for realistic opacity and scattering simulation with validated k and s coefficients.

### Display Standards
Color workspace backgrounds MUST use pure white (#FFFFFF) to prevent color contamination. Interface colors MUST use approved neutral palette with verified contrast ratios. Color accuracy indicators MUST provide clear visual feedback for Delta E values (≤2.0 = Excellent, ≤4.0 = Good, >4.0 = Poor) with consistent iconography and color coding.

### Database Standards
Paint color database MUST include LAB color space values, opacity values (0-1), tinting strength (0-1), and Kubelka-Munk coefficients. All paint data MUST be validated against manufacturer specifications where available. User-specific paint collections MUST be isolated through Row Level Security policies.

## Development Standards

### Technology Stack Compliance
MUST use Next.js 15+ with TypeScript, Supabase backend with Row Level Security, Radix UI components with Tailwind CSS. React Hook Form + Zod validation required for all forms. Image processing MUST use canvas-based utilities with Web Worker support. PWA capabilities MUST be implemented with manifest and offline functionality.

### Code Quality Gates
All code MUST pass TypeScript strict mode compilation with all flags enabled. ESLint and Prettier MUST be configured and passing. Supabase RLS policies MUST be implemented for all user data tables with automated testing. Environment variables MUST be validated with Zod schemas at startup.

### Performance Monitoring
Response time monitoring MUST be implemented for all color calculations with performance budgets enforced. Color accuracy metrics MUST be tracked and reported. User session data MUST include performance and accuracy metadata for continuous improvement. Memory usage MUST be monitored for leak detection in repeated calculations.

## Production Standards

### User Experience Requirements
Session management MUST support save/load functionality with favorites marking. Image color extraction MUST support multiple extraction methods (point, average, dominant). Real-time color preview MUST update within 100ms of user input changes. Offline functionality MUST cache user's paint collection and recent sessions.

### Security Requirements
User authentication MUST be handled through Supabase Auth with secure session management. All user data MUST be protected by Row Level Security policies verified through automated tests. Image uploads MUST be validated for type, size (≤10MB), and malicious content. API endpoints MUST implement rate limiting and input sanitization.

### Deployment Standards
Application MUST be PWA-compliant with offline capabilities and installability. Performance budgets MUST be enforced (Lighthouse scores ≥90 for Performance and Accessibility). Error boundary components MUST capture and report client-side errors. Database migrations MUST be versioned and tested in staging environment.

## Governance

Constitution supersedes all other development practices and style guides. All pull requests MUST verify constitutional compliance before merge. Complex technical decisions that deviate from principles MUST be justified in writing with alternative analysis and performance impact assessment.

Amendment Process: Constitutional changes require explicit version bump with impact analysis. Major changes (principle removal/redefinition) increment major version. New principles or expanded guidance increment minor version. Clarifications and refinements increment patch version.

Compliance Review: All feature planning (/plan command) MUST include Constitution Check phase with specific validation against these principles. All task generation (/tasks command) MUST align with constitutional requirements including E2E testing tasks. Code reviews MUST verify adherence to color accuracy, performance, and security standards.

Use CLAUDE.md for runtime development guidance that supplements but never overrides constitutional principles. Agent context updates MUST preserve constitutional requirements and recent technical decisions.

**Version**: 1.1.0 | **Ratified**: 2025-09-28 | **Last Amended**: 2025-09-29