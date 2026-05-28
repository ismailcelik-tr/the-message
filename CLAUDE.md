# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Çağrı (The Message)** is a Turkish/English Islamic guidance mobile app that delivers daily messages (Quran verses, hadiths, dhikr) via push notifications. The design philosophy is warm and non-judgmental — a calm companion, not a preachy tool.

Live API: `https://cagri-api-533453726230.europe-west1.run.app`

## Commands

```bash
# Install all workspace dependencies
npm install

# Build shared types (required before api:build)
npm run shared:build

# Run API in watch mode (hot-reload)
npm run api:dev

# Start Expo Metro bundler
npm run mobile:start

# Native iOS build (required for expo-notifications — Expo Go won't work)
cd apps/mobile && npx expo run:ios

# Start full local stack (API container only — no local PostgreSQL)
npm run docker:up
npm run docker:down

# Production build checks — run before reporting any task complete
npm run shared:build
npm run api:build
docker compose build
```

> **No test suite**: Correctness verification relies solely on the three build checks above.

## Architecture

npm workspaces monorepo with strict package boundaries:

- **`packages/shared`** — Pure TypeScript types (`UserPreferences`, `DailyBundle`, `ContentItem`, `CategoryPreferences`, `ApiResponse<T>`, `SilentHours`, `ThemeType`, `NotificationFrequency`, `MessageCategory`, `DayTime`, `FeedbackIssueType`). No framework dependencies. Imported as `@the-message/shared`.
- **`apps/api`** — NestJS backend. Supabase JS client (no TypeORM). Exposes REST endpoints for content and feedback.
- **`apps/mobile`** — Expo SDK 54 / React Native 0.81. Zustand for state (auth + preferences). Supabase JS for auth/db.

**Boundary rule**: shared → nothing; api → shared only; mobile → shared only. Violations break the monorepo contract.

## TypeScript Conventions

- `strict: true` enforced in all `tsconfig.json` — never disable it
- Avoid `any`; use exact types from `packages/shared`
- Controllers coordinate; Services handle business logic; components render UI
- Do not introduce complex multi-layer patterns

## Database Rules

- **All data access** via `@supabase/supabase-js` service_role client in the API. TypeORM is completely removed.
- **No local PostgreSQL** — Docker container removed; all DB is Supabase.
- DB columns are `snake_case`; code uses `camelCase` — mapping in `ContentService.toContentItem()`.
- Migrations are in `supabase/migrations/` — apply via Supabase Dashboard SQL Editor. All 5 migrations (001–005) are already applied.
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only (`apps/api/.env`) — never put in mobile.

## Mobile Conventions

- All modal/alert UI uses `AppModal` component (`src/components/AppModal.tsx`) — never `Alert.alert()`
- Apple Sign In is iOS-only: always guard with `Platform.OS !== 'ios'` and wrap button in `{Platform.OS === 'ios' && ...}`
- Email OTP is 6-digit (Supabase dashboard configured to 6)
- Google OAuth: tokens are in the URL hash fragment (`#access_token=...`), not query params — parse with `url.indexOf('#')` + `URLSearchParams`
- i18n language must be set after Zustand store hydrates from AsyncStorage; the sync `useEffect` in `App.tsx` handles this

## Notifications

- `rescheduleNotifications` in `notifications.ts` fetches a **separate DailyBundle per day** for 14 days
- Pass `date` query param (`YYYY-MM-DD`) to `fetchDailyBundle` so the API returns date-seeded content
- Bundle results cached in a `Map<string, DailyBundle>` to avoid redundant calls

## Email Notifications

- New `content_feedback` rows trigger `on_feedback_insert` DB trigger (pg_net)
- The trigger calls Supabase Edge Function `notify-feedback`
- Edge Function fetches content + user email, sends HTML email via **Resend API**
- Do NOT add nodemailer or SMTP logic to the NestJS API
- `RESEND_API_KEY` must be set as a secret in Supabase Dashboard → Edge Functions → notify-feedback → Secrets

## Design System

Avoid heavy green-and-gold Islamic clichés.

- **Light mode**: background `#F4F7F6` (soft mint), primary `#2A4B3D` (forest sage), accent `#7FA899`
- **Dark mode**: background `#1A1D1C`, primary `#A0C4B6` (soft jade)
- UI: glassmorphism-style rounded cards, smooth toggles
- Typography: modern sans-serif for UI; classical serif for quoted content

## Working Rules

- **Read before editing**: Always read relevant files before making changes.
- **Plan before large refactors**: Propose a plan and wait for approval.
- **Small, focused changes**: Don't modify too many files in one step.
- **No broken code**: Never leave the codebase in a non-compiling state.
- **Update docs on structural changes**: Update `README.md`, `PROJECT_CONTEXT.md`, and `SESSION_CONTEXT.md` when significant changes are made.

## MVP Scope

**In scope**: daily messages, notification frequency (1x/3x/5x/day), silent hours, category toggles (hope, purpose, worship, prayer, dhikr), light/dark/system theme, auth (anonymous/email/Google/Apple), bookmarks, content feedback.

**Out of scope** (do not introduce): AI/AWS Bedrock, payments/premium tiers, high-intensity animations, audio player, article reader.
