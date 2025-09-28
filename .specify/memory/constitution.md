<!--
Sync Impact Report:
- Version change: initial → 1.0.0
- Modified principles: none (initial creation)
- Added sections: Core Principles (5), Color Accuracy Standards, Development Standards, Governance
- Removed sections: none
- Templates requiring updates: ✅ all verified compatible
- Follow-up TODOs: none
-->

# Paint Mixer App Constitution

## Core Principles

### I. Color Accuracy First (NON-NEGOTIABLE)
All color-related calculations, displays, and user interfaces MUST prioritize color accuracy over convenience or speed. Delta E ≤ 4.0 commercial printing standard is the minimum acceptable accuracy for color matching. Color science calculations MUST use proper LAB color space conversions and CIE 2000 Delta E formulas. UI design MUST use neutral backgrounds (#FFFFFF for color swatches, neutral grays for interface) to prevent color contamination during evaluation.

### II. Documentation Currency via Context7 MCP
All external library documentation, API references, and technical research MUST be obtained through the context7 MCP server to ensure latest information is used at all times. Development decisions based on documentation MUST verify currency through context7 before implementation. Cached or stale documentation sources are prohibited for making technical choices.

### III. Test-First Development (NON-NEGOTIABLE)
TDD mandatory for all color calculation algorithms and core functionality: Tests written → User approved → Tests fail → Then implement. Red-Green-Refactor cycle strictly enforced. Color accuracy tests MUST include reference implementations and known-good color conversion cases. Performance tests MUST verify sub-500ms response times for color calculations.

### IV. Type Safety & Validation
TypeScript strict mode enforced throughout. All user inputs MUST be validated with Zod schemas before processing. API contracts MUST be defined in OpenAPI format with TypeScript type generation. Runtime validation MUST match compile-time types. Color values MUST use validated ColorValue interface with proper hex and LAB representations.

### V. Performance & Accessibility Standards
Color calculations MUST complete within 500ms, image processing within 2 seconds, UI interactions at 60fps. Web Workers MUST be used for intensive calculations to prevent UI blocking. WCAG 2.1 AA accessibility standards MUST be met including color contrast ratios ≥4.5:1 for normal text. Touch targets MUST be minimum 44px for mobile interfaces.

## Color Accuracy Standards

### Measurement Requirements
All color matching MUST achieve Delta E ≤ 4.0 (commercial printing standard) between target and achievable colors. Color conversions MUST preserve accuracy through proper XYZ intermediate space. Paint mixing algorithms MUST implement Kubelka-Munk theory for realistic opacity and scattering simulation.

### Display Standards
Color workspace backgrounds MUST use pure white (#FFFFFF) to prevent color contamination. Interface colors MUST use the approved neutral palette from user_info/colors.md. Color accuracy indicators MUST provide clear visual feedback for Delta E values (≤2.0 = Excellent, ≤4.0 = Good, >4.0 = Poor).

## Development Standards

### Technology Stack Compliance
MUST follow approved tech stack from user_info/generic_web_tech_stack.MD unless deviation is justified for color accuracy requirements. Next.js 15+ with TypeScript, Supabase backend, Shadcn UI components are mandated. React Hook Form + Zod validation required for all forms.

### Code Quality Gates
All code MUST pass TypeScript strict mode compilation. ESLint and Prettier MUST be configured and passing. Supabase RLS policies MUST be implemented for all user data tables. Environment variables MUST be validated with Zod schemas.

### Performance Monitoring
Response time monitoring MUST be implemented for all color calculations. Color accuracy metrics MUST be tracked and reported. User session data MUST include performance and accuracy metadata for continuous improvement.

## Governance

Constitution supersedes all other development practices and style guides. All pull requests MUST verify constitutional compliance before merge. Complex technical decisions that deviate from principles MUST be justified in writing with alternative analysis.

Amendment Process: Constitutional changes require explicit version bump with impact analysis. Major changes (principle removal/redefinition) increment major version. New principles or expanded guidance increment minor version. Clarifications and refinements increment patch version.

Compliance Review: All feature planning (/plan command) MUST include Constitution Check phase. All task generation (/tasks command) MUST align with constitutional requirements. Code reviews MUST verify adherence to color accuracy and performance standards.

Use CLAUDE.md for runtime development guidance that supplements but never overrides constitutional principles.

**Version**: 1.0.0 | **Ratified**: 2025-09-28 | **Last Amended**: 2025-09-28