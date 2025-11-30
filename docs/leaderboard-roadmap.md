# Leaderboard Roadmap

## Goal
Ship an all-time player leaderboard in the Expo app showing meaningful rankings (overall, wins, goal differential, captain games) with accurate data from Supabase.

## Data model & backend
- Create a Supabase RPC/view (e.g., `get_leaderboard_all_time`) that returns per-player aggregates:
  - games_played, wins, losses, win_rate
  - goals_for, goals_against, goal_diff
  - games_as_captain
  - recent_outcomes (last 5 W/L)
  - profile metadata (id, name, avatar_url, jersey_number, position)
- Compute aggregates from:
  - `game_team_members` (who played)
  - `game_teams` + `game_results` (winner/loser + scores for GF/GA)
  - `game_captains` (captain assignments)
- Tie-break (overall): win_rate DESC, then wins DESC, then goal_diff DESC, then games_played DESC.
- Add TRPC route `stats.leaderboard` (protected) that calls the RPC, returns structured rows, and enforces sorting server-side.
- Keep scope all-time for MVP; add optional window param later (30d/season).

## Frontend (Expo)
- New screen `/leaderboard` under tabs/drawer entry:
  - Header summary cards: Top overall, Best goal diff, Most captain games.
  - Metric selector: Overall | Wins | Goal Diff | Captain.
  - List rows: rank, avatar/name, win rate (%), W-L, GD, captain games, recent form (last 5 W/L pills).
  - States: loading skeleton, error retry, empty state (if no data).
- Navigation entry:
  - Add tab or header icon; also link from Profile/Stats areas.

## Validation
- Seed local data or use existing game results; verify:
  - Players with confirmed results appear with correct W/L, GD, captain count.
  - Sorting matches server order for each metric.
  - No crash when missing scores (null GF/GA) or no results yet.

## Follow-ups (post-MVP)
- Time windows (season/30d/90d).
- Filters: minimum games played toggle.
- Web/table view for admins.
- Caching: invalidate on result submission and draft finalize events.
