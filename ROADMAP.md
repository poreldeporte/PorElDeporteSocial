Sure thing — here’s the entire plan reformatted cleanly in Markdown, ready to drop into your repo (README.md or /docs/plan.md).

⸻

🏟️ Por El Deporte — Product & Technical Plan

(Supabase + Takeout / Dev A + Dev B Edition)

⸻

0. Goals
	•	Ship fast without future rewrites: one monorepo, shared UI, one backend.
	•	Keep culture: gated community, fair queues/drafts, transparent results & payments.
	•	Operate simply: RLS at the data layer; minimal custom servers; type-safe API surface.

⸻

1. Core Stack

Layer	Tech	Owner
Mobile	Expo (RN, TypeScript) + Tamagui (+ Bento)	Dev B
Web Admin	Next.js (App Router) + Tamagui	Dev A
Backend	Supabase (Auth, Postgres, Storage, Realtime, Edge Functions + Cron)	Dev A
Data/State	React Query (server state) + Zustand (UI/session/draft) + Zod (runtime validation)	Shared
API glue	tRPC / Edge Functions (queues, draft, payments, results)	Dev A
Payments	Stripe Checkout + Webhooks (Edge)	Dev A
Push	Expo Push + Edge trigger	A (sender) / B (client)
Analytics	PostHog + Sentry	Shared


⸻

2. Monorepo Layout

ped/
  apps/
    expo/        # mobile client — Dev B
    web/         # admin (Next.js) — Dev A
  packages/
    ui/          # PED-wrapped Bento/Tamagui components — Dev B
    theme/       # tokens, light/dark, picker — Dev B
    models/      # Zod schemas + TS types (contracts) — Dev A (owner)
    api/         # React Query hooks + minimal clients — Dev A
    store/       # Zustand: auth/ui/draft — Dev B
  supabase/
    migrations/  # SQL schema/indexes/RLS — Dev A
    seed/        # seed scripts — Dev A
    functions/   # Edge Functions — Dev A
  .github/workflows/
                 # CI: typecheck, RLS red-team, Edge deploy, EAS — shared


⸻

3. MVP Scope & Responsibilities

3.1 Auth & Profile
	•	Supabase Auth (email magic link + OAuth) — A config / B flow
	•	Profile edit + avatar (Storage) — B
	•	Session persisted (SecureStore); authStore — B
	•	Zod validation (inputs) — B (using A’s schemas)

3.2 Games / Queues / Draft
	•	Games CRUD (admin web) — A
	•	Games list/detail (mobile) — B
	•	Queue (FCFS + auto-promote + push) — A (Edge/RLS) / B (UI)
	•	Draft (start / pick / lock) — A (Edge/hooks) / B (UI + draftStore)
	•	T-24 hr reminder (cron → push) — A (cron) / B (client display)

3.3 Chat
	•	Tables + hooks + RLS — A
	•	UI (MessageBubble / Composer / media) — B

3.4 Results / Stats / Leaderboard
	•	Edge results.confirm + cache job — A
	•	Dashboard & leaderboard UI — B

3.5 Payments
	•	Stripe Checkout + Webhook → Ledger — A
	•	Wallet UI (transactions) — B

3.6 Merch
	•	Shopify webview/deeplink — B

⸻

4. Data Model (Supabase) — Dev A

<details>
<summary>Click to expand schema</summary>


Identity & Access
	•	profiles(user_id PK, name, avatar_url, bio, role)
	•	memberships(id, community_id, user_id, role)

Games & Participation
	•	games(id, community_id, starts_at, ends_at, location, cost_cents, spots, created_by)
	•	game_queue(id, game_id, user_id, joined_at, status) → (game_id, joined_at)
	•	draft_picks(id, game_id, pick_no, captain_team, user_id)
	•	rosters(id, game_id, team, user_id) → (game_id, team)

Chat
	•	threads(id, scope_type, scope_id) → (scope_type, scope_id)
	•	thread_members(thread_id, user_id, role, muted)
	•	messages(id, thread_id, author_id, text, media_url, created_at) → (thread_id, created_at)
	•	message_reads(message_id, user_id, read_at)

Results & Stats
	•	results(game_id PK, teamA_score, teamB_score, confirmed_by, confirmed_at) → (confirmed_at)
	•	leaderboard_cache(user_id PK, games_played, wins, losses, win_pct, updated_at)

Payments
	•	transactions(id, user_id, game_id, amount_cents, currency, status, provider_ref, created_at) → (user_id, created_at) + unique (provider_ref)
	•	ledgers(id, game_id, user_id, debit_cents, credit_cents, reason, created_at)

Ops
	•	audit_logs(id, actor_id, action, entity, entity_id, meta, created_at)
	•	notifications(id, user_id, type, payload, sent_at)

</details>



⸻

5. RLS Policy Sketch — Dev A

Table	Policy Summary
profiles	user can select/update own; admins select all
games	visible to community members; write = admins
game_queue	user manage own; admins manage all
rosters / draft_picks	captains/admins write; members read
threads / messages	select if in thread_members; write if not muted
results	captains/admins write; members read
transactions / ledgers	user reads own; admins read all; writes via Edge (service role)


⸻

6. Server Logic (Edge / tRPC) — Dev A

Function	Purpose
queues.join/leave	validate spots → insert/delete → promote waitlist → push
draft.start/pick/lock	enforce turn order → write draft_picks → populate rosters
payments.checkout + webhook	create Stripe session; on success → write transactions + ledgers
results.confirm	validate roles → write results → update leaderboard_cache
push.send	centralized Expo push with quiet-hours and receipts


⸻

7. Client Data Layer

React Query hooks (packages/api) — Dev A

['me'], ['games'], ['game', gameId],
['queue', gameId], ['threads', scope],
['messages', threadId],
['results', gameId], ['leaderboard'], ['transactions']

Zustand stores (packages/store) — Dev B

authStore: { user, session, setUser, logout }
uiStore:   { sheetOpen, toast, theme }
draftStore:{ picks[], currentTeam, makePick() }

Zod → validate Edge responses / forms / persisted state.
Realtime events trigger invalidations from INVALIDATIONS.md.

⸻

8. UI System — Dev B
	•	Theme: Apple-style; accent #007AFF, border #E5E5EA, textSubtle #6E6E73
	•	Tokens: radii 10–14 (cards), 8–10 (controls); space 4/8/12/16/24
	•	Components (packages/ui):
Button, Input, Card, Dialog, Sheet, NavbarBlur, Segmented, Toast, ListItem, Avatar
Custom: MessageBubble, Composer, TransactionCard
	•	Motion: Reanimated springs; Haptics on join/pick/pay

⸻

9. App UX

Mobile (Expo) — Dev B
	1.	Games (list → detail → queue/draft/chat)
	2.	Chat (community + per-game threads)
	3.	Wallet (history + credits)
	4.	Profile (edit avatar/bio, logout)

Web Admin (Next.js) — Dev A
	•	Games CRUD + calendar
	•	Members (roles/invites)
	•	Payments (transactions/ledgers)
	•	Leaderboards / Results
	•	Audit logs

⸻

10. Timeline (3 Weeks → TestFlight + Admin Live)

Week	Milestones	Owner
1	Takeout setup + branding + CISupabase schema + RLS (deny-all→allow)Auth + ProfileGames list/detail + create (admin)	A+B
2	Queue join/leave (Edge + Realtime + push)Game chat + media + read receiptsDraft start/pick/lock (UI + Edge)	A+B
3	Stripe Checkout + webhook → ledgerResults confirm + W/L + leaderboard cachePolish (toasts, empty states), seedersTestFlight + Vercel launch	A+B


⸻

11. Risks & Mitigations

Risk	Mitigation
RLS mistakes	deny-all default; red-team SQL tests in CI
Schema drift	require migrations + models + hooks in same PR
Realtime bursts	paginate; index FK; FlashList on mobile
Payments dupes	Stripe idempotency + unique constraint
Push failures	Expo receipts + retry + quiet hours
Legal (double-fee)	feature flag; disable if unapproved


⸻

12. Immediate Task Board

Infra
	•	Init Takeout repo + Bento install + envs
	•	Supabase project + Storage + SMTP + Expo push keys
	•	Stripe keys + Edge webhook URL

Data/Security
	•	Create tables & indexes (as above)
	•	Implement RLS policies (deny-all → allow)
	•	Seed: sample users/games/threads

Mobile
	•	Tabs + theme picker + auth flow
	•	Games list/detail + join/leave
	•	Chat with media + read receipts
	•	Draft flow (UI + mutations)

Web Admin
	•	Auth + role gating
	•	Games CRUD + calendar
	•	Members & payments dashboards

Edge/tRPC
	•	queues.join/leave
	•	draft.start/pick/lock
	•	payments.checkout + webhook
	•	results.confirm
	•	push.send

⸻

13. CI / Quality
	•	ESLint + Prettier + typecheck
	•	RLS red-team tests
	•	Edge unit tests (queue promotion, draft order, webhook idempotency)
	•	EAS preview build + Vercel preview
	•	CODEOWNERS

/supabase         @DevA
/packages/api     @DevA
/apps/web         @DevA
/packages/ui      @DevB
/packages/store   @DevB
/apps/expo        @DevB
/packages/models  @DevA @DevB


⸻

✅ TL;DR

Use Takeout as the base.
Dev A → Supabase / Edge / Admin / Hooks.
Dev B → Expo / UI / Zustand / Screens.

Both share Zod models and React Query hooks for perfect type-safe parallel work.
Three weeks to a working MVP: TestFlight mobile + Vercel admin live.