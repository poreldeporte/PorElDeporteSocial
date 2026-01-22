# Production Readiness Plan (TestFlight → App Store)

## Goals
- Move from TestFlight to App Store safely.
- Establish clean dev/staging/prod environments.
- Keep a repeatable release process.

## Current Findings (from repo review)
- No environment separation: all EAS profiles point to the same Supabase + backend URL. (`apps/expo/eas.json`)
- `staging:device` profile uses `APP_ENV=production`. (`apps/expo/eas.json`)
- No in-app account deletion flow (required by App Store for apps with accounts).
- Unused Android permission `RECORD_AUDIO`. (`apps/expo/app.config.js`)
- No crash reporting/telemetry beyond console logs.
- Apple/Google sign-in are wired in config but not needed (phone-only).

## Target Environment Topology (recommended)
- **Supabase**: separate projects for `dev`, `staging`, `prod`.
- **Backend (Next/TRPC)**: separate deployments/URLs for `dev`, `prod` (staging optional; can point to `dev` temporarily).
- **Expo EAS**: build profiles map 1:1 to environment, each with its own `EXPO_PUBLIC_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- **EAS Update channels**: `development`, `staging`, `production`, each pinned to the same `runtimeVersion` policy (`appVersion`).

## Release Plan (phased)

### Phase 1 — Define Environments (decision stage)
- Choose and name dev/staging/prod Supabase projects.
- Confirm backend URLs for each environment.
- Confirm SMS provider environments/keys.
- Create a **private GitHub repo** and migrate the codebase.

### Phase 2 — Wiring & Cleanup
- Update `apps/expo/eas.json` with per-env URLs/keys.
- Fix `staging:device` to `APP_ENV=staging`.
- Remove Apple/Google sign-in (code + config + plugins).
- Remove unused Android permission `RECORD_AUDIO`.
- Ensure **production database is clean** (fresh project + migrations only).

### Phase 3 — Account Deletion (App Store requirement)
- Add “Delete account” flow in Settings with confirmation.
- Backend endpoint to delete or anonymize user data.
- Update Privacy Policy + Terms to reflect in-app deletion and retention.

### Phase 4 — Observability & Reliability
- Add crash reporting (Sentry or Crashlytics).
- Basic analytics for critical flows (auth, game join, rating).
- Define monitoring/alerting for backend errors.

### Phase 5 — QA & Release
- Staging build (or dev build used as staging) → TestFlight → QA checklist:
  - Phone auth
  - Profile edit + avatar upload
  - Game flow (RSVP, roster, results)
  - Ratings + leaderboard
  - Push notifications
  - Offline/poor network behavior
  - Account deletion
- Production build → submit to App Store.
- App Review notes: test account/phone + steps.

## Open Decisions (need answers)
- None (proceed with recommended defaults below).

## Next Actions (once decisions are made)
- Implement env wiring changes.
- Remove unused auth providers.
- Add account deletion flow.
- Add crash reporting.
- Prepare App Store submission assets.
- Create private GitHub repo and set branch protections.
- Provision a clean production Supabase project (migrations only, no seed data).

## Decisions (captured)
- Supabase: **separate projects** for dev/staging/prod.
- SMS provider: **Twilio**.
- Crash reporting: **Sentry** (recommended for Expo/React Native).
- Domain: **poreldeporte.com** is owned and root is on Shopify (use subdomains for API).
- Account deletion: **must not break historical data** (preserve game history).
- Sentry DSN: provided (store as `EXPO_PUBLIC_SENTRY_DSN` in EAS secrets, not committed).
- Platform: **iOS only** for now (Android later).
- Sentry scope: **production-only** for now.
- Backend hosting: **two Vercel projects** (dev + prod).
- Backend domains: `api-dev.poreldeporte.com` (dev + TestFlight), `api.poreldeporte.com` (prod).
- Account deletion UX: **Deactivate + Delete**.
- Re-signup: **new account only** (no auto-restore).
- Leaderboards: **remove deleted users**; keep history intact.
- Twilio isolation: **subaccounts** (dev + prod).
- Repo: **private GitHub** planned.
- Prod DB: **clean** project required.

## Recommendations
### Backend URLs (stable targets for native builds)
Native builds need a **stable** backend URL (can’t rely on ephemeral preview URLs). Two clean options:
- **Option A (cleanest)**: 3 separate Vercel projects with fixed domains
  - `api-dev.poreldeporte.com`
  - `api-staging.poreldeporte.com`
  - `api.poreldeporte.com`
- **Option B**: single Vercel project + fixed branch domains
  - Maintain a permanent `staging` branch with a fixed Vercel branch URL.
  - Use that URL for EAS staging builds.

### Account deletion (App Store requirement)
Recommended: **Delete auth user + remove/anonymize PII** while preserving game history.
- Delete Supabase auth user.
- Clear profile PII (name, phone, email, avatar).
- Keep game results; show original name only if user chose **Deactivate**.
This satisfies Apple’s requirement while preserving stats integrity.

### Account deletion + re-signup (policy)
Recommended UX:
- **Deactivate account**: keeps profile name for history, disables login.
- **Delete account**: removes auth user + anonymizes PII; history remains but name is removed.
- If a deleted user signs up again, treat as a **new profile** unless we build a manual restore path.
