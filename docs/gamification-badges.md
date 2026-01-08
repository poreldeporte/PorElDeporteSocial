# Gamification and Badges

Goal: reward consistent play with simple, visible progression and low noise.

## Tier ladder (lifetime games)
- Rookie: 5 games
- Player: 15 games
- Legend: 30 games

## Rules
- Source of truth: `stats.games` (all-time games played).
- Show only the highest tier achieved.
- If no tier is achieved yet, show progress toward Rookie.
- If Legend is achieved, show it as unlocked with a full progress bar.

## Profile UI behavior
- Badges section contains:
  - Tier badge when achieved.
  - Role badge (member/captain/admin).
  - Existing performance badges (captain, goal diff, win streak, top form).
- Progress block shows:
  - "Next badge: X" or "Legend unlocked".
  - `current/target games`.
  - Remaining games to next tier.

## Copy examples
- Next badge: Rookie · 2/5 games · 3 games to go
- Next badge: Player · 9/15 games · 6 games to go
- Legend unlocked · 30/30 games · Top tier unlocked
