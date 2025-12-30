# SMS-only auth deep dive

## Goal
Replace email/password sign-in and sign-up with phone number + OTP (SMS). No email/password login.

## Current auth flow map
### Web routes
- `apps/next/pages/sign-in.tsx`
- `apps/next/pages/sign-up.tsx`
- `apps/next/pages/onboarding/profile.tsx`

### Native routes
- `apps/expo/app/(auth)/sign-in.tsx`
- `apps/expo/app/(auth)/sign-up.tsx`
- `apps/expo/app/(auth)/onboarding.tsx`
- `apps/expo/app/onboarding/profile.tsx`

### Shared auth UI and logic
- `packages/app/features/auth/sign-in-screen.tsx`
- `packages/app/features/auth/sign-up-screen.tsx`
- `packages/app/features/auth/layout.web.tsx`
- `packages/app/features/auth/onboarding-screen.tsx`
- `packages/app/utils/SchemaForm.tsx`

### Auth routing and guards
- `apps/next/middleware.ts`
- `packages/app/provider/auth/AuthProvider.tsx` (web)
- `packages/app/provider/auth/AuthProvider.native.tsx` (native)
- `packages/app/provider/auth/AuthStateChangeHandler.ts`
- `apps/expo/app/_layout.tsx`

### Supabase clients and session plumbing
- `packages/app/utils/supabase/useSupabase.ts`
- `packages/app/utils/supabase/client.native.ts`
- `packages/api/src/trpc.ts`
- `packages/app/utils/api.native.ts`

### Profile and user data
- `supabase/migrations/20230510043638_create_profiles_table.sql`
- `supabase/migrations/20250112113000_update_profiles_contact.sql`
- `supabase/migrations/20250115091500_update_profile_trigger.sql`
- `packages/app/features/profile/profile-field-schema.ts`
- `packages/app/features/profile/edit-screen.tsx`
- `packages/app/utils/useUser.ts`

### Other auth-related code
- `packages/api/src/routers/auth.ts` (email existence check; currently unused)
- `packages/app/features/settings/screen.tsx`
- `packages/app/features/auth/components` (Apple/Google and MagicLink components exist but not wired)

## Supabase auth usage and profile flow
- Phone auth uses `supabase.auth.signInWithOtp` and `supabase.auth.verifyOtp`
  in `packages/app/features/auth/sign-in-screen.tsx` and `packages/app/features/auth/sign-up-screen.tsx`.
- `public.handle_new_user()` inserts `profiles` from `raw_user_meta_data`
  in `supabase/migrations/20250115091500_update_profile_trigger.sql`.
- Profile edits update `profiles` in `packages/app/features/profile/edit-screen.tsx`.
- Display name falls back to `profile.email` or `user.phone` if name is empty
  in `packages/app/utils/useUser.ts`.

## Breakpoints for SMS-only
- Email/password routes and settings are removed.
- Display name uses profile/email/phone fallbacks for phone-only accounts.
- Phone changes are disabled in profile edit to avoid auth/profile mismatch.

## Integration decision
### Option A: Supabase phone OTP with Twilio configured in Supabase
Pros:
- Reuses existing Supabase sessions and RLS.
- Minimal backend change.
- Works with current web and native Supabase helpers.
Cons:
- Depends on Supabase SMS config and rate limits.

### Option B: Twilio Verify + custom backend
Pros:
- Full control of verification logic and anti-abuse rules.
Cons:
- Requires new endpoints and custom session creation.
- Larger change and higher risk.

Decision: Option A.

### Impacts
- Client: replace sign-in and sign-up forms with phone + OTP, update copy and validation.
- Backend: no new endpoints needed; remove email-only `checkEmail` if still unused.
- Supabase config: enable phone OTP and Twilio provider; disable email auth.

## Implementation summary
1) Replaced sign-in/sign-up with shared phone OTP flow.
2) Added post-login profile onboarding at `/onboarding/profile`.
3) Removed email/password reset and change screens/routes.
4) Added profile email support and disabled phone edits in profile form.
5) Updated Supabase trigger and types for phone + email.
6) Added multi-country phone formatting and a two-step phone/OTP UI.

## Config and env updates
- Supabase `config.toml` should disable email auth and enable phone OTP.
- For local dev/self-hosted, configure the `auth.sms` namespace in `supabase/config.toml`
  (provider + credentials) per the Supabase docs for your CLI version.
- Supabase dashboard (hosted) needs Twilio provider config (Account SID, Auth Token,
  and either Verify Service SID or Messaging Service SID, depending on provider choice).
- Env vars used by app: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`,
  `NEXT_PUBLIC_URL`, `EXPO_PUBLIC_URL`.

## Provider guidance
- Recommend Twilio Verify for OTP authentication (purpose-built, rate limits managed in Twilio).
- Twilio Programmable Messaging works for SMS but uses your own message templates and sender numbers.

## Decisions
- Phone-only auth via Supabase OTP with Twilio as SMS provider.
- Post-login onboarding for profile fields.
- US-first phone formatting with E.164 support (`+` prefix).
- Email/password and social auth removed from UI and routes.

## Phone auth UI (mobile-first)
Screen 1: Phone entry
- Background gradient: #E6F0FA to #FFFFFF.
- Title: \"Please enter your phone number\" and subtitle \"Enter phone number\".
- Country picker + calling code inside the input row, with local number formatting as-you-type.
- Country picker opens a searchable sheet with popular countries pinned.
- Helper text about yearly phone changes.
- Primary \"Next\" button at the bottom.

Screen 2: OTP verify
- Title: \"Verify your phone\" with a short instruction.
- 6-digit OTP boxes with active/filled states and auto-advance.
- Auto-submit on the 6th digit; paste 6 digits to auto-fill.
- Resend timer (30s) that becomes a link after expiry.
- \"Change number\" link back to phone entry.

Behavior
- Numeric keyboard for phone and OTP input.
- Only digits accepted; formatted display per selected country.
- Country list comes from libphonenumber-js (default US).
