# Draft System Plan (Dynamic Teams + Automation)

## Decisions (locked)
- Auto-finalize draft after the last pick.
- Lock roster when the draft starts (no join/leave; admin removal allowed).
- Players cannot leave while draft is ready/in_progress; leaving after completed triggers a reset.
- Auto-reset draft if a confirmed player drops after teams are set.
- Use a real `ready` state, but auto-start immediately when captains are assigned.
- Support variable captain count (2, 3, 4, ...) and dynamic team counts.
- Validate even teams before starting (confirmedCount % captainCount === 0).
- Require full confirmed roster before captains can be assigned:
  - confirmedCount === capacity
  - attendanceConfirmedCount === capacity
- Draft can only start inside the 24h confirmation window.
- Draft starts as soon as captains are picked (no manual "Start draft" step).
- Draft pick order is randomized at start.
- Add automated draft notifications (ready, start, pick, complete, reset).

## Target State Machine

pending
- roster open; no captains required
- admin can assign captains when roster is full and confirmed

ready
- captains assigned; roster locked to prevent churn
- immediately transitions to in_progress after ready notification is sent

in_progress
- picks follow snake order across N teams
- auto-finalize when all confirmed players are drafted

completed
- teams locked; results enabled
- roster changes force auto-reset to pending

Transitions
- pending -> ready: admin assigns captains (does not create teams)
- ready -> in_progress: auto-start (creates teams + inserts captains)
- in_progress -> completed: last pick auto-finalizes
- in_progress/completed -> pending: roster change after teams are set
- completed -> pending: admin reset

## Data Model Changes
- `game_captains.slot` must support N slots; remove the 1..2 check constraint.
- Track team count on the game (`draft_team_count` or derive from captains at ready).
- Enforce unique drafted player per game:
  - add `game_id` to `game_team_members`, or
  - add a unique index across `(game_id, profile_id)` via a generated column.
- Results remain winner-only for multi-team:
  - keep `game_results.winning_team_id`, allow `losing_team_id` to be null,
  - skip scores when teamCount > 2,
  - mark all non-winning teams as losses when a winner is confirmed.
- Use `attendance_confirmed_at` for draft readiness:
  - waitlist promotion keeps status `confirmed`,
  - "Confirm spot" sets `attendance_confirmed_at`.

## Backend Behavior Changes
- `games.assignCaptains` sets `draft_status = 'ready'`, validates even teams, then auto-starts the draft.
- `teams.startDraft` can become internal or be removed from client usage.
- Draft start randomizes `draft_order` for teams.
- `teams.pickPlayer`:
  - validates roster lock,
  - auto-finalizes when drafted count == confirmed count.
- Queue RPCs:
  - block join/leave when draft_status in ready/in_progress/completed,
  - if a confirmed player drops after teams are set, call `resetDraftForGame`.
- Admin removal always resets draft when draft_status != pending.
- Auto-start draft once roster refills and confirmations are complete after a reset.
- Add an admin action to clear captains without clearing roster.

## Client Changes
- Home + detail show a "Draft room" card for ready/in_progress.
- Captain selector supports N captains:
  - select count, show team size, and allow team names before start.
- Draft banner shows team count and roster lock status.
- Ready state UI is informational only (auto-start).

## Notifications
- Draft ready: "Captains set, draft starting now."
- Draft started: existing push.
- On-deck + your-turn for captains (optional but useful).
- Draft complete: existing push.
- Draft reset: "Draft reset due to roster change."

## Implementation Plan (ordered)
1) Schema/migrations for `game_captains` slots, team count, and unique draft picks.
2) Update TRPC mutations for ready/start/finalize/reset behavior.
3) Lock roster logic in queue RPCs + reset on roster changes post-start.
4) UI updates for ready state + multi-captain selection.
5) Notifications + realtime wiring updates.
6) Tests for multi-team snake turns, auto-finalize, and auto-reset flows.

## Open Decisions
- None (decisions locked for the current scope).
