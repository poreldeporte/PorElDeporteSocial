# Realtime Architecture & Roadmap

This note captures how realtime currently works across the PED app, what we learned from Supabase’s `realtime-main` reference service, and the concrete steps we should take next.

---

## Current Architecture Snapshot

### 1. Data-plane source of truth
- **Postgres triggers + RLS:** `supabase/migrations/20250115120000_enable_draft_realtime.sql` wires `realtime.broadcast_changes` for `games`, `game_teams`, `game_team_members`, and enables RLS policies on `realtime.messages`. The helper function mirrors the reference server’s CDC approach by invoking Supabase’s hosted Realtime extension anytime draft-related tables mutate.
- **Shared Supabase project:** All clients connect via the standard `useSupabase()` hook (`packages/app/utils/supabase/useSupabase.ts`), so auth tokens and Row Level Security keep filtering on the database side.

### 2. Client channel lifecycle
- **Channel helper:** `useRealtimeChannel` (`packages/app/utils/useRealtimeChannel.ts`) centralizes `supabase.channel` creation, status logging via `debugRealtimeLog`, and cleanup through `supabase.removeChannel`. Default config (`packages/app/constants/realtime.ts`) disables self-broadcast so we don’t double-handle optimistic updates.
- **Event processing + cache sync:** `useRealtimeSync.ts` fans out into `useGameRealtimeSync`, `useGamesListRealtime`, and `useStatsRealtime`. Each hook:
  - Subscribes to `postgres_changes` for specific tables/filters.
  - Applies targeted cache patches via `api.useUtils()` so React Query stays in sync without blanket refetches.
  - Falls back to throttled invalidations when granular patches can’t apply (e.g., unknown queue entry).
- **Draft room specialization:** `useTeamsState` (`packages/app/utils/useTeamsState.ts`) layers multiple channels (`game:*:draft-meta`, `team-members`, `draft-events`) plus debounced refetching to keep captain turns and rosters up to date.

### 3. Coverage status

| Surface | Hook(s) | Channels / tables | Notes |
| --- | --- | --- | --- |
| Home + schedule lists | `useGamesListRealtime` | `games`, `game_queue` | Patches list items for status/count deltas, throttles inserts/deletes. |
| Game detail | `useGameRealtimeSync` | `games`, `game_queue` | Mirrors list updates + patches detail queue entries, reverts to invalidate on unknown rows. |
| Draft room / results | `useTeamsState` | `games`, `game_teams`, `game_team_members`, `game_draft_events` | Multiple channels scoped by game/team IDs, debounced refetch fallback. |
| Player stats | `useStatsRealtime` | `game_results` | Simple invalidate after realtime fire. |

### 4. Resilience & observability
- **Local throttling:** `REALTIME_INVALIDATE_DELAY_MS` (120 ms) and `REALTIME_DRAFT_REFETCH_DELAY_MS` (80 ms) avoid rapid-fire refetches but are hard-coded constants today.
- **Debug hooks:** `debugRealtimeLog` (`packages/app/utils/debugRealtime.ts`) gates console logging behind env flags for Expo/Next to help diagnose channel churn.
- **Missing pieces:** We currently lack per-channel metadata (subscription counts, role requirements), auto-retry logic for `CHANNEL_ERROR`, and any persistence of realtime ops in telemetry/analytics.

---

## Reference Learnings (supabase/realtime-main)

Key practices from the upstream Elixir server we should mirror:
1. **Explicit connection contracts:** `RealtimeWeb.RealtimeChannel` enforces topic naming, join limits, and logs structured error codes (e.g., `ChannelRateLimitReached`). Even though we’re only a client, we benefit from surfacing these codes so UX can distinguish auth errors vs. pool pressure.
2. **Rate counters and partitioned supervisors:** The reference uses rate counters + per-tenant supervisors to avoid overwhelming Postgres. On the client side that translates to tracking subscription counts per screen and gracefully tearing down idle channels.
3. **Extensions registry:** `PostgresCdc` selects drivers via the configured extensions map. We already rely on Supabase’s hosted driver, but documenting which schemas/tables we expect (and why) prevents accidental schema drift.
4. **Operational telemetry:** PromEx + OpenTelemetry instrumentation give visibility into joins, disconnects, and message throughput. We need lightweight equivalents (e.g., analytics events or log hooks) to debug multi-device issues without attaching a debugger.

---

## Enhancement Roadmap

### Phase 1 – Document & Harden (now)
1. **Channel catalog:** Add a short `REALTIME.md` per feature (Games, Draft, Home) enumerating the channels/table filters they rely on, mirroring the `_realtime.tenants` registry idea from the server. Tie these docs back to `docs/realtime-roadmap.md`.
2. **Error surfacing:** Extend `useRealtimeChannel` to expose Supabase’s status callbacks (closed, error, timeout) and map them onto the same op-code vocabulary the server uses (`ChannelRateLimitReached`, `IncreaseConnectionPool`, etc.) so UI can show actionable toasts.
3. **Throttle constants as config:** Move `REALTIME_INVALIDATE_DELAY_MS` / `REALTIME_DRAFT_REFETCH_DELAY_MS` into an env-aware config (dev vs prod) and document expected budgets to avoid magic numbers.
4. **Refetch fallback hygiene:** Track when `scheduleDetailInvalidate` or `scheduleRefetch` fires because patches failed; emit a debug metric so we know which handlers still need niche fields exposed.

### Phase 2 – Expand Coverage & Control (next)
1. **Waitlist + profile parity:** Finish wiring realtime for waitlist widgets and profile stats so every user-facing dataset listed in `docs/realtime-roadmap.md` has a corresponding hook.
2. **Channel reuse + fan-out:** Borrowing from `RealtimeWeb.RealtimeChannel.Tracker`, implement a client-side registry so multiple components can share the same Supabase channel instance per topic instead of creating duplicates (saves quotas and mirrors tenant topic handling).
3. **Presence/Broadcast pilots:** Evaluate adding `realtime.broadcast` events (e.g., draft countdowns) by following the `realtime.messages` RLS example already in our migration. Document how those topics map to users/roles and ensure clients gate them.
4. **Schema change detection:** Add type-covered utilities that assert the payload shape we expect from each table (leveraging `Database` types). If Supabase adds/removes columns, we’ll fail fast instead of silently dropping fields.

### Phase 3 – Observability & Ops Readiness (later)
1. **Client metrics pipeline:** Emit structured events (channel subscribe/unsubscribe, error reason, throttled refetch count) to our analytics/logging layer, inspired by `Realtime.PromEx`. This gives us per-screen health insights.
2. **Automated load tests:** Recreate critical flows with Supabase Realtime load (using scripts similar to `realtime-main/bench`) so we can validate channel limits before launches.
3. **Disaster drills:** Document token rotation, reconnect logic, and how to swap to a dedicated Realtime instance if the hosted service becomes a bottleneck (mirroring the reference repo’s multi-region replica configuration).
4. **Operational runbooks:** Create quick-response guides outlining which error codes mean what, how to inspect Supabase logs, and how to flip feature flags to disable realtime for a surface if needed.

---

Delivering the above in order keeps us aligned with Supabase’s best practices while making sure our app’s realtime layer is understandable, observable, and resilient.
