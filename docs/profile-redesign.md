# Profile Redesign (Player Home)

## Intent
- Make Profile the player home: identity, form, history, and verified personal info in one scroll.
- No status pill; keep actions focused on edit/share/logout.

## Experience layout (mobile-first)
1) Identity hero
   - Avatar (with PED crest overlay), name, role chip, member since, member ID.
   - Actions: primary `Edit profile`; secondary menu `Share profile`, `Log out`.
2) Performance strip
   - Metrics we have/plan (from leaderboard roadmap): games_played, wins, losses, win_rate, goals_for, goals_against, goal_diff, games_as_captain, recent_outcomes (W/L pills).
   - Each metric shows value + rank/percentile in community (no link out to leaderboard).
   - Streaks derived from recent_outcomes (e.g., win streak, attendance if available).
3) Match history
   - Last 5 played games: opponent/fixture label, date, result (W/L), scoreline if present, position/jersey when available.
   - Tapping opens game detail; CTA “View all matches” links to past games route.
   - Empty state: “No games yet — join your first run” with button to Schedule.
4) Personal info
   - Essentials: name, email, phone, position, jersey number (editable inline affordance on missing fields).
   - Background: birth date, address.
   - Collapsible sections to reduce scroll.
5) Badges
   - Real badges only: role-based (member/captain/admin), captain games, win_rate threshold, attendance streak (if data), goal_diff leader.
   - Locked/greyed badges to hint progression; no filler text blocks.

## Data & logic
- Use existing stats endpoints: myStats + leaderboard aggregates (games_played, wins, losses, win_rate, goals_for, goals_against, goal_diff, games_as_captain, recent_outcomes).
- Compute per-metric rank/percentile locally from leaderboard response; do not navigate to leaderboard.
- History: use past games endpoint (scope=past) to render last 5 with results; link “View all matches” to full history list.
- Badges: derive from role, games_as_captain, win_rate thresholds, goal_diff rank, and attendance if available.
- Realtime: keep stats invalidation; avoid subscribing when signed out.

## States
- Loading skeletons for hero avatar/stats/history tiles.
- Error toast + retry on stats/history fetch.
- Empty states for history and missing profile fields with inline edit CTA.
