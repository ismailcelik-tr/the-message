# SESSION_CONTEXT.md

Last updated: 2026-05-26
Branch: `main` — latest commit `cbb38e4`
GitHub: https://github.com/ismailcelik-tr/the-message

---

## Project Summary

**Çağrı (The Message)** — Turkish/English Islamic guidance mobile app. Delivers daily Quran verses, hadiths, esmaül hüsna, prayers, worship reminders, and dhikr via scheduled local push notifications. Warm, non-judgmental tone.

---

## Architecture

```
the-message/                        ← npm workspaces monorepo
├── packages/shared/                ← Pure TS types, zero framework deps
│   └── src/index.ts                ← All shared interfaces/types
├── apps/api/                       ← NestJS + Supabase JS (NO TypeORM)
│   ├── src/
│   │   ├── app.module.ts           ← ConfigModule + ContentModule + FeedbackModule
│   │   ├── content/
│   │   │   ├── content.service.ts  ← Supabase JS client, queries content_items table
│   │   │   ├── content.controller.ts
│   │   │   └── content.module.ts
│   │   ├── feedback/
│   │   │   ├── feedback.service.ts ← Supabase service_role insert to content_feedback
│   │   │   ├── feedback.controller.ts
│   │   │   └── feedback.module.ts
│   │   └── main.ts
│   └── seed.ts                     ← LEGACY: raw pg client, no longer used
├── apps/mobile/                    ← Expo SDK 54 / React Native 0.81
│   ├── App.tsx                     ← Entry: auth gate → Onboarding | Login | AppNavigator
│   └── src/
│       ├── api/
│       │   ├── content.api.ts      ← fetchDailyBundle(locale, categoryPreferences)
│       │   └── feedback.api.ts     ← submitFeedback(feedback, userId?)
│       ├── components/
│       │   ├── FeedbackModal.tsx   ← Issue type selector + note input
│       │   └── TimePickerRow.tsx
│       ├── hooks/usePreferencesSync.ts
│       ├── i18n/locales/tr.ts, en.ts
│       ├── lib/
│       │   ├── supabase.ts         ← client with startup guard (throws if env vars missing)
│       │   ├── notifications.ts    ← rescheduleNotifications, requestNotificationPermission
│       │   ├── bookmarks.ts
│       │   ├── notificationLog.ts
│       │   └── prefsSync.ts
│       ├── navigation/AppNavigator.tsx
│       ├── screens/
│       │   ├── DailyScreen.tsx     ← 5 content cards + FeedbackModal
│       │   ├── FocusScreen.tsx     ← Category preference toggles
│       │   ├── SavedScreen.tsx     ← Grouped bookmarks + FeedbackModal
│       │   ├── SettingsScreen.tsx
│       │   ├── LoginScreen.tsx
│       │   └── OnboardingScreen.tsx
│       ├── store/
│       │   ├── auth.store.ts
│       │   └── preferences.store.ts  ← Zustand + AsyncStorage (key: cagri-preferences)
│       └── theme/colors.ts
├── supabase/
│   ├── migrations/
│   │   ├── 001_profiles.sql
│   │   ├── 002_bookmarks.sql
│   │   ├── 003_content_feedback.sql  ← feedback table (run in Supabase dashboard)
│   │   └── 004_content_items.sql     ← content table + RLS (run in Supabase dashboard)
│   └── seeds/
│       └── 001_content.sql           ← 254 content items (run in Supabase SQL Editor)
├── docker-compose.yml              ← API container ONLY (no PostgreSQL — removed)
├── infra/docker/Dockerfile.api
└── content/                        ← Raw source docs (Word/PDF), not committed to git
```

**Boundary rule**: `shared` → nothing; `api` → shared only; `mobile` → shared only.

---

## Backend Status

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/content/daily-bundle?locale=tr&categories=hope,worship` | 5-card daily bundle |
| GET | `/api/content?locale=tr&category=&page=1&limit=20` | Paginated list |
| GET | `/api/content/:id` | Single item by ID |
| POST | `/api/feedback` | Submit content error report |

`GET /api/content/daily` (single item) was removed — only daily-bundle is used.

### Database — Supabase PostgreSQL (NOT local Docker)
TypeORM is **completely removed**. All data access via `@supabase/supabase-js` service_role client.

**Tables:**
| Table | Description |
|-------|-------------|
| `content_items` | All content (esma, verse, hadith, prayer, worship, dhikr) |
| `profiles` | User preferences sync |
| `bookmarks` | Saved content items (snapshot JSONB) |
| `content_feedback` | User-submitted error reports |

**`content_items` columns:** `id (uuid)`, `type`, `category`, `recommended_time`, `date`, `translations (jsonb)`, `audio_url`, `image_url`, `is_active`, `created_at`, `updated_at`

Note: column naming is **snake_case** in DB, mapped to camelCase in `toContentItem()`.

### Content Seed
**254 items** in `supabase/seeds/001_content.sql`:
| type | count |
|------|-------|
| esma | 100 (all 99 names + Allah) |
| verse | 42 |
| hadith | 43 (Sahih Bukhari/Muslim only) |
| prayer | 21 |
| worship | 21 |
| dhikr | 27 |

Daily bundle selection: `dayOfYear % items.length` — deterministic per day, same for all users.
Category filtering: active categories from query param → falls back to all items if no match.

### Docker
`docker-compose.yml` now has **only the API container** — PostgreSQL removed.
API requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars at runtime.

---

## Mobile App Status (Expo SDK 54 / RN 0.81)

### App Flow
```
App.tsx
  ├── !isOnboarded → OnboardingScreen (logo + "Haydi Bismillah!")
  ├── isLoading → null
  ├── !session → LoginScreen (anonymous sign-in creates session)
  └── session → AppNavigator (4 tabs)
```

### Tabs
| Tab | Screen | Icon |
|-----|--------|------|
| Günün İçeriği | DailyScreen | `book` |
| Manevi Odak | FocusScreen | `heart` |
| Kaydedilenler | SavedScreen | `bookmark` |
| Ayarlar | SettingsScreen | `settings-sharp` |

### DailyScreen Cards (in order)
1. **Esmâü'l-Hüsnâ** — Arabic large + transliteration + content
2. **Ayet** — content + source
3. **Hadis** — content + source
4. **Dua** — content + source
5. **İbadet** — content + source
6. **Bugünün Bildirimleri** — derived from bundle + schedule (simulated, not real push)

Each card has: `flag-outline` button → FeedbackModal + `bookmark` button + `share` button.

### SavedScreen Groups (order)
`esma → verse → hadith → prayer → worship → dhikr → notification`
Each card has `flag-outline` (FeedbackModal) + `bookmark` (remove) buttons.

### Feedback Flow
- User taps `flag-outline` on any card in DailyScreen or SavedScreen
- `FeedbackModal` opens: select issue type (wrong_text / missing_text / wrong_source / other) + optional note
- Submits to `POST /api/feedback` → stored in `content_feedback` table
- Admin reviews via Supabase Studio (status: pending → reviewed → resolved)

### Push Notifications
- **Real local notifications are implemented** via `expo-notifications ~0.32.17`
- `notifications.ts`: `requestNotificationPermission()`, `rescheduleNotifications(prefs, bundle)`
- 14-day rolling schedule, respects silent hours (including midnight-spanning ranges)
- Frequency: low=1/day, medium=3/day, high=5/day
- Re-scheduled in `App.tsx` when `notificationEnabled`, `frequency`, `schedule`, `silentHours`, or `locale` changes
- "Bugünün Bildirimleri" card is still simulated (shows expected notifications, not confirmed-sent ones)

### Auth
- Supabase anonymous + email auth
- `isAnonymous: true` → bookmarks and prefs sync disabled (but local prefs still work)
- Session persisted via AsyncStorage through Supabase SDK

### System Theme
`useColorScheme()` wired in `App.tsx` — when `preferences.theme === 'system'`, `currentTheme` follows device dark/light mode automatically.

### Startup Guard
`apps/mobile/src/lib/supabase.ts` throws descriptive error if `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` are missing.

---

## Supabase Status

- Project URL: in `apps/mobile/.env.local` (`EXPO_PUBLIC_SUPABASE_URL`)
- Anon key: in `apps/mobile/.env.local` (`EXPO_PUBLIC_SUPABASE_ANON_KEY`) — client-safe, RLS protected
- Service role key: in `apps/api/.env` (`SUPABASE_SERVICE_ROLE_KEY`) — server only, never in mobile
- **Applied migrations:** 001 profiles, 002 bookmarks, 003 content_feedback ✓
- **Pending migration:** 004_content_items.sql — must be run in Supabase dashboard
- **Pending seed:** 001_content.sql — must be run in Supabase SQL Editor after 004
- Auth enabled: anonymous + email
- Google OAuth: deferred (MSG-8)
- Apple OAuth: deferred (MSG-9)

---

## Environment Setup

### `apps/mobile/.env.local` (gitignored)
```
EXPO_PUBLIC_API_URL=http://<your-local-ip>:3000/api
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```
> Physical device can't use `localhost` — use local network IP.

### `apps/api/.env` (gitignored)
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key from Supabase Dashboard → Settings → API>
```

### Root `.env` (for docker-compose)
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

### Key Commands
```bash
# Build checks — run before marking any task complete
npm run shared:build
npm run api:build
docker compose build

# Mobile dev (requires Expo native build — NOT Expo Go)
npm run mobile:start     # then press i (iOS simulator) or a (Android)
# Physical device:
cd apps/mobile && npx expo run:ios  # first time
npm run mobile:start                # subsequent runs

# Docker (API only — no local PostgreSQL anymore)
npm run docker:up
npm run docker:down

# Type-check mobile only (root tsc won't work for mobile)
cd apps/mobile && npx tsc --noEmit

# Seed Supabase (run SQL directly in Supabase SQL Editor):
# 1. supabase/migrations/004_content_items.sql
# 2. supabase/seeds/001_content.sql
```

---

## Shared Types (`packages/shared/src/index.ts`)

Key types:
- `ContentType`: `'verse' | 'hadith' | 'prayer' | 'dhikr' | 'esma' | 'worship' | 'notification' | 'audio' | 'article'`
- `MessageCategory`: `'hope' | 'purpose' | 'worship' | 'prayer' | 'dhikr'`
- `ContentItem`: `{ id, type, category, recommendedTime, date, translations, audioUrl?, imageUrl? }`
- `ContentTranslation`: `{ content, source?, title?, arabicText?, transliteration? }`
- `DailyBundle`: `{ esma, verse, hadith, prayer, worship }` — all `ContentItem`
- `UserPreferences`: theme, notificationEnabled, notificationFrequency, notificationSchedule, categoryPreferences, silentHours, locale
- `FeedbackIssueType`: `'wrong_text' | 'missing_text' | 'wrong_source' | 'other'`
- `ContentFeedback`: `{ contentId, contentType, issueType, note?, locale }`

---

## Completed Tasks

- [x] NestJS API with daily-bundle endpoint + category filtering
- [x] TypeORM removed → Supabase JS client (all data via Supabase)
- [x] PostgreSQL Docker container removed
- [x] content_items table + RLS in Supabase (004_content_items.sql)
- [x] 254-item content seed (001_content.sql) — Sahih sources only
- [x] DailyScreen — 5 content cards (esma, verse, hadith, prayer, worship)
- [x] Bugünün Bildirimleri card (simulated notification log)
- [x] SavedScreen — grouped bookmarks with remove + feedback
- [x] Supabase auth (anonymous + email)
- [x] Preferences sync (profiles table, debounced write, remote load on login)
- [x] Bookmarks stored in Supabase (content + notification types)
- [x] Custom pill tab bar (4 tabs)
- [x] Light/dark/system theme (useColorScheme wired)
- [x] i18n (tr/en) for all screens including feedback
- [x] Notification schedule: low/medium/high with configurable slot times
- [x] Silent hours toggle + time picker (midnight-spanning range support)
- [x] Real local push notifications via expo-notifications (14-day schedule)
- [x] Re-schedule on preference change
- [x] FocusScreen category toggles filter DailyScreen content (API + mobile)
- [x] Startup guard for missing .env.local / Supabase env vars
- [x] System theme follows device dark mode
- [x] User content feedback mechanism (FeedbackModal + /api/feedback + content_feedback table)
- [x] Expo SDK upgraded 51 → 54 (requires native build, not Expo Go)
- [x] Pull-to-refresh on DailyScreen and SavedScreen
- [x] Linear backlog aligned with current state

---

## Pending Tasks (Linear)

### High Priority
| Issue | Task |
|-------|------|
| **MSG-17** | **Onboarding Wizard** — 2-step flow after first launch: (1) Manevi Odak topic selection, (2) notification frequency + silent hours setup. Sets `onboardingCompleted` flag. Triggers `rescheduleNotifications` on completion. |
| **MSG-10** | **GCP Cloud Run deployment** — Docker image to Artifact Registry, Cloud Run service, Secret Manager for env vars, CI/CD via GitHub Actions. Region: `europe-west1`. |

### Low Priority / Backlog
| Issue | Task |
|-------|------|
| MSG-8 | Google OAuth (needs Google Cloud Console) |
| MSG-9 | Apple OAuth (needs Apple Developer account) |
| MSG-11 | Audio/article content type UI (player + reader components) |
| MSG-14 | Content library browse screen (paginated list UI) |

---

## What Should NOT Be Changed

- `strict: true` in all `tsconfig.json` — never disable
- The `shared → nothing / api → shared only / mobile → shared only` boundary
- `bookmarks` table `unique(user_id, content_id)` constraint — upsert logic depends on it
- Notification bookmark ID format `notif-YYYY-MM-DD-{index}` — SavedScreen and DailyScreen split on `notif-` prefix
- `EXPO_PUBLIC_` prefix on all mobile env vars — required for Expo to bundle them
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only (api/.env) — never in mobile
- RLS policies on all Supabase tables — do not bypass
- `expo-notifications ~0.32.17` — SDK 54 compatible version; `shouldShowBanner`/`shouldShowList` required in notification handler
- Column naming convention: DB uses `snake_case` (`recommended_time`, `is_active`, `audio_url`), code uses `camelCase` — mapping is in `ContentService.toContentItem()`

---

## Unfinished / Pending Actions (requires manual steps)

1. **Run migration 004** in Supabase SQL Editor: `supabase/migrations/004_content_items.sql`
2. **Run seed** in Supabase SQL Editor: `supabase/seeds/001_content.sql` (after 004)
3. **Add `SUPABASE_SERVICE_ROLE_KEY`** to `apps/api/.env` (Supabase Dashboard → Settings → API → service_role)
4. **Restart Docker**: `docker compose down && docker compose up -d --build` (PostgreSQL container removed, new build needed)
5. **MSG-13** (seed TypeORM issue) — mark as Cancelled manually in Linear (MCP state change didn't apply)

---

## Known Bugs / Issues

1. **"Bugünün Bildirimleri" is simulated** — derives expected notifications from schedule, not from actual notification delivery confirmation. If prefs change mid-day, log shows updated values retroactively.
2. **`audio` and `article` content types** — defined in `ContentType` and DB schema but no UI components exist (no player, no reader).
3. **`apps/api/seed.ts`** — legacy file using raw `pg` client. Still in repo but no longer used. Can be deleted.
4. **Cold start on Cloud Run (future)** — min instances=0 means first request after idle period will be slow (~2-3s). Acceptable at current scale.

---

## Temporary Decisions / Technical Debt

- **Notification log is derived, not confirmed** — if user's prefs change after notifications were scheduled, the log card shows different content than what was actually delivered. Acceptable for MVP.
- **Day-of-year content selection** — deterministic but if content count changes (new seed run), users see different item on same day. Acceptable tradeoff.
- **No content versioning** — `content_items` has no version or updated_at trigger. If a record is corrected via Studio after a user has bookmarked it, their bookmark snapshot (JSONB in `bookmarks.snapshot`) retains the old version.
- **`apps/api/seed.ts`** — should be deleted (TypeORM dependency gone, file references `pg` and old schema column names like `recommendedTime` camelCase instead of `recommended_time`).
- **`infra/aws/README.md`** — outdated, references AWS ECS. Now targeting GCP Cloud Run.
- **`DailyMessage` interface** in shared/index.ts — marked `@deprecated`, kept for backward compat. Can be removed once confirmed nothing references it.

---

## Risks

- **Supabase free tier limits**: 500MB DB, 2 projects, 50MB file storage. At 254 content items, DB usage is negligible. Monitor when seed expands.
- **Single Supabase project for dev+prod**: Currently no separate production Supabase project. When going to prod, create a new project and point env vars at it.
- **Content accuracy**: Seed was AI-generated and reviewed at high level. Feedback mechanism is in place for ongoing correction. Hadith sources are restricted to Sahih Bukhari/Muslim, but individual translations should be verified by a qualified reviewer before App Store submission.
- **expo-notifications physical device testing**: Requires `npx expo run:ios` native build — simulators work, but push notification delivery only verified on physical device.
- **No CI/CD yet**: All builds and deploys are manual. Build drift risk increases over time until MSG-10 is implemented.
