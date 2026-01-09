# Gamification and Badges

Goal: reward consistent play with simple, visible progression and low noise.

## Tier ladder (lifetime games)
- Rookie: 5 games
- Player: 15 games
- Legend: 30 games

## Milestone badges
- Ironman: 5 games in a row attended (most recent 5 completed games).
- Capitan: captained at least one game.
- Community builder: placeholder progress (0/3) until referrals are tracked.

## Rules
- Source of truth: `stats.games` (all-time games played).
- Show only the highest tier achieved.
- If no tier is achieved yet, show progress toward Rookie.
- If Legend is achieved, show it as unlocked with a full progress bar.
 - Capitan uses `stats.gamesAsCaptain`.
 - Ironman uses the consecutive rostered streak from the most recent past games (cancelled games ignored).
 - Community builder shows as a progress row only (fixed at 0/3 for now).

## Profile UI behavior
- Badges section contains:
  - Tier badge when achieved.
  - Role badge (member/captain/admin).
  - Milestone badges (Ironman, Capitan, Community builder).
  - Performance badges (goal diff, win streak, top form).
- Progress block shows all three tiers, Ironman streak, and community builder.

## Copy examples
- Rookie · 2/5 games
- Player · 9/15 games
- Legend · Unlocked
