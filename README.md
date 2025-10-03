# PaintMixr

Professional paint mixing app with physics-based color calculations and enhanced accuracy optimization.

## Features

- **Color Matching**: Input a target color and get precise paint mixing formulas
- **Enhanced Accuracy Mode**: Delta E ≤ 2.0 professional-grade color matching
- **Ratio Prediction**: Enter paint ratios and predict the resulting color
- **Session Management**: Save and revisit mixing formulas
- **Kubelka-Munk Theory**: Physics-based optical mixing calculations
- **Multiple Input Methods**: Color picker, hex codes, or image uploads

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account ([sign up free](https://supabase.com))

### Setup

1. **Clone and install**:
   ```bash
   git clone <repository-url>
   cd paintmixr
   npm install
   ```

2. **Configure Supabase**:
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase URL and anon key from project settings

3. **Run migrations** (already deployed to your project):
   - Database tables: `paints`, `paint_collections`, `mixing_history`
   - Session management: `mixing_sessions`, `mixing_formulas`, `formula_items`

4. **Seed paint data**:
   ```bash
   # After authenticating with Supabase
   npx tsx scripts/seed-user-paints.ts
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

6. **Open** [http://localhost:3000](http://localhost:3000)

## Project Structure

```
paintmixr/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── api/            # API routes
│   │   │   ├── color-match/    # Legacy color matching
│   │   │   ├── optimize/       # Enhanced optimization
│   │   │   ├── paints/         # Paint CRUD
│   │   │   └── sessions/       # Session management
│   │   └── page.tsx        # Main UI
│   ├── components/         # React components
│   ├── lib/               # Core libraries
│   │   ├── color-science/ # Color space conversions, Delta E
│   │   ├── kubelka-munk/  # Optical mixing calculations
│   │   └── optimization/  # Advanced algorithms
│   └── types/             # TypeScript definitions
├── supabase/
│   └── migrations/        # Database schema
└── scripts/               # Utility scripts

```

## Usage

### Basic Color Matching

1. Select "Color Matching" mode
2. Choose input method (picker, hex, or image)
3. Select a target color
4. Get mixing formula with Delta E accuracy

### Enhanced Accuracy Mode

1. Enable "Enhanced Accuracy Mode" toggle
2. Uses advanced TPE Hybrid algorithm
3. Target Delta E ≤ 2.0 for professional results
4. May take 5-10 seconds for optimization

### Managing Paint Collections

*(Coming soon - UI under development)*

## Database Schema

### Core Tables

- **`paints`**: User paint library with optical properties
- **`paint_collections`**: Organized paint groupings
- **`mixing_history`**: Optimization performance tracking
- **`mixing_sessions`**: Saved mixing formulas
- **`mixing_formulas`**: Formula details
- **`formula_items`**: Individual paint components

## API Endpoints

### Color Matching
```
POST /api/color-match
Body: { target_color: {hex, lab}, total_volume_ml, optimization_preference }
```

### Enhanced Optimization
```
POST /api/optimize
Body: { target_color, algorithm, target_delta_e, max_paints }
```

### Paint Management
```
GET/POST/PATCH/DELETE /api/paints
GET/POST /api/collections
```

## Development

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run cypress:open

# Type checking
npm run type-check
```

### Build for Production

```bash
npm run build
npm start
```

## Technology Stack

- **Framework**: Next.js 14.2.33 with App Router (Next.js 15 compatible)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Color Science**: CIE LAB, Delta E 2000
- **Optimization**: Differential Evolution, TPE Hybrid
- **TypeScript**: Strict mode enabled (all flags)
- **Authentication**: Modern @supabase/ssr package

## Recent Updates

### Feature 005: Codebase Analysis & Technical Debt Resolution (2025-10-02)

**Critical Improvements**:
- **TypeScript Strict Mode**: All strict compiler flags enabled (`strict`, `strictNullChecks`, `noImplicitAny`)
- **N+1 Query Fix**: Authentication lookups optimized from O(n) to O(1) using `.eq()` filters
- **SSR-Safe Patterns**: Proper `mounted` flag for localStorage access in client components
- **Modern Supabase Clients**: Migrated to `@supabase/ssr` package (cookie-based sessions)
- **Centralized Types**: Single source of truth at `/src/lib/types/index.ts`

**Security Enhancements**:
- Atomic lockout counter prevents race conditions in failed auth attempts
- OAuth precedence detection blocks email/password signin for OAuth accounts
- Rate limiting with sliding window (5 attempts per 15 minutes)
- Lockout timer resets to full 15 minutes on attempts during lockout period

**Code Quality**:
- Shared utilities for API calls, validation, and testing
- Component size standards (<300 lines)
- Next.js 15 async searchParams compatibility
- 90%+ test coverage target for critical paths

For detailed implementation notes, see `IMPLEMENTATION_STATUS.md` and `CLAUDE.md`.

## Contributing

See `CLAUDE.md` for development guidelines and project structure.

## License

MIT
