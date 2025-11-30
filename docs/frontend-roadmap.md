# Frontend Structure Roadmap

## Phase 1 – Navigation + Layout Consistency
- Publish a single route manifest in `packages/app/navigation` describing tabs, headers, and CTA slots; have both Expo and Next import it.
- Remove duplicate “Back to games”/header logic by driving screen chrome off the manifest.
- Normalize layout shells (`layout.web.tsx`, Expo stack/tab wrappers) to read shared slot definitions so we can position sticky CTAs and guidance banners consistently.
- Audit existing navigation links (home, community, draft shortcuts) and prune redundant entry points, especially the double “Go to Draft” CTAs on the dashboard.

## Phase 2 – Modular Screens & Shared Form Fields
- Decompose heavy feature screens (starting with `games/detail`, `home/screen`, `profile/screen`) into headless hooks (`useGameDetailData`, `useHomeFeed`) plus presentational components to keep files < ~200 lines.
- Introduce a `profileFields.ts` schema (label, validation, persistence key) that powers Sign Up, Edit Profile, and onboarding. Ensure required fields (first/last name, email, phone, password) flow through both auth and profile APIs.
- Move reusable roster/draft components into `packages/app/features/games/components` and reference them from draft + detail flows to prevent drift (e.g., captain chips, pick lists).

## Phase 3 – Realtime Infrastructure
- Follow `docs/realtime-roadmap.md`: introduce a reusable `useRealtimeChannel` helper, refactor existing hooks to use it, document topics per screen, and expand coverage to waitlist/profile stats. Tie in throttling constants + dev tooling to inspect Supabase events before adding new subscriptions.

## Phase 4 – Layout Slots & Platform Adapters
- Implement slot-based layouts for sticky CTAs, floating action buttons, and guidance banners so mobile/web share intent but render with platform-appropriate containers.
- Extract platform-specific shells (`GameActionBar.native.tsx` / `.web.tsx`, `HeaderBackButton`) to eliminate inline `Platform.OS` branching.
- Document the slot system in `/docs/features` so future screens can opt in without new bespoke layout code.

## Phase 5 – QA + Hardening
- Add integration stories (Chromatic or Storybook-native) for core layouts: game detail, draft room, dashboard cards, and profile forms.
- Expand automated tests to cover realtime reducers and form-field schemas to prevent regressions as we iterate.
- Schedule weekly audits of the navigation manifest and shared schemas to ensure new features stay aligned with the roadmap.

## Phase 6 – Layout Slots Everywhere
- Extend the route manifest to describe slot needs (sticky CTA, floating nav, guidance banners) for *every* screen, including settings and legal pages.
- Update Expo drawer/tab layouts to read those slots so headers/back buttons, CTA spacing, and bottom nav offsets stay in sync with the manifest.
- Move CTA positioning logic (e.g., `GameActionBar`) fully behind slot-aware containers so feature screens no longer call `Platform.OS`.

## Phase 7 – Feature Modularization
- Split `games/detail-screen`, `home/screen`, and `profile/screen` into headless hooks (data fetching, derived state) plus leaf components under `features/.../components`.
- Share roster/draft UI blocks between detail and draft flows, and expose them to other contexts (dashboard cards) via the components barrel.
- Document patterns for new features: “hook + headless view + slot placements” with size limits (~200 lines) to keep the codebase scalable.

## Phase 8 – Realtime Expansion
- Define topic names for queues, new games, and draft picks (`game:{id}:queue`, `game:{id}:draft`, `games:created`) and subscribe dashboard widgets using `useRealtimeChannel`.
- Add optimistic UI helpers for queue actions (claim/drop/waitlist) so CTA feedback is instant while Supabase confirms.
- Track subscription metrics (open channels, event rates) and expose feature flags so we can roll out live updates screen by screen.

## Phase 9 – Verification & Tooling
- Add Storybook/visual regression coverage for layout slots, CTA bars, and profile forms.
- Introduce unit tests for shared schemas, realtime reducers, and headless hooks (e.g., `useGameDetailState`) plus smoke tests for channel helpers.
- Automate linting around manifest usage (e.g., ESLint rule ensuring Next pages call `getScreenLayout`) to prevent drift as new routes ship.
