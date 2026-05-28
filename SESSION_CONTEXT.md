# SESSION_CONTEXT.md

Last updated: 2026-05-28
Branch: `main` — latest commit `5acf620`
GitHub: https://github.com/ismailcelik-tr/the-message

---

## Project Summary

**Çağrı (The Message)** — Turkish/English Islamic guidance mobile app. Delivers daily Quran verses, hadiths, esmaül hüsna, prayers, worship reminders, and dhikr via scheduled local push notifications. Warm, non-judgmental tone. Currently at App Store submission stage.

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
│   │   │   ├── content.service.ts  ← Supabase JS client, date-based daily content rotation
│   │   │   ├── content.controller.ts  ← GET /daily-bundle?locale&categories&date
│   │   │   └── content.module.ts
│   │   ├── feedback/
│   │   │   ├── feedback.service.ts ← Supabase service_role insert to content_feedback
│   │   │   ├── feedback.controller.ts
│   │   │   └── feedback.module.ts
│   │   └── main.ts
│   └── .env                        ← SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (gitignored)
├── apps/mobile/                    ← Expo SDK 54 / React Native 0.81
│   ├── App.tsx                     ← Entry: i18n sync + auth gate → Onboarding | Login | AppNavigator
│   └── src/
│       ├── api/
│       │   ├── client.ts           ← apiFetch wrapper
│       │   ├── content.api.ts      ← fetchDailyBundle(locale, categoryPreferences, date?)
│       │   └── feedback.api.ts     ← submitFeedback(feedback, userId?)
│       ├── components/
│       │   ├── AppModal.tsx        ← Unified modal (replaces all Alert.alert calls)
│       │   ├── FeedbackModal.tsx   ← Issue type selector + note input
│       │   └── TimePickerRow.tsx
│       ├── hooks/usePreferencesSync.ts
│       ├── i18n/locales/tr.ts, en.ts
│       ├── lib/
│       │   ├── supabase.ts         ← client with startup guard (throws if env vars missing)
│       │   ├── notifications.ts    ← rescheduleNotifications (14-day, per-day bundles)
│       │   ├── bookmarks.ts
│       │   ├── notificationLog.ts
│       │   └── prefsSync.ts
│       ├── navigation/AppNavigator.tsx
│       ├── screens/
│       │   ├── DailyScreen.tsx     ← 5 content cards + Bugünün Bildirimleri + FeedbackModal
│       │   ├── FocusScreen.tsx     ← Category preference toggles
│       │   ├── SavedScreen.tsx     ← Grouped bookmarks + FeedbackModal (single ScrollView)
│       │   ├── SettingsScreen.tsx
│       │   ├── LoginScreen.tsx     ← Anonymous + Email OTP + Google + Apple (iOS only)
│       │   ├── OnboardingScreen.tsx
│       │   └── ResetPasswordScreen.tsx
│       ├── store/
│       │   ├── auth.store.ts       ← Zustand: session, isLoading
│       │   └── preferences.store.ts  ← Zustand + AsyncStorage (key: cagri-preferences)
│       └── theme/colors.ts
├── supabase/
│   ├── functions/notify-feedback/  ← Edge Function: sends email via Resend on new feedback
│   ├── migrations/
│   │   ├── 001_profiles.sql        ← applied ✓
│   │   ├── 002_bookmarks.sql       ← applied ✓
│   │   ├── 003_content_feedback.sql ← applied ✓ (+ DB trigger on_feedback_insert)
│   │   ├── 004_content_items.sql   ← applied ✓
│   │   └── 005_app_feedback.sql    ← applied ✓
│   └── seeds/001_content.sql       ← 254 items (applied ✓)
├── infra/docker/Dockerfile.api     ← Multi-stage: base/development/build/production
├── docker-compose.yml              ← API container ONLY (no local PostgreSQL)
├── docs/privacy.html               ← Privacy policy (GitHub Pages)
└── scripts/fix-expo-gradle-plugin.js  ← Android build fix (postinstall hook)
```

**Boundary rule**: `shared` → nothing; `api` → shared only; `mobile` → shared only.

---

## Backend Status

### Deployment
- **Production**: Fly.io — `https://cagri-api.fly.dev` (region: cdg / Paris)
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`) — `flyctl deploy --remote-only` on push to main
- **CI status**: Migrated 2026-05-28 — GCP Cloud Run → Fly.io (free tier, always-on, no cold start)

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/content/daily-bundle?locale=tr&categories=hope,worship&date=YYYY-MM-DD` | 5-card daily bundle |
| GET | `/api/content?locale=tr&category=&page=1&limit=20` | Paginated list |
| GET | `/api/content/:id` | Single item by ID |
| POST | `/api/feedback` | Submit content error report |

### Database — Supabase PostgreSQL
TypeORM completely removed. All data access via `@supabase/supabase-js` service_role client.

**Tables (all migrations applied):**
| Table | Description |
|-------|-------------|
| `content_items` | All content (esma, verse, hadith, prayer, worship, dhikr) |
| `profiles` | User preferences sync |
| `bookmarks` | Saved content items (snapshot JSONB) |
| `content_feedback` | User-submitted error reports |
| `app_feedback` | General app feedback (migration 005) |

**Daily bundle selection**: `Math.floor(new Date(date).getTime() / 86400000) % items.length` — deterministic per calendar day, consistent across all users. The `date` query param is required for per-day rotation in notifications.

### Content Seed (254 items)
| type | count |
|------|-------|
| esma | 100 (all 99 names + Allah) |
| verse | 42 |
| hadith | 43 (Sahih Bukhari/Muslim only) |
| prayer | 21 |
| worship | 21 |
| dhikr | 27 |

### Supabase Edge Function
- `notify-feedback`: triggered by `on_feedback_insert` DB trigger (pg_net) when a row is inserted into `content_feedback`
- Fetches content text from `content_items`, fetches user email via admin API, sends styled HTML email via Resend API
- **Pending**: `RESEND_API_KEY` must be added to Edge Function secrets in Supabase Dashboard

---

## Mobile App Status (Expo SDK 54 / RN 0.81)

### App Flow
```
App.tsx
  ├── !isOnboarded → OnboardingScreen
  ├── isPasswordRecovery && session → ResetPasswordScreen
  ├── !session → LoginScreen (anonymous / email OTP / Google / Apple)
  └── session → AppNavigator (4 tabs)
```

### Auth (fully implemented)
- **Anonymous**: creates Supabase anon session, `isAnonymous: true` in store
- **Email OTP**: 6-digit code (Supabase dashboard configured to 6 digits)
- **Google OAuth**: `expo-web-browser` + Supabase OAuth, tokens parsed from URL hash fragment (`#access_token=...`), `prompt: 'select_account'` forces account picker every time
- **Apple Sign In**: `expo-apple-authentication`, iOS only (Platform.OS guard), wrapped in `{Platform.OS === 'ios' && ...}`
- **Password Reset**: `PASSWORD_RECOVERY` event handled in `onAuthStateChange`, routes to `ResetPasswordScreen`
- All alerts use `AppModal` component (never `Alert.alert()`)

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
6. **Bugünün Bildirimleri** — derived from bundle + schedule (simulated, not confirmed delivery)

Each card: `flag-outline` → FeedbackModal + `bookmark` toggle + `share` button.

### Push Notifications (MSG-25 complete)
- Real local notifications via `expo-notifications ~0.32.17`
- `rescheduleNotifications(prefs, todayBundle)` fetches a **separate bundle per day** for 14 days
- Per-day bundles cached in a `Map<string, DailyBundle>` to avoid redundant API calls
- Date string (`YYYY-MM-DD`) passed to `fetchDailyBundle` → API uses Unix epoch day as seed
- Notification title: `{SlotLabel} — Çağrı` (TR) / `{SlotLabel} — The Message` (EN)
- Silent hours support including midnight-spanning ranges (e.g. 22:00–06:00)
- Re-scheduled when: `notificationEnabled`, `frequency`, `schedule`, `silentHours`, or `locale` changes

### i18n
- Zustand preferences store hydrates async from AsyncStorage
- `App.tsx` has `useEffect` that calls `i18n.changeLanguage(preferences.locale)` when `preferences.locale` changes — this prevents UI language mismatch on cold start
- `AppNavigator.tsx` has a redundant safety net for the same

### Feedback Email
- User submits feedback via `FeedbackModal` → `POST /api/feedback` → row in `content_feedback`
- DB trigger fires → Supabase Edge Function `notify-feedback` → Resend API → email to admin
- **Pending**: `RESEND_API_KEY` secret must be added in Supabase Dashboard

---

## Environment Setup

### `apps/mobile/.env.local` (gitignored)
```
EXPO_PUBLIC_API_URL=https://cagri-api-533453726230.europe-west1.run.app/api
EXPO_PUBLIC_SUPABASE_URL=https://***REDACTED_SUPABASE_HOST***
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_URL=https://***REDACTED_SUPABASE_HOST***
```

### `apps/api/.env` (gitignored)
```
SUPABASE_URL=https://***REDACTED_SUPABASE_HOST***
SUPABASE_SERVICE_ROLE_KEY=<service_role key from Supabase Dashboard → Settings → API>
```

### Key Commands
```bash
# Build checks — run before marking any task complete
npm run shared:build
npm run api:build
docker compose build

# Mobile dev (requires native Expo build — NOT Expo Go)
npm run mobile:start              # Metro bundler
cd apps/mobile && npx expo run:ios  # first time or after native changes

# Docker (API only — no local PostgreSQL)
npm run docker:up
npm run docker:down

# Type-check mobile only
cd apps/mobile && npx tsc --noEmit
```

---

## Completed Tasks

- [x] NestJS API with daily-bundle endpoint + category filtering + date-based rotation (MSG-25)
- [x] TypeORM removed → Supabase JS client
- [x] PostgreSQL Docker container removed (Supabase only)
- [x] All Supabase migrations applied (001–005)
- [x] 254-item content seed
- [x] GCP Cloud Run deployment + GitHub Actions CI/CD (MSG-10)
- [x] DailyScreen — 5 content cards + simulated notification log
- [x] SavedScreen — grouped bookmarks, crash fix (single ScrollView, always-mounted modals)
- [x] FocusScreen category toggles → filter DailyScreen content
- [x] Supabase auth: anonymous + email OTP (6-digit) + Google OAuth + Apple Sign In (iOS only)
- [x] Password reset flow (ResetPasswordScreen)
- [x] AppModal component — unified replacement for Alert.alert()
- [x] Preferences sync (profiles table, debounced write)
- [x] Bookmarks in Supabase (content + notification types)
- [x] Real local push notifications — 14-day rolling schedule (MSG-1/2/3)
- [x] Per-day notification content rotation (MSG-25)
- [x] FeedbackModal + /api/feedback + content_feedback table
- [x] Feedback email via Supabase Edge Function + Resend API
- [x] i18n (tr/en) with async hydration fix
- [x] System theme follows device dark/light mode (MSG-5/6)
- [x] Silent hours with midnight-spanning range support
- [x] Pull-to-refresh on DailyScreen and SavedScreen
- [x] Expo SDK upgraded 51 → 54
- [x] Dockerfile.api fix: `COPY scripts/` before `npm install` (postinstall hook)

---

## Pending Tasks

### Immediate (App Store submission blockers)
| # | Task | Notes |
|---|------|-------|
| 1 | **Verify CI/CD** | Commit Dockerfile.api fix → confirm GitHub Actions green |
| 2 | **Supabase: add Redirect URL** | Dashboard → Auth → URL Config → add `cagri://**` (Google OAuth on physical device) |
| 3 | **Supabase: add RESEND_API_KEY** | Dashboard → Edge Functions → notify-feedback → Secrets |
| 4 | **MSG-23: App Store screenshots** | iPhone 17 Pro Max simulator, light theme, Turkish locale. 5 screens: Onboarding, DailyScreen, SavedScreen, FocusScreen, SettingsScreen. User does manually — automation returns black screen. Output: `screenshots/` |
| 5 | **MSG-22: App Store Connect metadata** | Description (TR+EN), keywords, Support URL, Privacy URL, submit for review |
| 6 | **GitHub Pages check** | Confirm `docs/privacy.html` committed + Pages enabled on repo → provides Privacy Policy URL |

### Backlog
| Issue | Task |
|-------|------|
| MSG-21 | Google Play Developer Account + Android AAB |
| MSG-17 | Onboarding Wizard (2-step: topic selection + notification setup) |
| MSG-8 | Google OAuth improvements |
| MSG-11 | Audio/article content type UI |
| MSG-14 | Content library browse screen |

---

## What Should NOT Be Changed

- `strict: true` in all `tsconfig.json` — never disable
- `shared → nothing / api → shared only / mobile → shared only` package boundary
- `bookmarks` table `unique(user_id, content_id)` constraint — upsert logic depends on it
- Notification bookmark ID format `notif-YYYY-MM-DD-{index}` — SavedScreen and DailyScreen split on `notif-` prefix
- `EXPO_PUBLIC_` prefix on all mobile env vars — required for Expo to bundle them
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only (`apps/api/.env`) — never in mobile
- RLS policies on all Supabase tables — do not bypass
- `expo-notifications ~0.32.17` — SDK 54 compatible; `shouldShowBanner`/`shouldShowList` required in handler
- DB column mapping: DB is `snake_case`, code is `camelCase` — mapping in `ContentService.toContentItem()`
- `AppModal` for all modals/alerts — do not reintroduce `Alert.alert()`
- Email notifications must use Supabase DB trigger → Edge Function → Resend, NOT nodemailer in API

---

## Known Bugs / Issues

1. **"Bugünün Bildirimleri" is simulated** — derives expected notifications from current schedule, not from confirmed delivery. If prefs change mid-day, card shows updated values, not what was actually scheduled.
2. **Apple Sign In** — works only in production build. Development build gives `Unacceptable audience in id_token: [host.exp.Exponent]`. Not a code bug.
3. **`audio` and `article` content types** — defined in schema but no UI. No data in seed.
4. **`apps/api/seed.ts`** — legacy file (raw `pg` client, old column names). Not used. Can be deleted.

---

## Technical Debt / Temporary Decisions

- **No content versioning** — bookmarks store snapshot JSONB; corrections in Supabase Studio won't update old snapshots.
- **Single Supabase project for dev+prod** — acceptable for now; create separate project before scaling.
- **`DailyMessage` interface** in shared/index.ts — `@deprecated`, kept for compat. Can be removed.
- **`infra/aws/README.md`** — outdated (references AWS ECS). Deployment is on GCP Cloud Run.
- **Content accuracy** — seed is AI-generated, reviewed at high level. Feedback mechanism handles ongoing corrections. A qualified reviewer should verify hadith translations before major scale.
- **Min instances = 0 on Cloud Run** — cold start ~2–3s after idle. Acceptable at current scale.

---

## Supabase Project

- URL: `https://***REDACTED_SUPABASE_HOST***`
- Project ref: `gpuhhpxnxrvvjappindr`
- Region: (check dashboard)
- Auth: anonymous + email enabled; Google OAuth + Apple Sign In configured
- All 5 migrations applied; seed (254 items) applied
- Edge Function `notify-feedback` deployed (v8) — needs `RESEND_API_KEY` secret

## Fly.io

- App: `cagri-api` — `https://cagri-api.fly.dev`
- Region: `cdg` (Paris, near Supabase eu-west)
- Config: `fly.toml` (repo root)
- Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (set via `flyctl secrets set`)
- GitHub Actions: `FLY_API_TOKEN` secret (replace `GCP_SA_KEY`)
- Free tier: shared-cpu-1x, 256MB RAM, always-on (min_machines_running = 1)

## EAS / Expo

- EAS Project ID: `f732fcd2-cf13-4e9e-bf15-496da79cfb85`
