# Current State (CURRENT_STATE.md)

Last updated: 2026-06-05
Branch: `main`
GitHub: https://github.com/ismailcelik-tr/the-message

---

## 📱 Project Summary

**Çağrı (The Message)** — Turkish/English Islamic guidance mobile app. Delivers daily Quran verses, hadiths, esmaül hüsna, prayers, worship reminders, and dhikr via scheduled local push notifications. Warm, non-judgmental tone.

**Current status: iOS App Store review completed. The app is live on the App Store!**

---

## 🏗️ Architecture

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
├── fly.toml                        ← Fly.io app config (region: cdg/Paris, always-on)
├── docker-compose.yml              ← API container ONLY (no local PostgreSQL)
├── docs/privacy.html               ← Privacy policy (GitHub Pages)
└── scripts/fix-expo-gradle-plugin.js  ← Android build fix (postinstall hook)
```

**Boundary rule**: `shared` → nothing; `api` → shared only; `mobile` → shared only.

---

## 🖥️ Backend Status

### Deployment
- **Production**: Fly.io — `https://cagri-api.fly.dev` (region: cdg / Paris)
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`) — `flyctl deploy --remote-only` on push to main touching `apps/api/**`, `packages/shared/**`, `infra/docker/Dockerfile.api`, `fly.toml`
- **Always-on**: `min_machines_running = 1`, no cold start. Free tier: shared-cpu-1x, 256MB RAM.
- **Secrets on Fly.io**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (set via `flyctl secrets set`)
- **GitHub Actions secret**: `FLY_API_TOKEN`

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
- `notify-feedback`: triggered by `on_feedback_insert` DB trigger (pg_net) on `content_feedback` insert
- Fetches content text + user email, sends styled HTML email via Resend API
- `RESEND_API_KEY` added to Edge Function secrets in Supabase Dashboard.

---

## 📱 Mobile App Status (Expo SDK 54 / RN 0.81)

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

### Push Notifications
- Pure server-side push notification architecture via Expo Push Service.
- Local notification scheduling has been removed from the mobile application (`rescheduleNotifications` cancels all scheduled local notifications on boot).
- When a user changes notification preferences or enables notifications, the Expo Push Token is fetched and registered on the NestJS backend via `POST /api/push/register` (stored in the `push_tokens` table in Supabase).
- The NestJS backend running on Fly.io schedules a minute-by-minute cron job (`handleDailyPushScheduler()`) that checks active tokens and profiles to dispatch the appropriate daily bundle slot to each user via the Expo Push API.
- Silent hours (including midnight-spanning ranges) and slot boundaries are evaluated on the backend.
- Re-scheduled/registered on the backend when: `notificationEnabled`, `frequency`, `schedule`, `silentHours`, or `locale` changes.

### i18n
- Zustand preferences store hydrates async from AsyncStorage
- `App.tsx` `useEffect` calls `i18n.changeLanguage(preferences.locale)` after hydration
- Logo display: in EN locale, "The Message" is shown large (primary) on top, "Çağrı" small below — applies to both LoginScreen and OnboardingScreen
- `onboarding.subtitle` = `'The Message'` in both `tr.ts` and `en.ts`

---

## 🔑 Environment Setup

### `apps/mobile/.env.local` (gitignored)
```
EXPO_PUBLIC_API_URL=https://cagri-api.fly.dev/api
EXPO_PUBLIC_SUPABASE_URL=https://***REDACTED_SUPABASE_HOST***
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
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

# Mobile type-check only
cd apps/mobile && npx tsc --noEmit

# Mobile dev (requires native Expo build — NOT Expo Go)
npm run mobile:start              # Metro bundler
cd apps/mobile && npx expo run:ios  # first time or after native changes

# Docker (API only — no local PostgreSQL)
npm run docker:up
npm run docker:down

# EAS production build
EXPO_NO_CAPABILITY_SYNC=1 npx eas-cli build --platform ios --profile production

# Fly.io
flyctl deploy --remote-only       # manual deploy
flyctl logs                       # production logs
flyctl secrets set KEY=value      # set env secrets
```

---

## ✅ Completed Tasks

- [x] NestJS API with daily-bundle endpoint + category filtering + date-based rotation
- [x] TypeORM removed → Supabase JS client
- [x] PostgreSQL Docker container removed (Supabase only)
- [x] All Supabase migrations applied (001–005), 254-item seed
- [x] GCP Cloud Run → Fly.io migration (free tier, always-on, no cold start)
- [x] `.dockerignore` added (build context: 1.67GB → ~15MB)
- [x] `Dockerfile.api` fix: `COPY scripts/` before `npm install` (postinstall hook)
- [x] GitHub Actions CI/CD rewritten for Fly.io (`flyctl deploy --remote-only`)
- [x] DailyScreen — 5 content cards + simulated notification log
- [x] SavedScreen — grouped bookmarks, crash fix (single ScrollView, always-mounted modals)
- [x] SavedScreen — notification cards now show full content + source (matches DailyScreen style)
- [x] FocusScreen category toggles → filter DailyScreen content
- [x] Supabase auth: anonymous + email OTP (6-digit) + Google OAuth + Apple Sign In (iOS only)
- [x] Password reset flow (ResetPasswordScreen)
- [x] AppModal component — unified replacement for Alert.alert()
- [x] Preferences sync (profiles table, debounced write)
- [x] Bookmarks in Supabase (content + notification types)
- [x] Real local push notifications — 14-day rolling schedule
- [x] Per-day notification content rotation
- [x] FeedbackModal + /api/feedback + content_feedback table
- [x] Feedback email via Supabase Edge Function + Resend API
- [x] i18n (tr/en) with async hydration fix
- [x] System theme follows device dark/light mode
- [x] Silent hours with midnight-spanning range support
- [x] Pull-to-refresh on DailyScreen and SavedScreen
- [x] App Store icon: alpha channel removed (Apple requirement, PIL flatten onto white)
- [x] Logo order: EN locale shows "The Message" (large) above "Çağrı" (small) — LoginScreen + OnboardingScreen
- [x] "THE MESSAGE" → "The Message" in both locale files
- [x] App Store Connect: screenshots uploaded, metadata (TR+EN description, keywords, privacy URL) filled
- [x] GitHub Pages: `docs/privacy.html` live at `https://ismailcelik-tr.github.io/the-message/privacy.html`
- [x] App Store Connect: build submitted, waiting for Apple review
- [x] `RESEND_API_KEY` added to Supabase Edge Function `notify-feedback` secrets — feedback emails working
- [x] `DailyMessage` interface removed from `packages/shared/src/index.ts` (was `@deprecated`)
- [x] Legacy `GET /api/daily-message` endpoint removed from `app.controller.ts` + `app.service.ts`
- [x] `infra/aws/README.md` deleted (outdated AWS ECS reference)
- [x] `apps/api/seed.ts` deleted (legacy raw `pg` seed script, superseded by `supabase/seeds/001_content.sql`)
- [x] Cleaned up accidentally generated root files/directories: `app.json` (root), `ios` (root), `.expo` (root), `infra/aws` (root), and `.codex` (root) to keep workspace clean.
- [x] Refactored `ResetPasswordScreen.tsx` to replace legacy `Alert.alert` calls with the custom `AppModal` component.
- [x] **MSG-152**: Enabled preference synchronization for anonymous users in `usePreferencesSync.ts`.
- [x] **MSG-153**: Allowed anonymous users to bookmark items and view bookmarks/push log history.
- [x] **MSG-154**: Restored mood selector visibility upon tab switch and emoji tap in `DailyScreen.tsx`.
- [x] **MSG-155**: Added horizontal swipe transition support between main bottom tabs in `SwipeWrapper.tsx` and `AppNavigator.tsx`.
- [x] **MSG-156**: Localized app name to "Çağrı" for TR locale, rendered correct locale icon in About Modal.
- [x] **MSG-157**: Implemented iOS-style vertical Wheel Picker (snap-to-interval FlatList) for time settings in `TimePickerRow.tsx`.
- [x] **MSG-158**: Fixed notification slot names to display chronological index labels ("1. Bildirim", "2. Bildirim", etc.) in `SettingsScreen.tsx`, `DailyScreen.tsx`, and `notificationLog.ts`.
- [x] **MSG-159**: Added exit/dismiss ("X") button to login modal for anonymous users in `LoginScreen.tsx` and `SettingsScreen.tsx`.

---

## 🚫 What Should NOT Be Changed

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
- Email notifications: Supabase DB trigger → Edge Function → Resend only. No nodemailer in NestJS API.
- Fly.io `min_machines_running = 1` — keeps API always-on; do not set to 0

---

## 🐛 Known Bugs / Issues

1. **"Bugünün Bildirimleri" is simulated** — derives expected notifications from current schedule, not from confirmed delivery. If prefs change mid-day, card shows updated values, not what was actually scheduled.
2. **Apple Sign In in dev build** — gives `Unacceptable audience in id_token` error. Works only in production build. Not a code bug.
3. **`audio` and `article` content types** — defined in schema but no UI and no seed data. Safe to ignore.

---

## 🪵 Technical Debt / Temporary Decisions

- **No content versioning** — bookmarks store snapshot JSONB; corrections in Supabase Studio won't update old saved snapshots.
- **Single Supabase project for dev+prod** — acceptable at current scale; create separate project before scaling.
- **Content accuracy** — seed is AI-generated, reviewed at high level. Feedback mechanism handles ongoing corrections. A qualified reviewer should verify hadith translations before major scale.

---

## 🌐 Infrastructure Summary

| Service | Provider | Notes |
|---------|----------|-------|
| API | Fly.io | `cagri-api.fly.dev`, region cdg (Paris), always-on free tier |
| CI/CD | GitHub Actions | `flyctl deploy --remote-only` on push to main |
| Database + Auth | Supabase | `gpuhhpxnxrvvjappindr`, region eu-west, all migrations applied |
| Email | Resend | Via Supabase Edge Function `notify-feedback` |
| Mobile build | EAS (Expo) | Project ID: `f732fcd2-cf13-4e9e-bf15-496da79cfb85` |
| Privacy policy | GitHub Pages | `https://ismailcelik-tr.github.io/the-message/privacy.html` |
| iOS | App Store Connect | Bundle ID: `com.themessage.cagri`, live on the App Store |
