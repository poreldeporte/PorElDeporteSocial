# Game Roster Rules + Admin Settings

## Definitions
- Rostered = queue status is `rostered`.
- Attendance-confirmed = rostered with `attendance_confirmed_at` set.
- Unconfirmed roster = rostered without `attendance_confirmed_at`.
- Waitlisted = queue status is `waitlisted`.
- Dropped = queue status is `dropped` with `dropped_at` set.
- Join cutoff = kickoff minus join_cutoff_offset_minutes_from_kickoff.
- Locked = player joins/drops/attendance confirmations are blocked (admin-only roster changes).
- Roster and waitlist order are both by join time ascending.
- Claim spot = action that adds a player to the roster (only when spots are open).
- Join waitlist = action that adds a player to the waitlist (when roster is full).
- Grab open spot = crunch-time action for waitlisted players to take open roster spots.

## Schema naming (canonical)
- game_queue.status: rostered | waitlisted | dropped
- game_queue.attendance_confirmed_at: attendance confirmation timestamp
- game_queue.dropped_at: drop/removal timestamp
- games.status: scheduled | completed | cancelled
- games.cancelled_at: game cancellation timestamp

## Community scope
- Every game belongs to exactly one community.
- Players must be members of a community to join its games.
- A player can join multiple communities.
- Players can join games across multiple communities they belong to.
- Rosters, waitlists, drafts, notifications, and stats are scoped to the game’s community.
- Community settings apply only to games within that community.

## Availability states
- Open: game status is scheduled, now < join cutoff, roster count < capacity.
- Waitlist open: game status is scheduled, now < join cutoff, roster count >= capacity.
- Grab-only (crunch time): game status is scheduled, confirmation_enabled is true, now >= crunch time start, now < join cutoff, roster count >= capacity, and at least one rostered player is not attendance-confirmed.
- Locked: now >= join cutoff (player actions locked; admins can still edit).
- Cancelled: game status is cancelled.
- Completed: game status is completed.

## Status derivation
- Cancelled: admin action only.
- Completed: results are confirmed.
- Locked: now >= join cutoff (derived; admins do not set).
- Scheduled: not cancelled/completed (join cutoff does not change game status).
- If kickoff or join_cutoff_offset changes, join cutoff and derived states are recalculated.

## Core flow
1) Signup is open until the join cutoff (default kickoff).
   - Claim spot adds to roster when spots are open.
   - Join waitlist adds to waitlist when roster is full.
   - Roster fills first, overflow goes to waitlist.
   - Waitlist stays open until the join cutoff.
2) Confirmation window opens at T-24h (configurable).
   - If join cutoff occurs before the confirmation window start, confirmations and crunch time are skipped.
   - Reminders go out at configured local times (default 9am, 12pm, 3pm).
   - Reminders go only to rostered players who are not attendance-confirmed.
   - Reminders only fire between the confirmation window start and the join cutoff.
   - Players confirm attendance or drop.
   - Players can only confirm attendance between confirmation window start and join cutoff.
   - If a rostered player drops before crunch time, the next waitlisted player is promoted in join order.
     - If the confirmation window is open, the promoted player is asked to confirm attendance.
     - If the confirmation window is closed, they are rostered but cannot confirm attendance yet.
   - If confirmation is disabled, roster spots are treated as attendance-confirmed and crunch time is skipped.
   - No confirmation or draft reminders are sent when confirmation is disabled.
   - Confirmation UI is hidden when disabled.
3) Crunch time at the configured deadline (default 5pm local).
   - Find rostered players who are not attendance-confirmed.
   - Notify the full waitlist that spots are available.
   - First waitlisted players to grab open spots replace unconfirmed players.
   - A successful grab is immediately attendance-confirmed.
   - Waitlisted players without an open spot stay waitlisted (no extra confirmation prompts).
   - After crunch time starts, openings are grab-only (no automatic promotions).
   - If no one grabs a spot by the join cutoff, the unconfirmed player stays unless an admin changes it.
   - Replacement order is bottom of the roster list (most recent join) to top.
   - Roster order is by join time ascending.
   - Grab tie-breaker is earliest attendance_confirmed_at timestamp, then earlier waitlist join.
4) When the roster is full, captains can be chosen.
   - If confirmation_enabled is true, all roster spots must be attendance-confirmed and it must be within the confirmation window.
   - If confirmation_enabled is false, no confirmation requirement.
   - Captains must be rostered.
   - At least two captains required.
   - Captain count must divide evenly into the roster.
   - Team count equals captain count.
5) Admin selects captains.
   - Draft auto-starts once captains are set.
6) Captains draft.
7) Teams are set.
   - If anyone drops after teams are set, the game resets to the pre-captains state.
   - Attendance confirmations persist through the reset.
   - Players cannot drop while the draft is in progress (draft_status in_progress).
   - Admin removals during a draft reset it to pre-captains state.
   - After draft completes, players can drop until the join cutoff; any drop resets to pre-captains.
8) At join cutoff, claim spot, join waitlist, drop, and attendance confirmation actions stop for players.
   - Admin can still add, mark attendance-confirmed, or remove players.
9) Results are entered after kickoff.
   - Results can be entered by the admin or either captain.
   - Captains can submit results only if captains are assigned.
   - Results require teams; no teams means no scores.
   - Captain-submitted results stay "Pending results" until confirmed by the other captain or an admin.
   - The reporting captain cannot confirm their own result.
   - Admin-submitted results are confirmed immediately.
   - Game status changes to completed when results are confirmed.
   - After confirmation, players can rate the game.
10) Draft visibility rules.
    - draft_mode_enabled=true:
      - confirmation_enabled=true: draft/captains available only within the confirmation window and after full roster attendance confirmation.
      - confirmation_enabled=false: draft is available as soon as the roster is full.
    - draft_mode_enabled=false:
      - Players do not see the draft room.
      - Admins can still use the draft room privately to create captains/teams (optional).
      - If admins create teams, captains/teams are shown on game details after admin submits.
      - Captain eligibility rules still apply.

## Action permissions
Players:
- Claim spot: allowed while status is scheduled and now < join cutoff when roster < capacity; joins as rostered.
- Join waitlist: allowed while status is scheduled and now < join cutoff when roster >= capacity; joins as waitlisted (waitlist allowed even during draft in progress).
- Drop (rostered or waitlisted): allowed while status is scheduled, now < join cutoff, and draft_status != in_progress.
- Confirm attendance: allowed only if confirmation_enabled and confirmation window start <= now < join cutoff.
- Grab open spot (crunch time): allowed only during crunch time when an open spot exists and now < join cutoff; only waitlisted players can grab; successful grab auto attendance-confirms.
- Rate game: rostered players only, after results are confirmed (status completed).

Captains:
- Draft picks: allowed while draft is in progress; admins can pick too.
- Report results: after kickoff; only if captains exist.
- Confirm results: only the other captain (not the reporter).

Admins:
- Add / remove / mark attendance-confirmed rostered players: allowed anytime (even after join cutoff or during draft).
- Admin adds obey capacity: if roster is full, new adds go to the waitlist unless capacity is increased first.
- Assign captains: allowed when roster is full; requires attendance confirmations only when confirmation_enabled is true.
- Cancel game: admin only.
- If kickoff or join_cutoff_offset changes, confirmation/crunch windows are recalculated.
- If a roster change happens after captains are set, the draft resets to pre-captains.
- If only kickoff time changes, captains/teams remain intact.

## Settings scope
Community defaults (apply to all games unless overridden):
- community_timezone (default set per community)
- confirmation_window_hours_before_kickoff (default 24)
- confirmation_reminders_local_times (default 09:00, 12:00, 15:00)
- crunch_time_enabled (default true)
- crunch_time_start_time_local (default 17:00)
- game_notification_times_local (default empty)

Per-game settings (override community defaults where applicable):
- confirmation_enabled (default true)
- join_cutoff_offset_minutes_from_kickoff (default 0)
- draft_mode_enabled (default true)
- crunch_time_start_time_local (optional per-game override)

Settings precedence: per-game override > community default > built-in default.

## Settings visibility and dependencies
- confirmation_enabled=false: hide confirmation_window_hours_before_kickoff, confirmation_reminders_local_times, crunch_time_enabled, and crunch_time_start_time_local.
- crunch_time_enabled=false: hide crunch_time_start_time_local and any crunch-time UI/notifications.
- draft_mode_enabled=false: hide draft-related settings (if any) and draft-room access for players.
- Only show dependent settings when their parent toggle is enabled.

## Notes
- "Waitlist open" should show for non-roster users when the roster is full and waitlist is open.
- Non-roster users who are not waitlisted see "Join waitlist"; "Grab open spot" is only shown to waitlisted players.
- "Locked" should show when the join cutoff has passed (player actions locked).
- Join cutoff ends claim spot, join waitlist, and crunch-time grabs.
- After join cutoff, waitlist promotions stop (admin-only changes).
- After join cutoff, player-initiated drops and attendance confirmations are blocked (admin-only changes).
- Capacity changes are admin actions and still reconcile immediately after join cutoff.
- Crunch time only runs if it is before the join cutoff and confirmation_enabled is true.
- All time-of-day settings use community_timezone.
- Drops return the player to the original state (can claim spot if roster is open, or re-join waitlist).
- Re-joining after a drop creates a new join time.
- Drops are tracked once per player per game for stats (includes user drops, admin removals, and auto-drops).
- Attendance is confirmed at most once per roster assignment; it is not re-confirmed unless the player drops and re-joins.
- Waitlist is unlimited; UI should show "X on waitlist".
- Draft disabled: draft room is hidden for players; if admins create teams, teams/captains show after admin submits.
- game_notification_times_local sends to rostered players only.
- Notification copy depends on confirmation_enabled and draft_mode_enabled.
- game_notification_times_local only fires between confirmation window start and join cutoff.
- When confirmation is disabled, roster spots are treated as attendance-confirmed without writing attendance_confirmed_at.
- Cancelled games stop scheduled reminders and send a cancellation notice to rostered + waitlisted players.
- Waitlisted players receive notifications when promoted to the roster, plus crunch-time and cancellation notices.
- Capacity is a hard boundary between roster and waitlist; roster count cannot exceed capacity.
- If capacity increases, waitlisted players are promoted in join order until the roster reaches the new capacity, and each promoted player is notified.
- If capacity decreases, the most recent rostered players are moved to the top of the waitlist until the roster matches the new capacity, and each moved player is notified.
- Completed games can trigger a notification that results are in and stats are updated.
- Crunch time grab is only shown when a spot is available; failed grabs stay waitlisted without extra confirmation steps.
