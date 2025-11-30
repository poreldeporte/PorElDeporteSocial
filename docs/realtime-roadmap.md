# Supabase Realtime Roadmap

This doc outlines how we want realtime to behave across the product, where it already works, and what’s left to operationalize.

## Goals
1. **Single source of truth:** any database change to games, rosters, drafts, or queue membership should propagate to all connected clients without manual refresh.
2. **Predictable wiring:** every screen that shows live data should import a shared hook instead of rolling its own Supabase channel logic.
3. **Minimal drift:** when realtime fires, we either update local state directly or trigger the exact React Query/TRPC invalidations we already use, keeping both paths in sync.

## Current Coverage

| Surface | Hook(s) | Tables listened to | Notes |
| --- | --- | --- | --- |
| **Games list** (Home + Schedule) | `useGamesListRealtime` | `games`, `game_queue` | Refetches `games.list` when game rows or queue counts change. |
| **Game detail** | `useGameRealtimeSync` | `games`, `game_queue`, `game_results`, `game_team_members` | Keeps roster counts, status badges, and results fresh. |
| **Draft room** | `useTeamsState` | `games`, `game_teams`, `game_team_members`, `game_draft_events` | Subscribes per team to catch picks and captain changes; throttles refetches via `scheduleRefetch`. |
| **My stats** | `useStatsRealtime` | `game_results`, queue confirm events | Lightweight invalidation of `games.myStats`. |

Supabase triggers are defined under `supabase/migrations/20250115120000_enable_draft_realtime.sql` (game-team broadcasts) and similar files. Everything routes through the shared `useSupabase()` client.

## Implementation Checklist

1. **Centralize channel lifecycle**
   - [ ] Add a tiny `useRealtimeChannel(channel, deps, onMessage)` helper under `app/utils` to standardize subscribe/unsubscribe + error logging.
   - [ ] Update `useGamesListRealtime`, `useStatsRealtime`, `useGameRealtimeSync`, `useTeamsState` to consume that helper instead of rolling their own `supabase.channel`.

2. **Document data flows per screen**
   - [ ] Each feature folder should have a README snippet describing which realtime hooks it expects (e.g., `games/detail-screen.tsx` references `useGameRealtimeSync`).
   - [ ] Add comments in hooks clarifying which TRPC queries they invalidate so devs know what stays in sync.

3. **Add coverage where missing**
   - [ ] Upcoming: waitlist view on Home currently relies on `games.list` only; confirm `useGamesListRealtime` meets requirements or add a lightweight hook scoped to `waitlist` data.
   - [ ] Player profile stats should eventually reuse `useStatsRealtime` so the dossier updates immediately after results post.

4. **Backpressure & limits**
   - [ ] Monitor Supabase channel counts; if we hit limits, consider multiplexing (single channel per game with multiple event handlers).
   - [ ] Standardize the throttle delay (currently `80ms` in `useTeamsState`); move to `constants/realtime.ts` so we can tune once.

5. **Testing & tooling**
   - [ ] Add a dev-only debug overlay/toggle that logs realtime events (helpful when verifying multi-device flows).
   - [ ] Ensure Storybook or component previews mock hooks gracefully (returning no-op channels) so UI work isn’t blocked by Supabase.
   - `EXPO_PUBLIC_DEBUG_REALTIME=true` (or `NEXT_PUBLIC_DEBUG_REALTIME=true`) enables console logging from `useRealtimeChannel`.

## Usage Patterns

```ts
// Example: keep a detail page synced
import { useGameRealtimeSync } from 'app/utils/useRealtimeSync'

export const GameDetailScreen = ({ gameId }: { gameId: string }) => {
  useGameRealtimeSync(gameId)
  // ...
}
```

```ts
// Example helper sketch
export const useRealtimeChannel = (
  channelId: string,
  onSubscribe: (channel: RealtimeChannel) => void,
  deps: DependencyList = []
) => {
  const supabase = useSupabase()
  useEffect(() => {
    const channel = supabase.channel(channelId, { config: { broadcast: { self: false } } })
    onSubscribe(channel)
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn(`[realtime] channel ${channelId} error`)
      }
    })
    return () => {
      supabase.removeChannel(channel).catch(() => {})
    }
  }, deps)
}
```

## Next Steps
1. Build the `useRealtimeChannel` helper + refactor existing hooks.
2. Audit remaining screens (Profile stats, Upcoming waitlist) to confirm whether realtime is necessary and wire it up if so.
3. Add a short “Realtime” section to `docs/frontend-roadmap.md` referencing this file so newcomers know where to start.
