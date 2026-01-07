- **rls missing on new supabase tables**  
  `supabase/migrations/20240626153522_project.sql` creates several user-scoped tables without enabling row-level security or defining policies, so any authenticated client can read or write every row. Enable RLS (`alter table … enable row level security`) and add per-table policies before shipping features that touch these tables.

- **`redirect` helper crashes native builds**  
  `packages/app/utils/redirect.ts` calls `location.href`, which is undefined in Expo. The settings screen invokes it, so tapping “Our Twitter” throws on native. Use a platform-aware helper (e.g. `Linking.openURL` on native).

- **`useUser` consumers expect `isPending`**  
  `packages/app/utils/useUser.ts` only exposes `isLoading` flags, but callers such as `HomeScreen` and `SettingsLayout` check `isPending`. The check resolves to `undefined`, so the dashboard renders nothing while the session initializes. Return the `isPending` value or update consumers to use the exposed flags.

- **supabase queries ignore errors and cache per-user data**  
  `packages/app/utils/react-query/useEventQuery.ts` and `usePostQuery.ts` always return `result.data`, so Postgrest errors disappear and `isError` never triggers. Their query keys omit `user?.id`, causing cached results to bleed between accounts. Throw on `result.error` and add the user id to the key.

- **create post ignores storage failures and stale caches**  
  `packages/app/features/create/CreatePostForm.tsx` logs storage upload errors, still inserts the post with an `undefined` image URL, and never invalidates the `['posts']` query. Surface the failure, bail on insert, and invalidate/refetch posts on success.

- **create project drops billing address**  
  `packages/app/features/create/CreateProjectForm.tsx` collects `billingAddress` but only writes a subset of fields to Supabase. Persist the address columns (`street`, `us_zip_code`) or remove the inputs until the backend supports them.

- **seeder calls unsplash without credentials** _(follow-up)_  
  `supabase/seed.ts` fetches `https://api.unsplash.com/photos/random?client_id=` without a key, returning 401 and leaving `randomPhoto.urls` undefined. Provide a valid access key or guard the call before relying on it for seed data.

- **create modal can’t stay closed**  
  `packages/app/utils/global-store/index.tsx` exposes `setToggleCreateModal` without accepting the boolean Tamagui’s `Dialog` passes. The handler just flips state, so `CreateModal` immediately reopens when `onOpenChange(false)` fires or when you press the close button. Accept the next boolean value and store it in the context.

- **secure-store adapter drops async errors**  
  `packages/app/utils/supabase/client.native.ts` wraps `expo-secure-store`, but its `setItem`/`removeItem` helpers don’t return the promises from `SecureStore.*Async`. Supabase awaits those methods, so persistence can finish out of order and errors vanish. Return the promises (and optionally await them) so auth state stays consistent on native.

- **greetings fallback logger crashes on web**  
  `packages/app/features/home/components/greetings.tsx` calls `getBaseUrl()` (empty string on web) and blindly does `baseUrl.split('://')[1]`. When the tRPC request fails — exactly when this code runs — the split throws, masking the real issue. Guard for empty/relative URLs before trying to log hostnames.

- **design system depends on app layer**  
  `packages/ui/src/components/CreateModal.tsx` and `packages/ui/src/components/Onboarding.tsx` import screens and hooks from `@my/app`, forcing the UI package to pull in Expo/Next-only code. That breaks isolation for Storybook, npm packaging, and consumers who only want the component library. Move feature screens out of the UI package or pass them in so `@my/ui` stays framework-agnostic.

- **create forms treat supabase errors as success**  
  `packages/app/features/create/CreateEventForm.tsx` and `CreateProjectForm.tsx` ignore the `{ error }` return from Supabase inserts, so permission or network failures still trigger success toasts and close the modal. Check the response, forward failures to the mutation’s `onError`, and only call `onSuccess` once the insert succeeds.

- **settings general tab never marks active**  
  `packages/app/features/settings/screen.tsx` compares `pathname === 'settings/general'`, missing the leading slash, so the “General” entry never highlights even when you are on `/settings/general`. Align the comparison (and related links) with absolute paths.

- **confirmation window enforced client-side only**  
  `packages/app/features/games/useGameDetailState.ts` and `packages/app/features/home/components/game-card.tsx` gate confirmation to 24 hours pre-kickoff, but `packages/api/src/routers/queue.ts` accepts confirmations any time. Enforce the 24-hour window server-side using the game start time.
