# Database Schema Plan (Ground-Up)

## Enums
- `game_status`: scheduled | locked | completed | cancelled
- `queue_status`: confirmed | waitlisted | cancelled
- `result_outcome`: win | loss | draw | pending
- `draft_direction`: forward | reverse

## Core Tables
- `profiles` (existing): id (uuid, PK), name, avatar_url, jersey_number, position, role, created_at.
- `games`: id (uuid, PK), name, description, start_time, end_time, location_name, location_notes, cost_cents, capacity, waitlist_capacity, status (game_status), draft_status, draft_turn (int), draft_direction (draft_direction), created_by, created_at.
- `game_queue`: id (uuid, PK), game_id FK -> games, profile_id FK -> profiles, status (queue_status), joined_at, promoted_at, cancelled_at, attendance_confirmed_at.
- `game_captains`: id (uuid, PK), game_id FK -> games, profile_id FK -> profiles, slot (smallint).
- `game_teams`: id (uuid, PK), game_id FK -> games, name, draft_order (smallint), captain_profile_id FK -> profiles.
- `game_team_members`: id (uuid, PK), game_team_id FK -> game_teams, profile_id FK -> profiles, pick_order (smallint), assigned_at.
- `game_results`: id (uuid, PK), game_id FK -> games UNIQUE, winning_team_id FK -> game_teams, losing_team_id FK -> game_teams, winner_score (int), loser_score (int), status (pending|confirmed), reported_by FK -> profiles, reported_at.
- `game_result_events` (audit): id (uuid, PK), game_id FK -> games, payload JSONB, status_before, status_after, created_by FK -> profiles, created_at.
- `game_draft_events`: id (uuid, PK), game_id FK -> games, team_id FK -> game_teams, profile_id FK -> profiles, action (pick|undo|lock), payload JSONB, created_by FK -> profiles, created_at.
- `game_participation` (facts, replaces `game_player_stats`): id (uuid, PK), game_id FK -> games, team_id FK -> game_teams, profile_id FK -> profiles, role (captain|player), result (result_outcome), pick_order (smallint), recorded_at, start_time (cached for lead-time calcs). Unique (game_id, profile_id).

## Materialized Views / Aggregates
- `player_career_stats` (per profile): games, wins, losses, draws, goals_for, goals_against, goal_diff, win_rate, games_as_captain, recent_outcomes (array), last_played_at, close_game_record (wins/losses in 1-goal games), streaks (current, longest win, longest unbeaten), activity_30/60/90.
- `player_pair_stats` (directed profile -> teammate/rival): games_same_team, wins_same_team, draws_same_team, games_opposite_team, wins_opposite_team, last_played_at, first_played_at.
- `leaderboard_view`: ranks + metrics sourced from `player_career_stats` (overall, wins, goal_diff, captain, recent form).
- `attendance_stats` (per profile): confirmations, cancels, late_cancels, dropouts, confirm_lead_time_avg/median, cancel_lead_time_avg/median, late_cancel_rate, dropout_rate.
- `draft_value_stats` (per profile): avg_pick_order, pick_order_distribution, win_rate_by_pick_order, value_over_slot (player win rate minus baseline by slot), early_vs_late_win_rate, captain_selection_counts, captain_win_rates.

## Functions (RPC-friendly)
- `get_player_stats(profile_id)`: select from `player_career_stats`.
- `get_leaderboard(metric text)`: select from `leaderboard_view` filtered by metric.
- `get_top_teammates(profile_id, limit int default 5)`: select from `player_pair_stats` same-team rows ordered by games_same_team desc, last_played_at desc.
- `get_attendance_stats(profile_id)`: select from `attendance_stats`.
- `get_draft_stats(profile_id)`: select from `draft_value_stats`.
- `get_game_statistics(game_ids uuid[], profile_id uuid)`: counts from queue + attendance + user status.

## Indexes (key paths)
- `game_participation`: (game_id), (profile_id), (team_id), (result), (game_id, profile_id).
- `game_queue`: (game_id), (profile_id), (status), (attendance_confirmed_at).
- `game_team_members`: (game_team_id), (profile_id), (pick_order).
- `game_results`: (game_id), (status).
- Aggregates: indexes on view tables for primary filter/order fields (profile_id, games desc, rank, last_played_at).

## RLS Notes
- Participation and aggregates: allow self access; admins full access. Pair stats constrained to self (or admin). Leaderboard read-open if desired.

## Migration Outline (post-reset)
1) Create enums/domains.
2) Create `game_participation` and `game_result_events`; keep existing game/draft tables.
3) Backfill participation from current `game_team_members` + `game_results` (if history kept).
4) Create aggregates/views/materialized views; add RPC wrappers.
5) Drop `game_player_stats` and unused starter tables after cutover.***

## Stats Coverage (fields exposed via views/RPCs)
- Player career: wins, losses, draws, total games, goals_for/against, goal_diff, win_rate, games_as_captain, recent_outcomes (last N), close_game_record (one-goal games), streaks (current, longest win/unbeaten), activity (games in last 30/60/90 days), last_played_at.
- Leaderboard: ranks for overall, wins, goal_diff, captain; win_rate/goal_diff/wins/losses/games_as_captain; recent form.
- Teammate/rival: games_same_team, wins_same_team, draws_same_team, games_opposite_team, wins_opposite_team, last_played_at, first_played_at.
- Attendance: confirmations, cancels, late_cancels, dropouts, confirm_lead_time avg/median, cancel_lead_time avg/median, late_cancel_rate, dropout_rate.
- Draft: avg_pick_order, pick_order_distribution, win_rate_by_pick_order, value_over_slot (per pick), early_vs_late_win_rate, captain_selection_counts, captain_win_rates.
