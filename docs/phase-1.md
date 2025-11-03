# Phase 1 – Community Core (Weeks 2–6)

## 1. Overview
Phase 1 upgrades the Takeout/Bento starter into a working **Por El Deporte** beta for trusted members. We layer our sports-specific schema and flows onto the reusable feature core (`packages/app`) so that:
- Players authenticate, finish profiles, and see an accurate dashboard of upcoming games.
- They can join/leave queues with clear feedback and realtime updates.
- Admins can schedule games from the web, with the same shared UI powering mobile.
- Supabase enforces the rules (capacity, membership, waitlists) through migrations, RLS, and Edge/tRPC endpoints.

This phase stops before drafts, payments, or stats—those land in later phases—but it eliminates the “starter” placeholder data and puts real Por El Deporte behavior in place.

## 2. Goals
1. **End-to-end auth & profile**: onboarding, avatar upload, profile editing, session persistence.
2. **Game discovery & queues**: list/detail pages, join/leave, waitlist handling with realtime feedback.
3. **Admin scheduling**: create/edit games with schedule, capacity, cost, status.
4. **Observability baseline**: PostHog instrumentation and Sentry error capture for the flows above.

Success means an internal community can schedule and join games without database fiddling and with clear visibility into queue status.

## 3. Scope & Deliverables

### 3.1 Product/UI
- Replace placeholder home cards with live data:
  - “Upcoming games” card uses shared hook to show next three `games` in the member’s community.
  - Queue widget shows the user’s status (`confirmed`, `waiting`, `waitlisted`) with join/leave CTA.
  - Announcement slot pulls from `posts` filtered by category `announcement`.
- Game index screen (web + mobile):
  - Filters: `status` (upcoming/live/past), date range, community (if multi-community arrives later).
  - Cards show sport, schedule, location, remaining spots, cost (derived from `cost_cents`).
- Game detail screen:
  - Top: title, badge for status, schedule, location map link (if lat/long provided later), cost.
  - Middle: description, roster slots, queue list (confirmed vs. waitlisted), queue actions.
  - Bottom: notifications stub (link to future chat).
- Queue join/leave:
  - One-button CTA that reflects membership state; uses optimistic update and toast/haptic feedback.
  - Disabled state if not a member / queue closed / capacity reached.
- Admin game form (web header “Create” CTA):
  - Fields: title, description, sport (enum), community (pre-selected for beta), start/end time, location text, cost, capacity, status.
  - Validation: required name/time/location/capacity > 0, cost >= 0, start < end.
  - Success toast and redirect to game detail (web), close modal (mobile).
- Profile completion affordances:
  - Banner on home if `profile.name` or `avatar_url` missing.
  - Post-sign-up redirect to profile edit when first login occurs.
  - Update onboarding copy (Onboarding screen) to reflect Por El Deporte story, not generic Tamagui messaging.

### 3.2 Data & Backend
- Supabase migrations:
  - Extend `events` table (consider renaming to `games` via migration + type regeneration) with:
    - `community_id` (UUID → future `communities` table, default to single seed community now).
    - `sport` (enum; start with `soccer`).
    - `location` (text or JSON for coordinates).
    - `capacity` (integer), `cost_cents` (integer).
    - `status` derived from enum (`upcoming`, `live`, `past`, `cancelled`).
    - `created_by` (FK to `profiles`), `updated_at` (trigger that updates on change).
  - Create `memberships` table with `role` enum (`player`, `captain`, `admin`) and indexes on `(community_id, user_id)`.
  - Create `game_queue` table with:
    - `position` (integer), `status` enum (`confirmed`, `waiting`, `removed`), `joined_at`.
    - Unique index on `(game_id, user_id)`, index on `(game_id, status)`.
  - Write functions for queue promotion (e.g., `promote_next_waiting_player(game_id)`).
- Row Level Security:
  - `games`: allow `select` to any member; allow `insert/update/delete` to admins; allow captains to update limited fields (status?). Deny all others.
  - `memberships`: allow `select` to self and admins. Inserts/updates via service role (admin panel later).
  - `game_queue`: allow `select` to members; allow `insert` if member and not already confirmed; allow `delete` if queue row belongs to user; admins can manage all.
- Edge/tRPC endpoints (in `packages/api`):
  - `games.list` (filters, pagination) and `games.byId`.
  - `queue.join`:
    - Checks membership, game status, existing queue entry.
    - If capacity not reached: create row with status `confirmed`; if reached: `waiting`.
    - Calls `promote_next_waiting_player` after removal events.
  - `queue.leave`: remove user row; if they were confirmed, promote next waiting.
  - Optional: `games.create` (admin only) to centralize validation rather than direct Supabase insert.
  - If renaming `events` → `games`, include migration steps to rename table, indexes, foreign keys, and update generated types + client imports in one PR.
- Shared hooks:
  - `useGames` (list with filters), `useGame(gameId)`.
  - `useGameQueue(gameId)` returning `confirmed`, `waiting`, `currentUserStatus`.
  - `useMembership()` to load member roles; used for gating admin UI.
- Seeds (`supabase/seed.sql` or `seed.ts`):
  - Single `community` row (e.g., “Por El Deporte – Brickell”) until multi-community support in Phase 4.
  - Admin profile + membership plus 8–10 player profiles with avatars and bios.
  - Three games (upcoming/live/past) with pre-populated queue rows covering `confirmed` and `waiting` cases.
  - Announcement posts (category `announcement`) and sample `events` notes for dashboard content.

### 3.3 Quality & Observability
- **Testing infrastructure**
  - Add Vitest configs for `packages/app`, `packages/ui`, `packages/api`.
  - Configure React Testing Library (web/native) and Expo Router mocks.
  - Introduce Playwright project for Next.js (runs against `yarn web` in CI).
  - Set up Detox or Expo’s E2E runner for native flows (limited to queue tests in this phase).
  - Update `turbo.json` to include `test:unit`, `test:component`, `test:e2e` pipelines.
- Tests:
  - **Unit**: queue promotion logic, Supabase service helpers (e.g., membership fetch), form validation (Zod).
  - **Component**: Home screen sections (with mocked React Query data), Create game form validations, queue CTA state transitions.
  - **Integration**: TRPC queue join/leave hitting a Supabase test instance seeded per test (use Supabase CLI or dockerized DB).
  - **E2E**: Playwright flow (login → create game → join queue) and Expo E2E flow (login → join queue → leave → see state update).
- Instrumentation:
  - PostHog events: `auth.signed_in`, `profile.completed`, `game.created`, `game.updated`, `queue.joined`, `queue.left`, `queue.full`.
  - Attach PostHog IDs to Supabase user IDs (for funnels), guard by environment variable.
  - Sentry error boundaries at Provider level; wrap tRPC handlers to log Supabase errors with context (user, game, queue id).
- Monitoring dashboards:
  - Queue join latency (difference between request and confirmation).
  - Game creation count per day (separate by platform).
  - Errors per route (Sentry + Supabase function errors view).
  - PostHog board for queue conversion (view → join).

## 4. Task Breakdown

| Area | Tasks | Owners (suggested) | Notes |
|------|-------|--------------------|-------|
| Schema | Author migrations, write RLS policies, update types | Backend | Use Supabase CLI; add migration tests; regenerate `supabase/types.ts`; document schema in `docs/phase-1.md` appendix |
| API | Implement `games.*`, `queue.*` endpoints | Backend | Extend `packages/api/src/routers`; reuse `createTRPCContext`; add error mapping |
| Shared hooks | `useGames`, `useGameQueue`, `useMembership`, `useQueueActions` | Shared | Scope React Query keys by `user.id`; include suspense-friendly states |
| UI/Web | Home dashboard, game list/detail, admin modal | Web | Use `packages/app/features/*`; create shared components in `packages/ui` as needed |
| UI/Mobile | Queue CTA, navigation guards, toasts/haptics | Mobile | Expo Router routes; leverage `expo-haptics`; ensure offline fallback states |
| Design | Update tokens, icons, Figma handoff | Design | Define Por El Deporte color palette and typography; sync with `packages/ui/themes` |
| Testing | Unit + component + integration + E2E suites | QA/Shared | Add to Turbo pipeline; set up CI caching for Supabase CLI |
| Observability | PostHog/Sentry wiring, dashboards | Shared | Environment toggles; create runbooks in `/docs/observability.md` |
| Docs | README, API usage, RLS notes, release checklist | Backend | Add `/docs/api/games.md`, `/docs/api/queue.md`; update onboarding guide |

### 4.1 Implementation Sequence (Recommended)
1. **Schema foundation**
   - Branch `feat/schema-phase-1`; create migrations for `games` (rename from `events` if desired), `memberships`, `game_queue`, enums, triggers.
   - Regenerate Supabase types, ensure TypeScript build succeeds.
   - Write RLS policies, add SQL tests (e.g., `supabase/tests/` using pgTAP or supabase CLI).
   - Seed data via `supabase/seed.ts`; document run steps.
2. **API layer**
   - Extend tRPC router: `games` (list, get, create/update), `queue` (join, leave, status).
   - Implement queue promotion helper using Supabase stored procedure or server logic.
   - Add error normalization (e.g., map `PGRST` codes to domain errors).
3. **Shared hooks & utils**
   - Build `useGames`, `useGame(gameId)`, `useGameQueue(gameId)`, `useQueueActions`.
   - Update SchemaForm definitions for admin create/edit.
   - Add React Query query key constants to avoid duplication.
4. **UI integration**
   - Refactor existing references to `events` (CreateEventForm, hooks) to use new `games` naming; update types and imports.
   - Web: overhaul home dashboard (`packages/app/features/home`), create list/detail screens, wire to APIs.
   - Mobile: ensure routes exist (`apps/expo/app`), add queue CTA with haptics, adapt layout for small screens.
   - Extract reusable UI components (GameCard, QueueCard) into `packages/ui` for story coverage.
5. **Testing & observability**
   - Implement unit tests first (queue logic, hooks).
   - Add component tests (home widgets, forms).
   - Configure Playwright + Expo E2E; create minimal scenarios.
   - Wire PostHog + Sentry (staging keys) and build dashboards.
6. **Documentation & rollout**
   - Update README (Phase 1 features, setup steps).
   - Create API docs and RLS notes.
   - Prepare release checklist (seed data, environment keys, test suites).

Each step should land in small PRs with tests to avoid large merges.

## 5. Dependencies
- Env secrets for Supabase, Expo, Next, PostHog, Sentry available in `.env` and Expo config.
- Stripe not required yet; payments deferred to Phase 3.
- Design tokens approved for Por El Deporte branding (colors, icons).
- Supabase CLI installed locally and in CI (for migrations/tests).
- Access to Expo push credentials (even if unused yet) for queue notifications test stubs.

### 5.1 Environment & Config Checklist
- `.env` contains:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_AUTH_JWT_SECRET`.
  - `POSTHOG_API_KEY`, `POSTHOG_HOST` (optional stub for dev).
  - `SENTRY_DSN` (staging).
- Expo config (`apps/expo/app.config.js`) mirrors Supabase env values via `EXPO_PUBLIC_*`.
- Ensure Supabase storage buckets `avatars`, `post-images` exist (tracked in issues) and add `queue-assets` if we store location maps later.
- Feature flag (Supabase table `feature_flags`) entry for `phase1_queue` to gate new UI if needed.

## 6. Risks & Mitigations
- **Schema rollout**: migrations may break existing local data. Use `supabase db diff` previews and document `yarn workspace @my/supabase reset` for a clean local stack.
- **Queue race conditions**: multiple joins at the same time. Mitigate with Supabase row locks or `select for update` in Edge Function; add optimistic UI rollbacks.
- **Observability noise**: instrumentation spam in dev. Guard analytics with `POSTHOG_API_KEY` presence and environment checks.
- **Testing flake**: Expo E2E runs can be slow. Schedule nightly runs and keep critical component/unit tests in fast lane.
- **Membership bootstrap**: without seeded `memberships`, RLS will block access. Include seeding step and admin tool to add members manually.
- **Cultural fit**: copy from Takeout still references Tamagui. Update to Por El Deporte voice during UI work to avoid confusing beta testers.

## 7. Acceptance Criteria
- ✅ Users can sign in, update profile, see onboarding banner dismissed after completion.
- ✅ Admin can create/edit a game; data appears on both web and mobile home screens immediately.
- ✅ Players see queue position updates within 1s on both platforms, with toast/haptic feedback.
- ✅ Failed queue join (capacity/full) shows error toast and no ghost entry is persisted.
- ✅ PostHog dashboard reflects auth, game creation, and queue events; Sentry shows rich error context for forced failures.
- ✅ CI pipeline covers lint, typecheck, unit, component tests on every PR; integration/E2E run daily.
- ✅ Supabase migrations + RLS have automated verification (tests) and documented rollback plan.
- ✅ Seed script provisions a minimum community, admin, and sample games; README explains how to load/reset data.

## 8. Timeline & Checkpoints
- **Week 0–1**:
  - Ship migrations + RLS + seeds.
  - Implement API routers (`games`, `queue`).
  - Set up testing infrastructure (Vitest, Playwright, Expo E2E scaffolding).
- **Week 1–2**:
  - Implement shared hooks and integrate with existing UI.
  - Rebuild Home dashboard, game list/detail, admin form.
  - Update design tokens and copy.
- **Week 2–3**:
  - Wire queue CTA (optimistic updates, toasts, haptics).
  - Implement membership gating, banner prompts.
  - Add component/unit tests around new flows.
- **Week 3–4**:
  - Run integration/E2E tests, fix flake.
  - Instrument PostHog/Sentry + dashboards.
  - Update documentation (API, RLS, onboarding).
- **Week 4–5**:
  - Seed staging, run internal beta (capture queue/join metrics).
  - Address feedback, polish UX copy/animations.
- **Week 5–6**:
  - Harden release checklist, finalize docs, hold retro.
  - Spin up Phase 2 planning based on insights.

## 9. Exit Checklist
- [ ] Migrations applied in staging with RLS verified.
- [ ] Shared hooks documented and consumed by both platforms.
- [ ] Tests green locally and in CI; failure alerts wired.
- [ ] Storybook updated with new components/screenshots.
- [ ] Observability dashboards shared with stakeholders.
- [ ] Retro doc capturing lessons + backlog for Phase 2.
- [ ] Admin playbook drafted (adding members, creating games, monitoring queues).
- [ ] Beta feedback logged with priority tags (blocker/major/minor).

Keep this document updated as tasks land. Any changes to scope/timeline should flow back into `docs/roadmap.md` and be communicated to the team.
