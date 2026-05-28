# Çağrı (The Message) Monorepo

**Çağrı** (*The Message*) is a Turkish/English Islamic guidance mobile app that delivers daily Quran verses, hadiths, dhikr, and prayers via scheduled local push notifications. Warm, non-judgmental tone — a calm companion, not a preachy tool.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native (Expo SDK 54), TypeScript |
| Backend | NestJS, deployed on Fly.io (free tier, always-on) |
| Database | Supabase (PostgreSQL + Auth + Edge Functions) |
| Shared types | `packages/shared` — pure TypeScript, no framework deps |
| Notifications | `expo-notifications` (local, 14-day schedule) |
| CI/CD | GitHub Actions → `flyctl deploy --remote-only` → Fly.io |

---

## Monorepo Structure

```
the-message/
├── apps/
│   ├── api/        ← NestJS backend (Supabase JS client, no TypeORM)
│   └── mobile/     ← Expo React Native app
├── packages/
│   └── shared/     ← Shared TypeScript types only
├── supabase/
│   ├── migrations/ ← SQL migrations (applied in Supabase dashboard)
│   ├── seeds/      ← Content seed (254 items)
│   └── functions/  ← Edge Functions (notify-feedback via Resend)
├── infra/
│   └── docker/Dockerfile.api
└── docs/
    └── privacy.html  ← Privacy policy (hosted on GitHub Pages)
```

**Package boundary rule**: `shared` → nothing; `api` → shared only; `mobile` → shared only.

---

## Quick Start — Local Development

### Prerequisites
- Node.js 20+, npm 10+
- Docker Desktop (for local API)
- Expo CLI (`npm install -g expo-cli`)
- Xcode (iOS) or Android Studio (Android) for native builds

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment

`apps/mobile/.env.local`:
```
EXPO_PUBLIC_API_URL=https://cagri-api-533453726230.europe-west1.run.app/api
EXPO_PUBLIC_SUPABASE_URL=https://***REDACTED_SUPABASE_HOST***
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

`apps/api/.env`:
```
SUPABASE_URL=https://***REDACTED_SUPABASE_HOST***
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

### 3. Start the API
```bash
npm run docker:up     # runs API container (no local PostgreSQL — uses Supabase)
```

### 4. Start the mobile app
```bash
# Native build required (not Expo Go — uses expo-notifications)
cd apps/mobile && npx expo run:ios    # first time
npm run mobile:start                  # subsequent runs (Metro only)
```

---

## Key Commands

```bash
# Build checks (run before any commit or task completion)
npm run shared:build
npm run api:build
docker compose build

# Development
npm run api:dev          # NestJS hot-reload (direct, no Docker)
npm run mobile:start     # Metro bundler
npm run docker:up        # API container

# Type-check mobile
cd apps/mobile && npx tsc --noEmit
```

---

## Production

- **API**: `https://cagri-api.fly.dev` (Fly.io, region: cdg / Paris, always-on free tier)
- **Supabase**: `https://***REDACTED_SUPABASE_HOST***`
- **iOS bundle ID**: `com.themessage.cagri` — App Store submission in progress

---

## Documentation

- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) — Product vision, design system, feature scope
- [SESSION_CONTEXT.md](SESSION_CONTEXT.md) — Current state, pending tasks, architecture decisions
- [CLAUDE.md](CLAUDE.md) — AI agent working instructions
