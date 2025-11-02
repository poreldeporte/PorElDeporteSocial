# Por El Deporte — Implementation & Architecture Plan (Dev A / Dev B)

0) Objectives
	•	Ship a mobile-first MVP with an admin web in <3 weeks.
	•	Keep one coherent stack: Expo + Next.js + Tamagui (Takeout/Bento) + Supabase.
	•	Eliminate refactors by enforcing contracts-first (types → hooks → UI).

⸻

1) Team Topology & Responsibilities

Dev A — Platform / Data / Admin
	•	Supabase: schema, indexes, RLS, seeds
	•	Edge/tRPC: queues, draft, payments, results, push
	•	React Query hooks in packages/api
	•	Admin web (Next.js) screens
	•	CI for migrations, Edge deploys, red-team RLS tests

Dev B — Mobile / UI / DX
	•	Expo app (React Native) with Tamagui + Bento
	•	packages/ui (PED-wrapped components) + theme picker
	•	Zustand stores: auth, ui, draft
	•	Mobile screens & flows; push token handling
	•	CI for EAS builds; a11y & UX polish

Golden rules
	1.	Contracts before code: Zod in packages/models → hook signatures in packages/api → screens.
	2.	No fetch in screens: only consume hooks + UI components.
	3.	Deny-all RLS → allow-list with red-team tests per PR.
	4.	Explicit invalidations for every realtime event.

⸻

2) Monorepo Layout (Takeout style)

ped/
  apps/
    expo/              # mobile client
    web/               # admin (Next.js)
  packages/
    ui/                # PED-wrapped Bento/Tamagui components
    theme/             # tokens, light/dark, picker
    models/            # Zod schemas + TS types (contracts)
    api/               # React Query hooks + minimal clients
    store/             # Zustand stores (auth/ui/draft)
  supabase/
    migrations/        # SQL schema/indexes/RLS
    seed/              # seed scripts
    functions/         # Edge Functions (queues/draft/payments/results/push)
  .github/workflows/   # CI (typecheck, RLS red-team, Edge deploy, EAS trigger)


⸻

3) Core Architecture

Backend (Supabase)
	•	Postgres with Row-Level Security as primary guard
	•	Realtime → invalidate React Query keys
	•	Storage for avatars/media
	•	Edge Functions + Cron:
	•	queues.join/leave (FCFS + waitlist promote + push)
	•	draft.start/pick/lock
	•	payments.checkout (+ Stripe webhook idempotent)
	•	results.confirm (+ leaderboard cache)
	•	push.send (quiet hours, receipts)

Client Data Layer
	•	React Query for all networked/server state
	•	Zustand (light):
	•	authStore (session, user) — persisted
	•	uiStore (toasts, sheets, theme)
	•	draftStore (ephemeral pick state)
	•	Zod at boundaries (API responses, forms, persisted hydration)

UI System
	•	Tamagui + Bento via packages/ui (wrapped & re-exported)
	•	Tokens in packages/theme (Apple-ish; accent #007AFF, border #E5E5EA)
	•	Mobile expo-router or React Navigation; web Next App Router

⸻

4) Contracts (single source of truth)

packages/models (Dev A owns, Dev B reviews)

Zod schemas: Profile, Game, QueueItem, Roster, DraftPick, Thread, Message, MessageRead, Result, Transaction, Ledger.

packages/api hooks (Dev A publishes)

Reads:
	•	useMe(), useGames(), useGame(gameId)
	•	useQueue(gameId), useThreads(scope), useMessages(threadId)
	•	useRoster(gameId), useDraft(gameId)
	•	useResults(gameId), useLeaderboard(), useTransactions()

Writes (mutations):
	•	useJoinQueue(), useLeaveQueue()
	•	useDraftStart(), useDraftPick(), useDraftLock()
	•	useCheckout() (Stripe), webhook is server-only
	•	useConfirmResult()

Invalidation Map (must be maintained)
	•	messages.insert|delete → ['messages', threadId], maybe ['threads']
	•	game_queue.insert|delete|promote → ['queue', gameId], ['game', gameId]
	•	draft_picks.insert → ['draft', gameId], ['roster', gameId]
	•	results.upsert → ['results', gameId], ['leaderboard'], ['me']

⸻

5) Data Model (Supabase tables & key indexes)

Identity & Access
	•	profiles(user_id PK, name, avatar_url, bio, role)
	•	memberships(id, community_id, user_id, role)

Games & Participation
	•	games(id, community_id, starts_at, ends_at, location, cost_cents, spots, created_by)
	•	game_queue(id, game_id, user_id, joined_at, status)
idx: (game_id, joined_at)
	•	draft_picks(id, game_id, pick_no, captain_team, user_id)
	•	rosters(id, game_id, team, user_id)
idx: (game_id, team)

Chat
	•	threads(id, scope_type, scope_id) idx: (scope_type, scope_id)
	•	thread_members(thread_id, user_id, role, muted)
	•	messages(id, thread_id, author_id, text, media_url, created_at)
idx: (thread_id, created_at)
	•	message_reads(message_id, user_id, read_at)

Results & Stats
	•	results(game_id PK, teamA_score, teamB_score, confirmed_by, confirmed_at) idx: (confirmed_at)
	•	leaderboard_cache(user_id PK, games_played, wins, losses, win_pct, updated_at)

Payments
	•	transactions(id, user_id, game_id, amount_cents, currency, status, provider_ref, created_at)
idx: (user_id, created_at), unique (provider_ref)
	•	ledgers(id, game_id, user_id, debit_cents, credit_cents, reason, created_at)

Ops
	•	audit_logs(id, actor_id, action, entity, entity_id, meta, created_at)
	•	notifications(id, user_id, type, payload, sent_at)

RLS (deny-all → allow)
	•	Profiles: user select/update own; admins select all
	•	Games: select if in community; insert/update admins
	•	Queue: user can manage own queue row; admins manage all
	•	Threads/Messages: select if member; write if member & not muted
	•	Draft/Rosters: captains/admins write; members read
	•	Results: captains/admins write; members read
	•	Transactions/Ledgers: user reads own; admins read all; writes only via service role

⸻

6) Milestones & Day-by-Day Handoffs (2½ weeks)

Phase 0 (Day 0–1) — Foundations
	•	Dev A
	•	Supabase project; initial migrations (profiles, games, memberships) + deny-all RLS
	•	Seed script (3 users, 2 games)
	•	Dev B
	•	Takeout up; PED tokens; install Bento; packages/ui wrappers (Button/Input/Card/Dialog/Sheet/Toast/ListItem/Avatar/Tabs)
	•	Expo/Next shells; theme picker working

Contract PR: Commit Profile|Game|QueueItem schemas + stub hooks (useMe/useGames/useGame/useQueue) returning mocks.

Phase 1 (Day 2–4) — Auth & Games
	•	Dev A: Implement hooks with Supabase; RLS for base tables; invalidations doc
	•	Dev B: Auth flow (magic link), Profile screen, Games list/detail using hooks

Phase 2 (Day 5–7) — Queue + Push
	•	Dev A: Table game_queue; Edge queues.join/leave (FCFS + promote + push); hook mutations wired
	•	Dev B: Join/Leave UI (Sheet/Toast), device push token registration; verify invalidations

Phase 3 (Day 8–10) — Draft + Chat
	•	Dev A: Tables threads/thread_members/messages/message_reads, draft_picks/rosters; hooks useThreads/useMessages/useDraft/useRoster; Edge draft.start/pick/lock
	•	Dev B: Chat UI (MessageBubble/Composer + media upload), Draft UI (Segmented + pick list) with draftStore

Phase 4 (Day 11–13) — Payments + Results + Leaderboard
	•	Dev A: Tables transactions/ledgers, Edge payments.checkout + Stripe webhook (idempotent), results.confirm + leaderboard cache; admin web: Transactions, Results
	•	Dev B: Wallet screen; result confirm UI; leaderboard screen

Phase 5 (Day 14–16) — Hardening & Ship
	•	Dev A: RLS red-team script; unit tests (queue promotion, draft order, webhook idempotency); cron T-24h reminders; push.send
	•	Dev B: UX polish (skeletons, toasts, haptics), FlashList in chat, EAS/TestFlight + Vercel deploy

⸻

7) Definition of Ready / Done

Ready
	•	Zod schema merged; hook signature stubbed; RLS rule drafted; invalidation entry added

Done
	•	Types pass; hooks implemented; invalidations verified live
	•	RLS policy + red-team SQL test pass
	•	Screens wired with packages/ui; no fetch in screens
	•	Error states + toasts + basic a11y labels
	•	Demo script updated (auth → join → draft → chat → result → wallet)

⸻

8) CI / Quality Gates
	•	Root typecheck & build (pnpm -w typecheck build)
	•	RLS red-team script (attempt cross-team read/write) runs in CI
	•	Edge unit tests (draft rules, queue promotion, webhook idempotency)
	•	EAS preview build on main; Vercel preview for web
	•	Lint + Prettier + commit hooks

CODEOWNERS

/packages/models  @DevA @DevB
/packages/api     @DevA
/supabase         @DevA
/apps/web         @DevA
/packages/ui      @DevB
/packages/store   @DevB
/apps/expo        @DevB


⸻

9) Technical Blocking List (must clear before parallel sprint)
	•	Supabase project + initial migrations (profiles/games/memberships) + deny-all RLS
	•	packages/models initial Zod (Profile, Game, QueueItem) merged
	•	packages/api hook stubs compile (useMe/useGames/useGame/useQueue)
	•	Takeout/Bento installed; PED tokens; packages/ui base wrappers live
	•	CI green: typecheck + seed + RLS red-team script

⸻

10) Risk Controls (real ones that bite)
	•	RLS leaks → deny-all default; PR adds allow rules + red-team test
	•	Schema drift → models+migrations+hooks in same PR; root typecheck blocks merge
	•	Realtime storms → paginate; index FK columns; FlashList for chat
	•	Webhook dupes → Stripe idempotency + unique provider_ref; test
	•	Push delivery → receipts + retry with backoff; quiet hours preference
	•	Legal (double-fee) → feature flag; disable pending approval

⸻

11) What “great synergy” looks like daily
	•	10-minute async stand-up: Dev A posts changed types/hooks & invalidations; Dev B posts UI gaps.
	•	Tue/Thu 45-min contracts pairing (walk new Zod + hooks).
	•	Fri 30-min integration run: Auth → Join → Draft → Chat → Result → Wallet.

⸻