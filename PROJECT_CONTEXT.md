# Project Context: Çağrı (The Message)

Core product values, design decisions, feature scope, and architecture for **Çağrı (The Message)**.

---

## 1. Product Vision

Çağrı is an Islamic guidance app designed to inspire hope, cultivate purpose, and foster sustainable spiritual practice. It stands in contrast to heavy, traditional, or transactional Islamic apps.

### Tone Guidelines
- **Inviting, not preachy** — warm, soft, never judgmental
- **Quiet presence** — notifications are light and readable, not alarming
- **Micro-habits** — brief moments of tefekkür and dhikr, not demands for lifestyle overhaul

---

## 2. Visual Design System

Modern aesthetic — avoid green-and-gold Islamic clichés.

| Mode | Background | Primary | Accent |
|------|-----------|---------|--------|
| Light | `#F4F7F6` (soft mint) | `#2A4B3D` (forest sage) | warm sand / `#7FA899` |
| Dark | `#1A1D1C` (warm charcoal) | `#A0C4B6` (soft jade) | — |

- **UI**: glassmorphism-style rounded cards, smooth toggles
- **Typography**: modern sans-serif for UI labels; classical serif for quoted content

---

## 3. Feature Scope

### In Scope (MVP — fully implemented)
- Daily content delivery: Quran verses, hadiths, esmaül hüsna, prayers, worship reminders, dhikr
- Push notifications: 1x / 3x / 5x per day (low/medium/high), 14-day rolling schedule
- Silent hours (do-not-disturb) with midnight-spanning range support
- Daily content rotation: different content per calendar day (date-seeded)
- Category preferences (hope, purpose, worship, prayer, dhikr) — filter both display and notifications
- Bookmarks: save content items; grouped by type in SavedScreen
- Content feedback: report errors (wrong text, wrong source, missing text, other)
- Auth: anonymous, email OTP (6-digit), Google OAuth, Apple Sign In (iOS only)
- Password reset flow
- Light / dark / system theme (follows device setting when `system`)
- Turkish + English i18n

### Out of Scope (do not introduce)
- AI / AWS Bedrock
- Payments, premium tiers, ads
- High-intensity animations
- Audio player or article reader (types defined in schema but no UI yet)

---

## 4. Screens

| Screen | Route | Description |
|--------|-------|-------------|
| OnboardingScreen | — | First launch welcome, "Haydi Bismillah!" CTA |
| LoginScreen | — | Anonymous / Email OTP / Google / Apple |
| ResetPasswordScreen | — | Password update after email recovery link |
| DailyScreen | Tab 1 | 5 content cards + simulated notification log |
| FocusScreen | Tab 2 | Category preference toggles |
| SavedScreen | Tab 3 | Grouped bookmarks with remove + feedback |
| SettingsScreen | Tab 4 | Notification controls, theme, language, sign out |

---

## 5. Content Model

**`content_items` table** (Supabase):

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `type` | text | `verse \| hadith \| prayer \| dhikr \| esma \| worship` |
| `category` | text | `hope \| purpose \| worship \| prayer \| dhikr` |
| `recommended_time` | text | `morning \| midMorning \| noon \| afternoon \| evening` |
| `translations` | jsonb | `{ tr: { content, source?, arabicText?, transliteration? }, en: {...} }` |
| `is_active` | boolean | Soft delete flag |

**Daily bundle** (`GET /api/content/daily-bundle`): returns one item per type — `{ esma, verse, hadith, prayer, worship }`. Selection is deterministic per calendar date using Unix epoch day number as seed.

---

## 6. Notification Architecture

```
User prefs change
  → App.tsx useEffect
  → fetchDailyBundle(locale, categories, today)
  → rescheduleNotifications(prefs, todayBundle)
      ├── cancelAllScheduledNotificationsAsync()
      └── for dayOffset 0..13:
            fetchDailyBundle(locale, categories, dateStr)  ← separate API call per day
            → scheduleNotificationAsync() for each slot
```

Slot-to-content mapping:
| Slot | Content type |
|------|-------------|
| morning | verse |
| midMorning | esma |
| noon | hadith |
| afternoon | esma |
| evening | prayer |

---

## 7. Auth Flow

```
App start
  → supabase.auth.getSession()
  → onAuthStateChange listener
      ├── PASSWORD_RECOVERY → ResetPasswordScreen
      └── else → update session in store

LoginScreen options:
  1. Anonymous: signInAnonymously()
  2. Email: signInWithOtp() → 6-digit code → verifyOtp()
  3. Google: startAsync(authUrl) → parse hash fragment → setSession(access_token, refresh_token)
  4. Apple (iOS only): signInAsync() → credential → signInWithIdToken()
```

---

## 8. Feedback Email Pipeline

```
User submits FeedbackModal
  → POST /api/feedback
  → INSERT INTO content_feedback
  → DB trigger: on_feedback_insert (pg_net)
  → Supabase Edge Function: notify-feedback
  → Resend API → HTML email to admin
```

Required secret: `RESEND_API_KEY` in Edge Function environment (Supabase Dashboard → Edge Functions → notify-feedback → Secrets).

---

## 9. Infrastructure

| Service | Provider | Notes |
|---------|----------|-------|
| Mobile build | EAS (Expo) | Project ID: `f732fcd2-cf13-4e9e-bf15-496da79cfb85` |
| API hosting | Fly.io | `cagri-api.fly.dev`, region cdg (Paris), always-on free tier |
| CI/CD | GitHub Actions | `flyctl deploy --remote-only` on push to main |
| Database + Auth | Supabase | `gpuhhpxnxrvvjappindr`, all migrations applied |
| Email | Resend | Via Supabase Edge Function `notify-feedback` |
| Privacy policy | GitHub Pages | `https://ismailcelik-tr.github.io/the-message/privacy.html` |
| iOS | App Store Connect | Bundle ID: `com.themessage.cagri`, submission in progress |
