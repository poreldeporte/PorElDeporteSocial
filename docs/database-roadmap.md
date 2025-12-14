# Database Roadmap

## Current State
- Core game tables: `games`, `game_queue`, `game_captains`, `game_teams`, `game_team_members`, `game_results`, `game_draft_events`.
- Per-player stats table: `game_player_stats` (win/loss + pick_order) written on result confirmation.
- Functions: `get_game_statistics` (per-game counts + user status), `get_player_stats` (wins/losses/games), `get_player_recent_records` (recent outcomes), `get_leaderboard_all_time` (aggregates + ranks).
- Unused starter tables: `achievements`, `events`, `categories`, `posts`, `user_stats`, `referrals`, `projects`.

## Issues
- Duplicate facts: `game_player_stats` repeats data available from `game_team_members` + `game_results`, creating drift risk.
- Derivations scattered: multiple functions re-aggregate on demand instead of reading materialized aggregates; no central fact table.
- Result audit: `game_results` is a single row per game; re-reports overwrite history.
- Integrity: statuses are plain text; draws not captured; enums/domains would tighten constraints.
- Noise: unused starter tables clutter the schema.

## Target Design
- Single participation fact: `game_participation` (game_id, team_id, profile_id, role, result win|loss|draw|null, pick_order, recorded_at, started_at). Replace `game_player_stats`.
- Derived aggregates (views/materialized views):
  - `player_career_stats`: games, wins, losses, draws, goals_for/against, goal_diff, win_rate, games_as_captain, recent_outcomes, last_played_at.
  - `player_pair_stats`: per directed pair (games_together, wins_together, draws_together, last_played_at, first_played_at, games_same_team, games_opposite_team).
  - Leaderboard view/materialized view sourced from `player_career_stats` (with ranks precomputed).
- Audit: optional `game_result_events` append-only log; keep `game_results` as latest snapshot.
- Integrity: switch status/result fields to enums/domains; keep strict FKs and unique constraints; index `game_id`, `profile_id`, `team_id` hot paths.

## Migration Plan (post-focus-group/reset)
- Schema: add enums/domains; create `game_participation`; add materialized views (`player_career_stats`, `player_pair_stats`, leaderboard view).
- Backfill: migrate existing `game_player_stats` + `game_team_members` + `game_results` into `game_participation`; refresh aggregates; verify parity vs current `myStats`/leaderboard outputs.
- API: point `get_player_stats` and `get_leaderboard_all_time` RPCs (or replacements) to the new views; add `get_top_teammates` RPC backed by `player_pair_stats`.
- Cleanup: drop `game_player_stats` and unused starter tables; prune legacy functions; keep compatibility only if needed during cutover.
- Operational: refresh aggregates on result confirmation (same transaction) and on schedule; monitor query plans on indexes.

## Notes for Implementation
- Security: mirror existing RLS (self or admin) on participation and aggregates; ensure pair stats remain constrained.
- Draw support: model result enum to allow draws; update aggregation logic accordingly.
- Performance: consider materialized views with concurrent refresh for leaderboard; add covering indexes on aggregate sources.

## Stats Inventory (current + planned)
- Wins, losses, total games
- Goals for/against, goal differential, win rate
- Games as captain
- Recent outcomes (last 5: W/L)
- Leaderboard ranks (overall, wins, goal diff, captain)
- Per-game result per player and draft pick order (historical)
- Per-game counts: confirmed players, waitlisted players, attendance confirmed, requesting user’s queue status
- Most-played-with teammates/rivals (planned: games together/opposite, wins together, last played)
- Attendance reliability (planned): late-cancel rate, drop-out rate, confirm lead time, cancel lead time
- Draft signals (planned): pick order profile, value by pick order, captain selection patterns, captain effectiveness
- Streaks (planned): current streak, longest win/unbeaten streak
- Activity (planned): games played in last 30/60/90 days
