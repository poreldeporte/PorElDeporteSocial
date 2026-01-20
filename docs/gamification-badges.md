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
See `docs/community-rating.md`.
