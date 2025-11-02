# Por El Deporte Roadmap

## 0. Document Purpose
This living roadmap aligns product intent with the technical reality of the Takeout/Bento starter. It combines the original requirements spec (personas, pain points, user stories) with our current stack (Expo + Next + Supabase) so contributors can see **what** we are building, **why** it matters, and **how** we will deliver.

## 1. Product Vision
Create a respectful, soccer-first community hub that replaces fragmented chat workflows with a structured, real-time experience. Members discover and confirm games, track wins and losses, settle payments, and stay connected—all while preserving the curated culture that makes Por El Deporte special.

## 2. Personas
| Persona | Summary | Primary Needs |
|---------|---------|---------------|
| **Player (core member)** | Plays multiple times per week | Fast sign-ups, fair queues, transparent stats, timely reminders |
| **Captain** | Veteran player who leads drafts | Snake draft UI, roster management, result confirmation |
| **Admin/Organizer** | Curates games and community culture | Member approvals, schedule control, payments reconciliation, moderation tools |
| **Follower/Casual** | Drops in occasionally, spectates | Clean read-only experience, merch access, lightweight notifications |

## 3. Pain Points & Success Criteria
- **Queue Chaos → Structured fairness**: replace ad-hoc WhatsApp lists with server-enforced queueing, drafts, and confirmations.
- **Manual bookkeeping → Automated ledger**: payments, attendance, and stats live in the app with auditable trails.
- **Fragmented comms → Integrated chat**: conversations stay linked to games and communities with moderation tools.
- **Opaque performance → Transparent stats**: leaders, streaks, and incentives visible to keep engagement high.
- **Cultural fit → Guardrails**: onboarding, roles, and moderation maintain the invite-only community tone.

Success in each phase is measured by these criteria, not raw feature counts.

## 4. Technical Direction

### 4.1 Guiding Principles
1. **One shared feature layer** (`packages/app`) drives both Expo and Next. Platform shells only handle routing, SEO, and platform plumbing.
2. **Supabase as the source of truth**: database schema, RLS, storage, and Edge Functions own business logic. tRPC/React Query are transport layers, not alternate backends.
3. **Design system first**: extend `packages/ui` + Bento instead of inlining styling. Every new pattern becomes a reusable primitive.
4. **Evidence over speculation**: ship small, instrument everything (PostHog, Sentry, toasts), and adjust based on observed behavior.
5. **TDD where it hurts**: write failing tests before touching core flows (auth, queue, drafts, payments).

### 4.2 Current Assets (Takeout/Bento Starter)
- **Platforms**: Expo Router app (`apps/expo`) and Next.js Pages app (`apps/next`) already share screens (auth, home, create, profile, settings).
- **Design system**: Tamagui theme + Bento bundle (`packages/ui`, `bento-bundle/`) provide cards, dialogs, forms, nav shells, and motion primitives.
- **Data & Auth**: Supabase migrations for `profiles`, `events`, `projects`, `posts`, etc. Auto trigger inserts profiles on sign-up. Generated types ensure end-to-end typing.
- **Tooling**: Yarn 4 workspaces, Turbo task runner, React Query caching, SchemaForm (Zod + ts-react-form), tRPC context with Supabase auth, Storybook for UI review.

### 4.3 Stack Shift vs. Original Spec
The original roadmap assumed Firebase Auth, Socket.io, MongoDB, and custom Node services. We now rely on Expo/Next, Supabase (Postgres + auth + storage + realtime), and tRPC. Requirements stay the same, but delivery changes:
- **Auth** → Supabase Auth + JWT; Expo uses SecureStore, Next uses cookies.
- **Realtime chat & queue** → Supabase Realtime channels and Edge Functions instead of Socket.io.
- **Database** → Postgres schema with RLS instead of Mongo collections.
- **Payments** → Stripe Checkout + Supabase-led ledger tables (still honors double-fee rules).
- **Notifications** → Expo Push + scheduled Edge Functions (cron) replacing FCM/Cloud Tasks.

Mapping requirements to this stack is captured below.

### 4.4 Starter Feature Audit (Nov 2024)
| Area | What Exists Today | Gaps / Notes |
|------|-------------------|--------------|
| Authentication | Email/password sign-in, sign-up, reset flows (`packages/app/features/auth`); Supabase Auth wired for web + native; Google/Apple buttons present. | Social providers require config; onboarding copy references Tamagui starter, not Por El Deporte. |
| Profiles | Shared `EditProfileScreen` updates `profiles` table; avatar upload via Supabase Storage (`avatars` bucket); profile data available via `useUser`. | No roles, bios limited to text, no community membership model. |
| Home Dashboard | `HomeScreen` renders greetings, achievements, overview, posts, events. Uses React Query hooks (`usePostQuery`, `useEventsQuery`). | Achievements/overview use static placeholder data; events/posts rely on generic Supabase tables with sparse seeds; no queue/roster widgets. |
| Create Flows | Modal surfaces Create Event/Post/Project forms. `CreateEventForm` inserts into `events` (fields: name, description, start/end, status, profile_id). | Lacks sports-specific fields (location, capacity, cost), no validation for membership or duplicates; Create Post/Project are non-MVP. |
| Settings | Theme toggle, logout, change email/password, legal links. | No notification preferences, community settings, or payments info. |
| Supabase Schema | Tables: `profiles`, `events`, `posts`, `projects`, `achievements`, `categories`, `user_stats`, `referrals`. `events` already holds time/status; migrations seed minimal data. | No `game_queue`, `draft_picks`, `transactions`, `threads`, etc. `events` lacks capacity/location/cost; seeds commented out. |
| API Layer | tRPC router only exposes `greeting.greet`; context sets up Supabase client with RLS. | Needs feature routers for games, queue, payments. |
| Design System | `packages/ui` + `bento-bundle` include cards, toasts, dialogs, onboarding flows, form fields, nav shells; Storybook apps ready. | Requires Por El Deporte branding (colors, icons) and sports-specific components (GameCard, QueueList). |
| Testing & Tooling | Turbo commands, React Query set-up, SchemaForm, global providers, lint config. | No automated tests yet; instrumentation limited to console logs. |

Takeout delivers a polished shell with working auth, profile, forms, and styling. However, most domain features (queue, drafts, payments, stats, notifications) are absent or placeholder, guiding the phase roadmap below.

## 5. Milestones

| Phase | Timeline | Primary Goal | Release Channels |
|-------|----------|--------------|------------------|
| 0. Baseline | Weeks 0–2 | Stabilize Takeout defaults, remove starter bugs, add tests | Internal dev builds only |
| 1. MVP – Community Core | Weeks 2–6 | Auth + profiles + game listings + basic queue | Friends & family beta |
| 2. Competitive Play | Weeks 6–10 | Drafts, rosters, push notifications, analytics | Closed pilot league |
| 3. Monetization | Weeks 10–14 | Stripe checkout, wallet, transactions dashboard | Broader beta + soft launch |
| 4. Growth & Ops | Weeks 14+ | Admin tooling, reporting, automation, multi-community | Public launch |

### Phase 0 – Baseline (Weeks 0–2)
**Goals**
- Patch known bugs (loading state, modal toggles, Supabase storage errors, SecureStore adapter).
- Establish minimum automated tests (unit + component) and CI gates.
- Document developer workflow (Supabase start, env vars, running apps).

**Key Deliverables**
- Fixes for:
  - `useUser` loading guard (`packages/app/features/home/screen.tsx`).
  - Create modal state handling (`packages/ui/src/components/CreateModal.tsx`, `packages/app/utils/global-store`).
  - Event/Post create validation & error handling.
  - SecureStore adapter promise returns (`packages/app/utils/supabase/client.native.ts`).
  - React Query key scoping (`useEventQuery`, `usePostQuery`).
- Test scaffolding: Vitest + React Testing Library for shared packages, Expo Router mocks, Next component tests (Playwright optional).
- README update with “Getting started”, Supabase bucket requirements (`avatars`, `post-images`).

**Exit Criteria**
- All hot issues resolved with regression tests.
- `yarn lint`, `yarn typecheck`, `yarn test` pass locally and in CI.
- Devs can run mobile or web app against seeded Supabase without manual tweaks.

### Phase 1 – MVP: Community Core (Weeks 2–6)
**Goals**
- Users sign up/in, complete profiles, view scheduled games, and join basic queues.
- Admins can create games and manage simple rosters from the web app.

**Product Deliverables**
- Onboarding flow (email magic link/OAuth), profile completion, avatar upload.
- Home dashboard reworked to real data: upcoming games, queue position, recent posts.
- Game list/detail views with join/leave actions; queue status toasts/haptics.
- Admin create/edit game form (schedule, cost, capacity).

**Platform & Data Deliverables**
- Supabase migrations for `games`, `game_queue`, `memberships`, `notifications`.
- Edge/tRPC endpoints for queue join/leave (respect capacity, waitlist promotion).
- React Query hooks for `useGames`, `useGameQueue`, `useMembership`.
- Seed script populating default categories, statuses, sample games.

**Quality/Observability**
- Analytics baseline (PostHog events: sign-in, queue join, game create).
- Sentry integration capturing Supabase errors, TRPC failures.
- Storybook stories for new game cards, queue components, admin forms.

**Exit Criteria**
- End-to-end tests: web (Playwright) for login + game create; mobile (Detox/Expo E2E) for queue join.
- Queue operations enforce RLS policies and rate limits.
- Beta cohort (internal) can create and join games without manual DB tweaks.

### Phase 2 – Competitive Play (Weeks 6–10)
**Goals**
- Support captain-driven drafts, roster locking, push reminders, and chat for game coordination.

**Product Deliverables**
- Draft dashboard (admin/captain) with live pick order, timers, and roster summaries.
- Player view of team assignment, substitutions, and chat thread per game.
- Push notifications: draft start, pick alerts, roster changes, T-24 reminders.

**Platform & Data Deliverables**
- Supabase tables: `draft_picks`, `rosters`, `threads`, `thread_members`, `messages`.
- Edge Functions:
  - `draft.start/pick/lock` enforcing turn order & writing rosters.
  - `notifications.send` bridging game events to Expo push.
- React Query & Realtime:
  - Hooks `useDraft`, `useRoster`, `useGameThread`.
  - Supabase channel subscriptions for messages + roster updates (web & mobile).

**Quality**
- Automated contract tests for Edge Functions (Supabase CLI).
- Load test plan for drafts (simulate 2 teams, 12 picks).
- Accessibility review of draft UI + notifications preferences.

**Exit Criteria**
- Captains can complete a full draft via web UI; players see final roster on mobile.
- Push notifications deliver from staging service role to Expo test devices.
- Chat threads remain private to roster members; RLS verified.

### Phase 3 – Monetization (Weeks 10–14)
**Goals**
- Collect payments for games, track balances, show wallet history.

**Product Deliverables**
- Paywall flow: pay to join, refund when removed, admin ledger view.
- Wallet dashboard: past payments, credits, outstanding balances.
- Email receipts and in-app notifications for transactions.

**Platform & Data Deliverables**
- Supabase tables: `transactions`, `ledgers`, `pricing`, `discount_codes`.
- Stripe integration:
  - Checkout session creation (web + mobile deep link).
  - Webhook Edge Function writing `transactions` + `ledgers`.
  - Service role bridges for refunds/adjustments.
- React Query hooks for `useWallet`, `useTransactions`, `usePricing`.
- Feature flags for payments rollout (config in Supabase table).

**Quality**
- Automated Stripe webhook tests (using Stripe CLI fixtures).
- Guard rails against double charge (unique `provider_ref`).
- Analytics events: payment start, success, failure.

**Exit Criteria**
- Players can pay via Stripe Checkout and immediately join queue/draft.
- Ledger balances reconcile with Stripe logs in staging.
- Admin exports CSV summary of transactions for accounting.

### Phase 4 – Growth & Ops (Weeks 14+)
**Goals**
- Support multiple communities, advanced analytics, and smoother admin operations.

**Product Deliverables**
- Multi-community management: invites, role assignment, access control.
- Results confirmation, leaderboards, and stat tracking.
- Admin reports (engagement, revenue, attendance).
- Marketing hooks: referrals, merch webview integration, announcement banners.

**Platform & Data Deliverables**
- Supabase tables/policies for tenanting (`communities`, `memberships`, `audit_logs`).
- Edge jobs for leaderboard recompute, weekly digests, idle player nudges.
- GraphQL/TRPC endpoints for analytics dashboards.
- Automated backups, migration verification, and config snapshots.

**Quality**
- Performance profiling for large communities (hundreds of members).
- Security review of RLS + service-role functions.
- Disaster recovery drills (Supabase restore, Stripe replay).

**Exit Criteria**
- Communities operate independently with enforced RLS boundaries.
- Leaderboard & stats update within minutes of results.
- Admin tooling reduces manual operations to near-zero.

## 6. Requirement Coverage Map
| Requirement Area (from legacy spec) | Phase Coverage | Notes |
|-------------------------------------|----------------|-------|
| Authentication & Profiles | Phase 0 (stabilization), Phase 1 (MVP) | Supabase Auth replaces Firebase; profile flows shared across Expo/Next. |
| Game Operations (create, queue) | Phase 1 | `games`, `game_queue`, `memberships` tables plus queue join Edge Functions. |
| Draft & Roster Management | Phase 2 | Snake draft + roster locking implemented via Supabase functions and Realtime updates. |
| Real-Time Chat | Phase 2 | Supabase Realtime channels + message tables; moderation tools follow Phase 2. |
| Stats & Leaderboards | Phase 4 | Results confirmation + aggregation jobs build leaderboards. |
| Payments & Incentives | Phase 3 | Stripe Checkout + ledger schema deliver double-fee rule and wallet history. |
| Shopify Merch | Phase 4 | Implemented as deep link/webview surfaces in nav. |

Items marked for later phases remain on the backlog until Phase 0–3 ship.

## 7. Cross-Cutting Workstreams
### 7.1 Design System
- Expand `packages/ui` tokens to match Por El Deporte branding (colors, radius, spacing).
- Wrap common patterns (GameCard, QueueList, DraftBoard, WalletSummary) as reusable components.
- Maintain Storybook in parallel with production changes; link to design files where applicable.

### 7.2 Testing & QA
- Adopt “test pyramid”:
  - Unit: Zod schemas, utility hooks, Edge helpers.
  - Component: forms, modals, queue widgets (web + native).
  - Integration: TRPC procedures with Supabase test DB.
  - E2E: Playwright (web) + Detox/Expo (mobile).
- CI pipeline: lint → typecheck → unit → component → integration → E2E (nightly).
- Release checklist: migrations applied, feature flags set, monitors armed.

### 7.3 Observability
- Logging: structured logs for Edge Functions (JSON) with correlation IDs.
- Monitoring: Sentry (errors), PostHog (behavior), Supabase logs (DB function errors), Stripe dashboard alerts.
- Dashboards: queue join latency, draft completion time, payment conversion, active users per community.

### 7.4 Developer Experience
- Scripts:
  - `yarn db:start`, `yarn db:reset`, `yarn db:seed`.
  - `yarn web --tunnel` for mobile hitting local Next server.
  - `yarn native --lan` for Expo LAN mode.
- Enforce `.env` sync via template + preflight script (fails fast if keys missing).
- Document Supabase bucket setup, Stripe webhook tunneling, push notification credentials.

## 8. Supabase Schema Blueprint
| Domain | Tables | Notes |
|--------|--------|-------|
| Identity | `profiles`, `memberships`, `communities` | Trigger `handle_new_user` already present; extend with roles & community linkage. |
| Content | `events`, `posts`, `categories`, `achievements`, `projects` | Adapt existing tables to sports naming (consider renaming `events` → `games`). |
| Gameplay | `games`, `game_queue`, `draft_picks`, `rosters`, `results`, `notifications` | New migrations with indexes on `game_id`, `community_id`, `status`. |
| Finance | `transactions`, `ledgers`, `pricing`, `discount_codes` | Stripe refs, double-entry ledger, RLS denies direct writes from client. |
| Comms | `threads`, `thread_members`, `messages`, `message_reads` | RLS ensures only members access; enable realtime. |
| Ops | `audit_logs`, `leaderboard_cache`, `jobs` | Jobs table for scheduled tasks/cron states. |

Policies: default deny, allow `select`/`insert` only where RLS matches `auth.uid()` + community membership. Service role (Edge Functions) holds elevated credentials.

## 9. Backlog & Future Enhancements
- Social feed with highlights, reactions, and story-style media.
- Advanced stats (goal contributions, elo ratings, matchup history).
- Support for additional sports (padel, golf) with sport-specific queues.
- Direct and group messaging outside of game threads.
- Loyalty tiers or premium access windows for early sign-ups.
- Community marketplace integrations beyond Shopify (e.g., ticketing, coaching sessions).

These ideas stay off the critical path until Phase 4 completes and data confirms demand.

## 10. Risks & Open Questions
- **Compliance**: validate double-fee incentive and payments handling under local regulations.
- **Skill rating inputs**: define how we seed captain parity; options include manual scoring, win/loss history, or ELO.
- **Push delivery**: confirm Expo push quotas and plan for retries; consider fallback email for critical reminders.
- **RLS correctness**: multiple roles (player/captain/admin) make policies complex—budget time for penetration testing.
- **Historical data**: decide whether to import legacy stats or start fresh; import scripts affect schema design.
- **Scalability**: queue/draft flows depend on Supabase Realtime—monitor performance for large lobbies.

## 11. Next Actions
1. Finish Phase 0 stabilization (bug fixes + tests) and document outcomes.
2. Socialize Phase 1 spec (`docs/phase-1.md`) with stakeholders; adjust scope if requirements shift.
3. Prepare Supabase migration drafts for `games`, `game_queue`, `memberships`, and review RLS as a team.
4. Align design on MVP UI states (home dashboard, game cards, queue CTA) and update tokens in `packages/ui`.
5. Stand up observability plumbing (PostHog, Sentry) so Phase 1 telemetry is ready on day one.

## 6. Risks & Mitigations
- **Schema Drift**: migrations vs Supabase dashboard edits. Mitigation: forbid console edits; run all changes through SQL + review.
- **Offline / Network Constraints**: mobile queue/draft flows require freshness. Mitigation: clarify offline requirements early; use optimistic UI but rely on server truth.
- **Notifications Delivery**: Expo push quotas and receipt handling. Mitigation: central `notifications.send` that retries and stores receipts for reconciliation.
- **Payment Compliance**: Stripe policies for tournaments/community funds. Mitigation: involve Stripe compliance early; log identity/accounting data.
- **Team Bandwidth**: small team building broad surface. Mitigation: aggressively reuse components, avoid speculative features, schedule guard weeks for polish/QA.

## 7. Next Actions
1. Execute Phase 0 stabilization tasks (bugs + tests) and merge with proof (CI + test output).
2. Draft Supabase migration plan for Phase 1 (games/queue) and review RLS with stakeholders.
3. Align design + product on MVP UX (game list, queue join, admin create). Produce component inventory for design system updates.
4. Schedule instrumentation work (Sentry/PostHog) before MVP development so we capture real usage data from the start.

---

This roadmap is living documentation. Update it whenever the product vision, Supabase schema, or delivery priorities change. Keep it opinionated, grounded in the codebase, and brutally honest about risks and constraints.
