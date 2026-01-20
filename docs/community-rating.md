# Community rating (per community)

Goal: community-specific skill rating, separate from global XP.

Start rating: 1500.
Rating floor: 0 (no negative ratings).
Rating visibility: show after 3 rated games (before that, display as Unrated).
Scope: ratings are per community.

## What we record per match (minimum)
- Rated? (Y/N)
  - N if teams were not set or a team was down a player due to no-show.
  - Y for all other games (attendance confirmation does not affect rating).
- Team rosters (Team A, Team B). Rostered players are the rated players.
- Goal differential for Team A: GD = goals_A - goals_B (no exact scores needed).

## Step-by-step rating math
### 1) Team rating (pre-game)
- R_A = AVERAGE(ratings of Team A players)
- R_B = AVERAGE(ratings of Team B players)
Use 1500 only for players with 0 rated games in this community.
After their first rated game, use their current rating (even if still hidden).

### 2) Expected result (Elo expectation)
- E_A = 1 / (1 + 10^((R_B - R_A) / 400))
- E_B = 1 - E_A

### 3) Actual result (from GD)
Let GD = goals_A - goals_B:
- If GD > 0, S_A = 1
- If GD = 0, S_A = 0.5
- If GD < 0, S_A = 0
- S_B = 1 - S_A
Draws are allowed when GD = 0.

### 4) Goal-diff multiplier M
Based on ABS(GD):
- ABS(GD) <= 2: M = 1.00
- ABS(GD) = 3 or 4: M = 1.25
- ABS(GD) >= 5: M = 1.50

### 5) Rating update
Base K:
- K = 50 for a player's first 3 rated games in the community.
- K = 30 after that.

For a rated match:
- Delta_A_player = K_player * M * (S_A - E_A)
- Delta_B_player = K_player * M * (S_B - E_B) (usually = -Delta_A_player)

Every player on Team A gets +Delta_A_player.
Every player on Team B gets +Delta_B_player.
No subs: all rostered players receive the full team delta.
K is per player (based on that player's rated game count in this community).
Players on the same team can receive different deltas if their K differs.
Rated game count increments only for Rated = Y games with GD present.
Rated game count is evaluated before the current game to pick K.

## No-show / down-a-man rule
If Rated = N:
- No rating changes for either team.

## Canceled or missing data
- Canceled games are not rated.
- If GD is missing, do not rate the match and fix the data before rating.

## Corrections and edits
- Rating updates are stored as deltas per game (append-only).
- Apply deltas once per game id (idempotent).
- If a result/GD changes after rating, apply an adjustment: (new_delta - old_delta) to all players.
- If a rated game is later canceled, apply the inverse of the original delta to roll it back.
- Recompute deltas using ratings as of the game (pre-game ratings), not current ratings.
Store per-game snapshots needed for adjustments: RA, RB, GD, rosters, and each player's K used.

## Roster + no-show handling
- Teams are picked before the game.
- No-shows are recorded before results are entered.
- A team is considered set when both rosters are finalized with equal player counts before result entry.
- If a no-show is flagged after rating, mark the game Rated = N and roll back the delta.
- If rosters change after rating, remove old deltas from the old roster and apply new deltas to the updated roster.
- Use the same pre-game ratings that were in effect when the game was first rated.
Rated-game counts should be decremented on rollbacks/roster corrections.

## Rounding
- Store full precision internally.
- New rating = max(0, old_rating + delta).
- Round to whole numbers for display.

## Display
- Profile only (for now).
- Right-aligned in the hero stats row.
- Before 3 rated games: show "Unrated" with 3 empty circles.
- Each rated game fills one circle; after 3, reveal the rating number.

## Timing
- Apply rating updates when the result is entered (GD present), Rated = Y, and rosters were already set.
- If a game is entered late, apply the delta at entry time.
- No backfill required before launch.

## Google Sheets formulas (drop-in)
Assume:
- RA = Team A average rating
- RB = Team B average rating
- GD = Team A goal differential (A - B)
- Rated = TRUE/FALSE
- rated_games = player's rated game count in this community
- K_player = IF(rated_games<3,50,30)

Expected (Team A):
```gs
=1/(1+10^((RB-RA)/400))
```

Actual score S_A from GD:
```gs
=IF(GD>0,1,IF(GD=0,0.5,0))
```

Multiplier M:
```gs
=IF(ABS(GD)<=2,1,IF(ABS(GD)<=4,1.25,1.5))
```

Delta for a Team A player (skip if not rated):
```gs
=IF(Rated=FALSE,0, K_player * M * (S_A - E_A))
```

Delta for a Team B player:
```gs
=IF(Rated=FALSE,0, K_player * M * (S_B - E_B))
```

## Example
Team A avg rating 1520, Team B avg rating 1480:
- E_A ~= 0.557

Case 1: Team A wins by 2 (tight, K=30)
- M = 1.00
- Delta_A_player = 30 * 1.00 * (1 - 0.557) = 13.29

Case 2: Team A wins by 4 (medium)
- M = 1.25
- Delta_A_player = 30 * 1.25 * (1 - 0.557) = 16.61

Case 3: Team A wins by 6 (blowout)
- M = 1.50
- Delta_A_player = 30 * 1.50 * (1 - 0.557) = 19.94

## Implementation checklist
- Persist per-community rating per player (float stored, integer displayed).
- Track rated-game count per player per community.
- On result entry (Rated = Y, teams set, GD present):
  - Build roster snapshot.
  - Compute RA/RB using current ratings (1500 for players with 0 rated games).
  - For each player, pick K from rated-game count before this game.
  - Compute per-player delta and apply.
  - Increment rated-game count.
  - Save per-game snapshot: RA/RB, GD, rosters, each player's K used, deltas.
- If Rated = N or canceled: no rating changes.
- If GD/result changes: apply (new_delta - old_delta) using stored snapshot inputs.
- If no-show flagged after rating: mark Rated = N, roll back deltas, decrement rated-game counts.
- If roster changes after rating: roll back old roster deltas + counts, apply new roster deltas + counts using stored pre-game ratings.
- UI: show "Unrated" with 3 circles until 3 rated games, then show integer rating on profile only.
