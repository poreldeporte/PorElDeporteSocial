# Draft Modes

## Goals
- Let admins choose the draft mode after captains are set and before the draft starts.
- Keep one source of truth for the chosen mode.
- Enforce eligibility rules so invalid modes never start.
- Keep the draft room UI predictable for captains.

## Scope
- Draft mode selection UI and validation.
- Draft modes: snake (current), auction (new), original (custom 2x6 only).
- Lock mode once the draft starts.

## Selection Flow
- When captains are set and `draft_status = ready`, show a draft mode selector to admins.
- Choice is required before `startDraft`.
- Once `draft_status = in_progress`, the mode is locked.
- If captains change or draft is reset, clear the mode and require a new selection.
- Non-admins only see the selected mode, not the picker.

## Eligibility Rules
- Snake: always available.
- Auction: available when captain count divides the roster (same rule as current draft start).
- Original: only available when:
  - capacity = 12
  - captain_count = 2
  - team_count = 2
- If original is ineligible, show it disabled with the reason.

## Draft Modes

### Snake (current)
- Existing behavior.
- Order is serpentine with `draft_turn` and `draft_direction`.
- Uses existing pick flow and event logging.

### Auction (new)
- Each captain has a fixed budget.
- Nomination:
  - Round-robin by team order (1,2,3,4 … 1,2,3,4).
  - Captain nominates a player with a starting bid (min $1).
  - The nominated amount is the opening bid by the nominator.
  - Nomination timer: 30s. On timeout, auto-nominate next rostered player by join order at $1.
- Bidding:
  - Open bidding by any captain.
  - Bid timer: 30s; resets on each bid.
  - If no new bid for 30s, award to the current high bid and advance.
  - If no one bids, the nominator wins at the nominated amount.
- Constraints:
  - No bid can exceed remaining budget.
  - Each team must always be able to afford at least 1 player per remaining slot.
  - Min bid increment: $1.
  - Guests are spectators only (no nominations or bids).
  - If a team is full, its captain is skipped in the nomination order.
- Admin controls:
  - Pause/resume the auction clock.
  - Redo last award (remove player, refund budget, reopen bidding).
- Defaults:
  - Budget: 100 credits.
  - Nomination timer: 30s.
  - Bid timer: 30s.
  - Min bid: $1.
  - Nomination order: starts with Team A.

### Original (custom 2x6 only)
- Two teams of six, two captains.
- Captains are assigned before the draft and removed from the pool.
- Pick count matches snake today (10 non-captain picks).
- Draft order for the 10 non-captain picks (A/B = captains):
  - A: pick 1
  - B: pick 2
  - A: pick 3
  - B: pick 4
  - A: pick 5
  - B: pick 6
  - B: pick 7
  - A: pick 8
  - B: pick 9
  - A: pick 10

## Data Model
- Add `games.draft_style` enum:
  - `snake` (default)
  - `auction`
  - `original`
- Optionally add `games.draft_style_selected_at` and `draft_style_selected_by`.
- Auction state (source of truth in `games`):
  - `draft_phase` (`nominate` | `bid` | `paused`)
  - `draft_nominee_profile_id` / `draft_nominee_guest_queue_id`
  - `draft_nomination_bid`
  - `draft_high_bid`
  - `draft_high_bid_team_id`
  - `draft_bid_expires_at`
- Auction events for audit/history:
  - event types: `nominate`, `bid`, `award`, `pause`, `resume`, `redo`
  - payload fields: `profileId`, `bid`, `nominatorId`, `winnerId`, `teamId`, `expiresAt`
- Store final bid on the pick:
  - `game_team_members.bid_amount` (null for snake/original).
- Include `bid_amount` in history/stats payloads.
- Community settings:
  - `auction_budget`
  - `auction_nomination_seconds`
  - `auction_bid_seconds`
  - `auction_min_bid_increment`

## API Surface
- `games.setDraftStyle({ gameId, draftStyle })`:
  - admin only
  - only when `draft_status` is `pending` or `ready`
  - validates eligibility rules
- `games.startDraft({ gameId })`:
  - require `draft_style` to be set
  - require eligibility rules still hold
- Auction actions:
  - `games.nominatePlayer`
  - `games.placeBid`
  - `games.awardPlayer` (server-side on timer or when bidding resolves)
  - `games.pauseAuction`
  - `games.resumeAuction`
  - `games.redoAward`

## UI
- Admin selector UI appears after captains are set:
  - segmented control or cards with short descriptions.
  - disabled states include reason text.
- Draft room header shows selected mode and keeps "Round X · Pick Y" wording.
- While in `ready` state (before start), show an empty room message: "Draft coming soon. Stay tuned."
- Auction UI needs:
  - team budgets
  - current nomination + timer
  - current high bid
  - bid controls

## Edge Cases
- Captains removed after style selection: clear `draft_style` and revert to `ready`.
- Roster size changes after style selection:
  - if original becomes ineligible, block start and show reason.
- Draft reset should clear style by default.

## Open Questions
- Where should bid amounts surface in UI: draft history, player stats, game summary?
- Should auction settings be community-only or allow per-game overrides?
