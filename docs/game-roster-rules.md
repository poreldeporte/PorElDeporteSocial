# Game Roster Rules + Admin Settings

## Core flow
1) Signup is open until kickoff.
   - Roster fills first, overflow goes to waitlist.
   - Waitlist stays open until kickoff.
2) Confirmation window opens at T-24h (configurable).
   - Reminders go out at configured local times (default 9am, 12pm, 3pm).
   - Players confirm or drop.
   - If confirmation is disabled, roster spots are treated as confirmed.
3) Crunch time at the configured deadline (default 5pm local).
   - Find roster players who are still unconfirmed.
   - Notify the full waitlist that spots are available.
   - First waitlisted players to confirm claim those spots and replace unconfirmed players.
   - If no one claims a spot by the join cutoff, the unconfirmed player stays unless an admin changes it.
4) When all roster spots are confirmed, captains can be chosen.
5) Admin selects captains.
6) Captains draft.
7) Teams are set.
   - If anyone drops after teams are set, the game resets to the pre-captains state.
8) At kickoff, new joins stop.
   - Admin can still confirm or remove players.
9) Results are entered after kickoff.
   - Until confirmed, status is "Pending results."
   - After confirmation, players can rate the game.
10) If draft mode is disabled, captains/teams/results are hidden in the app.

## Admin settings
- confirmation_window_hours_before_kickoff (default 24)
- confirmation_reminders_local_times (default 09:00, 12:00, 15:00)
- confirmation_enabled (default true)
- crunch_time_enabled (default true)
- crunch_time_start_time_local (default 17:00)
- join_cutoff_offset_minutes_from_kickoff (default 0)
- draft_mode_enabled (default true)
- waitlist_capacity (default null for unlimited)

## Notes
- "Waitlist open" should show for non-roster users when the roster is full and waitlist is open.
- "Roster full" should show when the game is locked (admin lock or post-kickoff).
