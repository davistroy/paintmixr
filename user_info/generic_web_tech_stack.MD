# AI Web Development Tech Stack

## 🤖 AI Coding Guidelines (READ FIRST)

**Key Principles for AI Coders:**
1. **Always use TypeScript** with strict mode
2. **Implement RLS policies** for every Supabase table
3. **Use Server Components** by default, Client Components only when needed
4. **Validate all inputs** with Zod schemas
5. **Follow Shadcn patterns** for UI consistency
6. **Handle loading/error states** in all data-fetching components

## 🏗️ Architecture Decision Tree

**Choose Your Backend:**

**Option A: Supabase Only (Recommended)**
- Use when: Standard CRUD, auth, real-time features
- Benefits: Simpler deployment, faster development
- Next.js API routes + Supabase client

**Option B: Next.js + Fastify Backend**
- Use when: Complex business logic, third-party integrations, microservices
- Benefits: Full backend control, custom APIs, complex workflows
- Deployment: Separate services (Vercel + Railway/Render)

**Option C: Supabase + Fastify Hybrid**
- Use when: Need both simplicity and custom logic
- Supabase for auth/database, Fastify for complex operations

## 📋 Tech Stack

### **Frontend**
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **UI Components:** Shadcn UI
- **Styling:** Tailwind CSS
- **State Management:** Zustand (lightweight) or React Query
- **Forms:** React Hook Form + Zod validation

### **Backend Options**

**Option A: Supabase Only**
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth
- **File Storage:** Supabase Storage
- **Real-time:** Supabase Realtime
- **API:** Next.js API Routes + Supabase Client

**Option B: Fastify Backend**
- **Framework:** Fastify 5+
- **Database:** Supabase PostgreSQL (via client)
- **Authentication:** Supabase Auth (JWT verification)
- **Validation:** Fastify schema + Zod
- **Deployment:** Railway/Render/Docker

### **Type Safety & Validation**
- **TypeScript:** Strict mode enabled
- **Database Types:** Supabase CLI generated types
- **Runtime Validation:** Zod schemas
- **API Types:** TypeScript interfaces

### **Development Tools**
- **Package Manager:** pnpm (faster than npm)
- **Linting:** ESLint + Prettier
- **Git Hooks:** Husky + lint-staged
- **Database Management:** Supabase Studio

## 📁 Project Structure

**Frontend (Next.js):**
```
src/
├── app/                 # Next.js App Router
├── components/          # UI components (Shadcn structure)
├── lib/                 # Utils, Supabase client, validations
├── hooks/               # Custom React hooks
└── types/               # TypeScript definitions
```

**Backend (Fastify - Optional):**
```
backend/
├── src/
│   ├── routes/          # API route handlers
│   ├── plugins/         # Fastify plugins (auth, db)
│   ├── schemas/         # Request/response schemas
│   └── utils/           # Helper functions
├── Dockerfile
└── package.json
```

## 📦 Dependencies

### **Frontend Dependencies**
```json
{
  "dependencies": {
    "next": "^15.5.4",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^3.4.0",
    "react-hook-form": "^7.53.0",
    "zod": "^3.23.0",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.59.0"
  }
}
```

### **Fastify Backend Dependencies (Optional)**
```json
{
  "dependencies": {
    "fastify": "^5.0.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/jwt": "^9.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "zod": "^3.23.0",
    "typescript": "^5.7.0"
  }
}
```

### **Development Dependencies**
```json
{
  "devDependencies": {
    "@types/node": "^20.8.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "eslint": "^8.52.0",
    "eslint-config-next": "^14.0.0",
    "prettier": "^3.0.0",
    "husky": "^8.0.0",
    "lint-staged": "^15.0.0",
    "supabase": "^1.100.0"
  }
}
```

## 🔧 Quick Setup Commands

### **Option A: Supabase Only**
```bash
# Create Next.js project
npx create-next-app@latest my-app --typescript --tailwind --app
cd my-app

# Install dependencies
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add react-hook-form @hookform/resolvers zod
pnpm add zustand @tanstack/react-query

# Setup Supabase
npx supabase init
npx supabase start
npx supabase gen types typescript --local > src/lib/supabase/types.ts

# Setup Shadcn
npx shadcn@latest init
npx shadcn@latest add button input form
```

### **Option B: With Fastify Backend**
```bash
# Frontend (same as above)
# Backend setup
mkdir backend && cd backend
npm init -y
pnpm add fastify @fastify/cors @fastify/jwt @supabase/supabase-js zod

# Create basic structure
mkdir -p src/{routes,plugins,schemas}
```

## 🔑 Essential Code Patterns

### **Supabase Client (Browser)**
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### **Fastify Server Setup (Optional)**
```typescript
// backend/src/server.ts
import Fastify from 'fastify'

const server = Fastify({ logger: true })

// Auth plugin
server.register(require('@fastify/jwt'), {
  secret: process.env.SUPABASE_JWT_SECRET!
})

// Routes
server.register(require('./routes/users'), { prefix: '/api/users' })

server.listen({ port: 3001 })
```

### **Fastify Auth Middleware**
```typescript
// backend/src/plugins/auth.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)

export async function authenticate(request: any) {
  const token = request.headers.authorization?.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) throw new Error('Unauthorized')
  return user
}
```

## 🚀 Development Commands

```bash
# Development
pnpm dev                    # Start Next.js dev server
pnpm build                  # Build for production
pnpm lint                   # Run ESLint
pnpm type-check            # TypeScript check

# Supabase
npx supabase start         # Start local Supabase
npx supabase db reset      # Reset database
npx supabase gen types typescript --local > src/lib/supabase/types.ts

# Backend (if using Fastify)
cd backend && pnpm dev     # Start Fastify server
```

## 🌐 Deployment

**Frontend:** Vercel (automatic with Git)
**Backend:** Railway/Render/Docker
**Database:** Supabase Cloud

## 📋 Common Patterns for AI

### **RLS Policy Template**
```sql
-- Enable RLS
alter table tablename enable row level security;

-- User can only see their own data
create policy "Users see own data" on tablename
  for all using (auth.uid() = user_id);
```

### **Zod Validation**
```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})
```

### **Error Handling**
```typescript
const { data, error } = await supabase.from('table').select()
if (error) throw error
```

### **Loading States**
```typescript
const [loading, setLoading] = useState(false)
// Always handle loading in data-fetching components
```
