# Technical Research: Paint Mixing Color App

**Date**: 2025-09-28
**Context**: Research for paint mixing color matching application

## Color Science & Accuracy

### Decision: Delta E CIE 2000 for color difference calculation
**Rationale**: Delta E CIE 2000 is the most perceptually uniform color difference formula, aligning with the requirement for commercial printing standard accuracy (≤ 4.0 Delta E).

**Implementation**: Use color-difference library or implement CIE 2000 formula with LAB color space conversions.

**Alternatives considered**:
- Delta E CIE 1976: Simpler but less perceptually accurate
- Delta E CIE 1994: Better than 1976 but superseded by 2000
- Simple RGB distance: Completely inaccurate for perceptual differences

### Decision: LAB color space for internal calculations
**Rationale**: LAB color space is perceptually uniform and required for accurate Delta E calculations. Better represents human color perception than RGB.

**Implementation**: Convert RGB inputs to LAB via XYZ color space for all color matching calculations.

**Alternatives considered**:
- RGB: Simple but perceptually non-uniform
- HSL/HSV: Better than RGB but still not perceptually uniform
- XYZ: Intermediate space, not ideal for distance calculations

## Oil Paint Mixing Physics

### Decision: Kubelka-Munk theory for paint mixing simulation
**Rationale**: Most accurate model for paint mixing that accounts for opacity, scattering, and absorption properties of oil paints.

**Implementation**: Use Kubelka-Munk K/S ratios for each paint, convert to reflectance values for mixing calculations.

**Alternatives considered**:
- Simple RGB averaging: Completely inaccurate for paint physics
- Subtractive color model: Better than RGB but ignores opacity and scattering
- Artist intuition rules: Not systematic or accurate enough

### Decision: Paint property database with K/S coefficients
**Rationale**: Each oil paint has unique optical properties (pigment density, transparency, tinting strength) that affect mixing results.

**Implementation**: Extend paint color JSON with Kubelka-Munk coefficients, transparency values, and density factors.

**Alternatives considered**:
- Color-only database: Ignores physical mixing properties
- Simplified opacity values: Less accurate than full K/S coefficients

## Image Color Extraction

### Decision: Canvas API for client-side image processing
**Rationale**: Faster than server-side processing, works offline, and provides direct pixel access for color extraction.

**Implementation**: Use HTML5 Canvas to read image pixels, implement color averaging and dominant color extraction algorithms.

**Alternatives considered**:
- Server-side image processing: Slower, requires uploads
- Web Workers for processing: Adds complexity, Canvas API is fast enough
- Third-party image analysis APIs: Adds dependency and latency

### Decision: Multiple color extraction methods
**Rationale**: Different use cases need different extraction approaches (precise color picking vs dominant color analysis).

**Implementation**: Provide pixel-precise color picking, average color extraction, and dominant color clustering.

**Alternatives considered**:
- Single extraction method: Too limiting for various use cases
- K-means clustering only: Overkill for simple color picking

## Color Input Methods

### Decision: React Color for color picker component
**Rationale**: Mature library with good accessibility, multiple picker styles, and TypeScript support.

**Implementation**: Integrate React Color with custom validation and LAB conversion pipeline.

**Alternatives considered**:
- Custom color picker: Too much development overhead
- Native HTML color input: Limited functionality and styling
- Browser APIs only: Inconsistent cross-browser support

### Decision: Real-time hex validation with Zod
**Rationale**: Immediate feedback for user input, type-safe validation, and consistent error handling.

**Implementation**: Zod schema for hex color validation with real-time form validation.

**Alternatives considered**:
- Manual validation: Error-prone and inconsistent
- Third-party validation: Adds dependency for simple task

## Performance Optimization

### Decision: Client-side color calculations with Web Workers
**Rationale**: Complex Kubelka-Munk calculations can block UI thread, Web Workers maintain 60fps UI performance.

**Implementation**: Move intensive mixing calculations to Web Workers, stream results back to main thread.

**Alternatives considered**:
- Main thread calculations: Would block UI for complex calculations
- Server-side calculations: Slower due to network latency
- Simplified algorithms: Would sacrifice accuracy

### Decision: Incremental search for mixing optimization
**Rationale**: Finding optimal paint ratios is a complex optimization problem requiring efficient search algorithms.

**Implementation**: Use gradient descent or genetic algorithm for ratio optimization, with early termination for acceptable matches.

**Alternatives considered**:
- Brute force search: Too slow for real-time results
- Lookup tables: Memory intensive and limited flexibility
- Simple heuristics: Less accurate results

## Data Storage Strategy

### Decision: Supabase PostgreSQL for session storage
**Rationale**: Structured data with relationships, ACID compliance, and built-in RLS for future multi-user support.

**Implementation**: Normalized schema with tables for sessions, formulas, and paint inventories.

**Alternatives considered**:
- Browser localStorage: Limited storage, no sync capabilities
- File-based storage: No querying capabilities, harder to manage
- NoSQL database: Overkill for structured data with clear relationships

### Decision: JSON file for paint color database
**Rationale**: Static data that doesn't change frequently, easy to version control and deploy.

**Implementation**: Static JSON file with paint properties, loaded at application startup.

**Alternatives considered**:
- Database storage: Overkill for static reference data
- Hardcoded constants: Harder to maintain and update
- External API: Adds dependency and latency

## Mobile Responsiveness

### Decision: Tailwind responsive design with touch-optimized UI
**Rationale**: Mobile users need larger touch targets and simplified workflows for color input.

**Implementation**: Responsive breakpoints with mobile-first design, minimum 44px touch targets.

**Alternatives considered**:
- Separate mobile app: Additional development overhead
- Desktop-only experience: Excludes significant user base
- Generic responsive design: Doesn't optimize for color accuracy use case

### Decision: Progressive Web App (PWA) capabilities
**Rationale**: Offline color calculations and saved sessions improve mobile experience.

**Implementation**: Service worker for offline functionality, app manifest for mobile installation.

**Alternatives considered**:
- Web-only experience: Limited offline capabilities
- Native mobile app: Much higher development cost
- Hybrid app framework: Adds complexity and performance overhead

## Testing Strategy

### Decision: Jest + React Testing Library for unit/component tests
**Rationale**: Standard React testing stack with good TypeScript support and testing patterns.

**Implementation**: Test color calculation functions, component interactions, and form validations.

**Alternatives considered**:
- Vitest: Newer but less ecosystem maturity
- Enzyme: Deprecated and less aligned with React best practices

### Decision: Cypress for end-to-end testing
**Rationale**: Better for testing visual color matching workflows and image upload scenarios.

**Implementation**: Test complete user workflows from color input to session saving.

**Alternatives considered**:
- Playwright: Good alternative but Cypress has better React ecosystem
- Selenium: More complex setup and maintenance
- Manual testing only: Not sufficient for regression testing

## Summary

Key technical decisions focus on color accuracy through proper color science (LAB color space, Delta E CIE 2000), realistic paint mixing simulation (Kubelka-Munk theory), and performance optimization (Web Workers, client-side processing). The architecture leverages modern web technologies (Next.js, TypeScript, Supabase) for a responsive, accessible, and maintainable application.