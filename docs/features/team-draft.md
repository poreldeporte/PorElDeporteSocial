## Team Draft & Results – Technical Plan

### Goals
1. Let admins/captains split a confirmed roster into two teams entirely from the mobile app.
2. Capture draft metadata, team membership, and final results so we can display per-player records.
3. Keep the existing `draft_status` lifecycle (`pending → ready → in_progress → completed`) as the source of truth.

### Data Model

| Table | Purpose | Key Columns |
| --- | --- | --- |
| `game_teams` | Stores each team participating in a game (typically two). | `id (uuid)`, `game_id`, `name` (`Team A` / `Team B`), `order` (draft pick order), `captain_profile_id` (optional), `created_at`. |
| `game_team_members` | Tracks which profile belongs to which team. | `id`, `game_team_id`, `profile_id`, `assigned_by` (admin/captain), `assigned_at`. |
| `game_draft_events` (optional but useful) | Append-only log of draft actions. | `id`, `game_id`, `type` (`pick`, `swap`, `undo`), `payload (jsonb)`, `created_by`. |
| `game_results` | One row per game result. | `id`, `game_id`, `winning_team_id`, `losing_team_id`, `winner_score`, `loser_score`, `reported_by`, `reported_at`, `status` (`pending`, `confirmed`). |

* Existing tables used: `games`, `game_queue`, `game_captains`.
* Enums: extend `draft_status` to include `drafted` if we need a state between completed draft and played game.

### Workflow Mapping

1. **Roster Confirmation**
   - When `games.status` transitions to `locked`, we freeze queue membership (already handled).

2. **Captain Assignment**
   - Admin uses existing `game_captains` table. We expose a TRPC mutation if not already available.
   - Once both captain slots filled, set `draft_status = 'ready'`.

3. **Draft Session**
   - Kicks off when an admin (or the first captain) taps “Start Draft”; we create two `game_teams` rows (`order = 0/1`).
   - `draft_status = 'in_progress'`.
   - Captains alternate picks; each pick inserts into `game_team_members` and optionally logs to `game_draft_events`.
   - When all confirmed players are assigned: `draft_status = 'completed'`.

4. **Result Reporting**
   - After the scheduled end time, captains get a “Report Result” CTA.
   - Submitting winner/score inserts/updates `game_results`. If both captains must agree, set status to `pending` and confirm when the opposite captain acknowledges.
   - Winning/losing stats propagate via a Supabase function or nightly job to a `player_statistics` view.

### API Surface (TRPC)

Namespace suggestion: `api.games.draft` & `api.games.results`

| Procedure | Auth | Purpose |
| --- | --- | --- |
| `games.getTeams({ gameId })` | authed | Returns teams, members, draft status. |
| `games.startDraft({ gameId })` | admin | Creates base `game_teams`, flips status to `in_progress`. |
| `games.pickPlayer({ gameId, teamId, profileId })` | captain/admin | Assigns a player to a team, enforces turn order, logs event. |
| `games.undoPick({ gameId })` | admin | Pops the last event (optional). |
| `games.finalizeDraft({ gameId })` | admin | Validates roster coverage, sets `draft_status = 'completed'`. |
| `games.reportResult({ gameId, winningTeamId, winnerScore?, loserScore? })` | captain/admin | Writes/updates `game_results`. |
| `games.confirmResult({ gameId })` | opposing captain/admin | Marks result as confirmed if we require dual approval. |

Supporting query hooks: `games.myStats`, `games.upcomingWithTeams`, `games.history`.

### Mobile UI Flow

#### Draft Screen (Captains)
* Shown when `draft_status === 'in_progress'` and user is a captain or admin.
* Layout:
  - Top: Game summary + “Round X / Pick Y”.
  - Middle: Two columns for Team A/B showing drafted players.
  - Bottom sheet: Scrollable list of remaining players (confirmed roster minus assigned), sorted by join time by default with filtering (e.g., show defenders first) as a future enhancement.
* Interaction:
  - If it’s the captain’s turn → tap player to confirm pick.
  - If not the captain’s turn → show “Waiting for Team B…”.
  - Admin override: long-press player to assign manually regardless of turn.
* Edge cases: autopick when captain AFK (timeout), undo last pick (admin only).

#### Results Screen (Captains)
* After `draft_status === 'completed'` and game end time passes.
* Modal form:
  - Select winning team (Team chips).
  - Optional score fields (Team A score / Team B score).
  - Notes text area.
  - Submit button (disabled until winner selected).
* After submission:
  - We show a status pill “Awaiting opponent confirmation” or “Result recorded”.

#### Member Dashboard
* “My Games” card shows next game plus “Last Result” with W/L indicator derived from `game_results`.
* Stats summary: total games, wins, losses, attendance rate (derived from queue + results).

### Implementation Order
1. **Schema** – add the new tables/constraints/migrations; update `supabase/types.ts`.
2. **TRPC** – implement draft/result routers with validation (admin/captain role checks, turn enforcement).
3. **Mobile UI** – build the draft experience first (since it unlocks the rest of the flow), then the result submission sheet, then the dashboard stats card.
4. **Telemetry** – log draft picks/result submissions for auditing (optional).

### Outstanding Questions
1. Do we allow more than two teams per game? (Current assumption: two.)
2. Should drafts support auto-generated balanced teams if captains skip?
3. Does result confirmation require both captains, or single admin override suffices?

Once we align on these, I’ll move on to writing the migrations and TRPC handlers.***
