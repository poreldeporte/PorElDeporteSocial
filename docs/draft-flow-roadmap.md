# Draft Experience Roadmap

## Goals
- Present the draft room as a focused control center: captains see turn status, teams, queue, and history at a glance.
- Keep each concern isolated so we can iterate without wading through a 600+ line monolith.
- Improve trust: optimistic picks feel instant, errors are explicit, and real-time updates are smooth even under load.

## Layout Strategy
1. **Header rail** (full width)
   - Game title, start time, draft status badge/actions (reset/finalize states).
2. **Primary column** (≈2/3 width on desktop, full width on mobile)
   - Turn Summary card (current round, pick number, countdown once we add timers).
   - Captain tools:
     - `CaptainSelector` while pending.
     - `DraftControls` once live: available players list with filters + “Draft” CTA per row.
   - Teams grid:
     - One card per team with captain, roster, and active indicator.
3. **Secondary column** (≈1/3 width)
   - Pick History (with infinite scroll/“view all” link).
   - Admin Tools (finalize, undo, reset).
   - Future: stats (draft pace, positional balance).
4. **Mobile handling**
   - Collapse into stacked sections with persistent “You’re on the clock” banner when relevant.

## Phased Enhancements

### Phase 1 – Structural Refactor
- Split `GameDraftScreen` into container + leaf components (TurnSummary, TeamsGrid, AvailablePlayers, PickHistory, AdminTools).
- Move `deriveDraftViewModel` into `/features/games/draft/state/` with typed selectors so subcomponents subscribe only to what they need.

### Phase 2 – UX & Feedback
- Per-player optimistic state and inline spinners; disable only the tapped row instead of the entire list.
- Surface mutation errors via toast + inline row message; auto-remove optimistic state if pick fails.
- Add empty/edge-state copy for “waiting for captains”, “draft complete”, etc., matching the new layout.

### Phase 3 – Real-time & Performance
- Narrow Supabase listeners to `INSERT/DELETE` on `game_team_members` and `game_draft_events`; throttle duplicate invalidations.
- Apply event payloads locally (e.g., append pick to history) before fallback refetch.
- Cache `playerNameLookup` and `teamNameLookup` centrally to avoid rebuilding maps in every component.

### Phase 4 – Backend Hardening
- Wrap `pickPlayer` and `undoPick` operations in transactions / RPC to prevent race conditions.
- Normalize Supabase errors (duplicate picks, invalid turn) into user-friendly messages consumed by the client.
- Emit structured events (e.g., `draft_turn_changed`) to reduce client-side inference.

### Phase 5 – Polishing / Extras
- Add timers/countdowns per pick with auto-notifications.
- Show roster composition (positions, attendance history) in team cards.
- Support spectator-focused view with read-only cards and chat hook-in.

## Next Steps
1. Align on the layout sketch above (wireframes to follow).
2. Implement Phase 1 refactor to unblock subsequent work.
3. Iterate through phases, validating with captains after each milestone.
