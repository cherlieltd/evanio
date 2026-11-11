# Evanio.ai

AI marketing SaaS for US small businesses.

## Monorepo layout

| Path | Stack | Deploy |
| --- | --- | --- |
| `frontend/web` | Next.js 15, TypeScript, Tailwind, shadcn/ui | Vercel |
| `frontend/admin` | Next.js 15, TypeScript, Tailwind, shadcn/ui | Vercel (`admin.evanio.ai`) |
| `backend` | Node.js, TypeScript, Hono, BullMQ | Railway |
| `supabase/migrations` | SQL (Postgres, Auth, Storage) | Supabase |

## Prerequisites

- Node.js 20+
- npm 10+
- Redis (local or managed) for BullMQ workers
- A Supabase project (local CLI optional)

## Environment setup

Copy each example file and fill in values:

```bash
cp frontend/web/.env.example frontend/web/.env.local
cp frontend/admin/.env.example frontend/admin/.env.local
cp backend/.env.example backend/.env
```

Frontend apps may only use:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`

Secrets (Stripe, Meta, AI providers, Supabase service role, Redis) live in the backend only.

## Run locally

Use three terminals (plus Redis for video workers).

### 1. Backend API (port 8080)

```bash
cd backend
npm install
npm run dev
```

Health check: [http://localhost:8080/health](http://localhost:8080/health)

Workers (require Redis):

```bash
cd backend
npm run dev:worker:video
npm run dev:worker:posts
```

### 2. Web app (port 3000)

```bash
cd frontend/web
npm install
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

### 3. Admin app (port 3001)

```bash
cd frontend/admin
npm install
npm run dev
```

App: [http://localhost:3001](http://localhost:3001)

Only profiles with `role = 'admin'` can stay signed in. Non-admins are signed out after login.

### Supabase migrations

Put SQL files in `supabase/migrations/`. Apply with the Supabase CLI when the project is linked:

```bash
npx supabase db push
```

Every new table must enable Row Level Security.

## Architecture notes

- Frontend calls the backend with the Supabase access token in the `Authorization` header.
- Backend verifies the token, then handles AI, credits, Stripe, and Meta logic.
- Prefer `routes` → `services` in the backend. Keep files small and clearly named.
- Validate inputs with Zod. Never hardcode API keys.

## Scripts

| App | Dev | Build | Start |
| --- | --- | --- | --- |
| `frontend/web` | `npm run dev` | `npm run build` | `npm run start` |
| `frontend/admin` | `npm run dev` | `npm run build` | `npm run start` |
| `backend` | `npm run dev` | `npm run build` | `npm run start` |
