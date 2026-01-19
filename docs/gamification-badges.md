# Gamification (XP + Levels)

Goal: reward consistent participation with a simple, app-wide progression system.

## Scope
- Global (user ↔ app). Not community-specific.
- Rewards reliability and leadership, not just skill.
- Cosmetics only (no gameplay advantages).

## XP gains (per game)
- Play (rostered + attendance confirmed): +5 XP
- Win (result confirmed): +3 XP
- Captain: +2 XP
- Captain + Win: +5 XP bonus
  - Example: play + win + captain = 15 XP

## XP losses
- Drop from rostered within 24h of kickoff: -2 XP
- Drop from rostered within 3h of kickoff: -5 XP
- Drop from waitlist: 0 XP
- No-show (admin-flagged after game completes): -8 XP
- No captain-specific penalties.
- No weekly penalty cap.
- XP never drops below 0.

## Level thresholds (cumulative XP)
- L2: 20
- L3: 45
- L4: 75
- L5: 110
- L6: 150
- L7: 195
- L8: 245
- L9: 300
- L10: 360

## Weekly objectives (rotate 2–3)
- Play 2 games: +10 XP
- Confirm attendance early (define cutoff): +5 XP
- Captain a game: +10 XP
- No late drops this week (no drops within 24h): +5 XP
- Submit a result review (max 1 per game): +5 XP
- Each objective can be earned once per week.

## Unlocks (subtle, club-style)
- Avatar overlays (crest ring, captain stripe)
- Player card backgrounds (canvas/turf/jersey texture)
- Profile badges (Club Regular, Veteran)
- Nameplate trims on team cards

## Rules and invariants
- XP is awarded only when a game is completed and attendance is confirmed.
- No XP changes for cancelled games.
- No-show is an admin toggle at any time.
- Source of truth should be a per-user XP ledger; level is derived from total XP.
- Ledger entries are immutable; corrections are compensating entries.

## UI behavior
- Show level and XP on profile and player card.
- Unlocks are app-wide and persist across communities.

## Community rating (per community)
Goal: capture community-specific skill separate from global XP.

Rules:
- Public rating scoped to each community.
- Starts at 100 for new members.
- Rating is hidden until 5 completed games in the community (shown as Unrated).
- Unrated players are treated as 100 for team averages.
- Calculated only (no manual edits).
- Updates after each completed game with confirmed result.
- Rating inputs are game results only (wins/losses + scoreline for goal diff).
- Early confirmation does not affect rating.
- Streaks are tracked for display but do not change rating.
- No decay or forgiveness.
- No changes for cancelled games.
- Only rostered, attendance-confirmed players are rated (or all rostered if confirmation is disabled).

Formula (simple Elo):
- Team rating = average rating of attendance-confirmed players.
- Expected = 1 / (1 + 10^((opp - ours) / 400)).
- Result = 1 win, 0 loss (0.5 tie if supported).
- K = 32 for the first 5 games, then 16.
- Margin multiplier:
  - margin = abs(winner_score - loser_score), default 1 if no scoreline.
  - 1 goal: 1.0, 2 goals: 1.25, 3+ goals: 1.5.
- Delta = K * (result - expected) * margin.
- Apply the same delta to each participating player on the team.
- Rating floor: 0.

Player summary:
- You start at 100 and need 5 games before your rating shows.
- Wins move you up, losses move you down.
- Beating stronger teams moves you more than beating weaker teams.
- Big wins move you a bit more (when scores are entered).
