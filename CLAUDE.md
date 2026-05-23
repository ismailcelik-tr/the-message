# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Çağrı (The Message)** is a Turkish-language Islamic guidance mobile app that delivers daily messages (Quran verses, hadiths, dhikr) via push notifications. The design philosophy is warm and non-judgmental — a calm companion, not a preachy tool.

## Commands

```bash
# Install all workspace dependencies
npm install

# Build shared types (required before api:build)
npm run shared:build

# Run API in watch mode (hot-reload)
npm run api:dev

# Start Expo Metro bundler (press i/a/w for iOS/Android/web)
npm run mobile:start

# Start full local stack (PostgreSQL + API)
npm run docker:up
npm run docker:down

# Build shared + API together (shorthand)
npm run build

# Production build checks — run before reporting any task complete
npm run shared:build
npm run api:build
docker compose build
```

> **No test suite**: The project has no Jest or other test framework. Correctness verification relies solely on the three build checks above.

## Architecture

This is an **npm workspaces monorepo** with strict package boundaries:

- **`packages/shared`** — Pure TypeScript types and interfaces (`UserPreferences`, `DailyMessage`, `CategoryPreferences`, `ApiResponse<T>`, `SilentHours`, `ThemeType`, `NotificationFrequency`, `MessageCategory`, `DayTime`). No framework dependencies. Both other packages import from here as `@the-message/shared`.
- **`apps/api`** — NestJS backend. Can import from `@the-message/shared`. Must not reference `apps/mobile`. Exposes `GET /api/health` and `GET /api/daily-message`. Uses TypeORM with PostgreSQL.
- **`apps/mobile`** — React Native (Expo) app. Can import from `@the-message/shared`. Must not reference `apps/api`. Single-file architecture (`App.tsx`); all state is local React `useState`, no global state manager. Theme default is `'system'` (not `'light'`).

**Boundary rule**: shared → nothing; api → shared only; mobile → shared only. Violations break the monorepo contract.

## TypeScript Conventions

- `strict: true` is enforced in all `tsconfig.json` files — never disable it.
- Avoid `any`; use the exact types from `packages/shared`.
- Controllers coordinate, Services handle business logic, components render UI — keep these layers separate and small.
- Do not introduce complex multi-layer patterns; clean functions and services are the target abstraction level.

## Database Rules

- **Dev**: TypeORM `synchronize: true` for rapid local iteration (auto-applies schema changes).
- **Production**: `synchronize` must be `false`; use TypeORM CLI migration files for all schema changes.
- PostgreSQL connection is configured via environment variables (`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_DB`); default values are in `docker-compose.yml`.

## Design System

The UI targets a modern aesthetic — avoid heavy green-and-gold Islamic clichés.

- **Light mode**: background `#F4F7F6` (soft mint), primary `#2A4B3D` (forest sage), accents warm sand / muted sage `#7FA899`
- **Dark mode**: background `#1A1D1C`, primary `#A0C4B6` (soft jade)
- UI elements: glassmorphism-style rounded cards, smooth toggles
- Typography: modern sans-serif for UI, classical serif for quoted content

## Working Rules

- **Read before editing**: Always read the relevant files before making changes.
- **Plan before large refactors**: Propose a plan and wait for approval before any significant restructuring.
- **Small, focused changes**: Don't modify too many files in a single step.
- **Explain each step**: After every change, briefly describe what was changed and why.
- **No broken code**: Never leave the codebase in a non-compiling or partially-implemented state.
- **Update docs on structural changes**: When a significant product or architectural change is made, update `README.md` and `PROJECT_CONTEXT.md` accordingly.

## MVP Scope

**In scope**: daily messages, notification frequency (1x/3x/5x/day), silent hours, category toggles (hope, purpose, worship, prayer, dhikr), light/dark theme.

**Out of scope** (do not introduce): user authentication, AI/AWS Bedrock, payments/premium tiers, high-intensity animations.
