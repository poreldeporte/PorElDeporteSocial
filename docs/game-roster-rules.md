# Game Roster Rules

## Definitions
- rostered: player is on the roster.
- waitlisted: player is on the waitlist.
- dropped: player is removed from the queue.
- attendance-confirmed: rostered player with confirmed attendance.
- unconfirmed roster: rostered player without confirmed attendance.
- join cutoff: time when player actions lock.
- locked: player actions are blocked; admins can still change the roster.
- claim spot: player action to take a roster spot.
- join waitlist: player action to enter the waitlist.
- grab open spot: waitlisted player action to take an open roster spot during crunch time.
- draft visibility: per-game setting that controls who can see the draft room (public | admin_only).
- community scope:
  - each game belongs to exactly one community.
  - players must be members of that community to join its games.
  - players may belong to multiple communities and join games across them.
  - rosters, waitlists, drafts, notifications, and stats are scoped to the game's community.
  - community settings apply only to games in that community.

## State model
- Canonical fields:
  - game_queue.status: rostered | waitlisted | dropped
  - game_queue.attendance_confirmed_at
  - game_queue.dropped_at
  - games.status: scheduled | completed | cancelled
  - games.cancelled_at
  - games.draft_status: pending | ready | in_progress | completed
  - games.draft_mode_enabled
  - games.draft_visibility: public | admin_only
- Ordering + invariants:
  - roster and waitlist order are by join time ascending.
  - capacity is a hard boundary; roster count never exceeds capacity.
  - waitlist is unlimited.
  - re-joining after a drop creates a new join time.
  - attendance is confirmed at most once per roster assignment; re-confirm requires drop + re-join.
- Derived times:
  - join cutoff = kickoff - join_cutoff_offset_minutes_from_kickoff.
  - confirmation window start = kickoff - confirmation_window_hours_before_kickoff.
  - crunch time start = crunch_time_start_time_local.
- Derived states:
  - scheduled = games.status not cancelled or completed (join cutoff does not change game status).
  - cancelled = games.status cancelled.
  - completed = results confirmed (sets games.status=completed).
  - locked = now >= join cutoff.
  - attendance-confirmed = rostered with attendance_confirmed_at set; if confirmation_enabled=false, rostered players are treated as attendance-confirmed without writing attendance_confirmed_at.
  - unconfirmed roster = rostered without attendance_confirmed_at.
  - confirmation window open = confirmation_enabled=true and confirmation window start <= now < join cutoff.
  - availability:
    - open = scheduled, now < join cutoff, roster < capacity.
    - waitlist open = scheduled, now < join cutoff, roster >= capacity.
    - grab-only = scheduled, confirmation_enabled=true, crunch_time_enabled=true, now >= crunch time start, now < join cutoff, roster >= capacity, and at least one rostered player is unconfirmed.
- Reconciliation:
  - if kickoff or join_cutoff_offset changes, join cutoff and derived windows are recalculated.
  - capacity changes reconcile immediately (including after join cutoff):
    - increase: promote waitlisted players in join order until roster reaches capacity.
    - decrease: move most recent rostered players to the top of the waitlist until roster matches capacity.

## Core flow
1. Scheduled signup: players claim spot or join waitlist per permissions; roster fills first, overflow goes to waitlist.
2. Confirmation window: when confirmation window is open, rostered players can confirm attendance or drop. If join cutoff is before the window start, confirmation and crunch time are skipped.
   - if a rostered player drops before crunch time, the next waitlisted player is promoted in join order; if the window is open, the promoted player can confirm attendance, otherwise they are rostered but cannot confirm yet.
3. Crunch time (grab-only): waitlisted players grab open spots to replace unconfirmed rostered players; successful grabs immediately attendance-confirm.
   - replacement order is from the bottom of the roster (most recent join) upward.
   - after crunch time starts, openings are grab-only; no automatic promotions.
   - if no one grabs by join cutoff, unconfirmed players stay unless an admin changes the roster.
- grab tie-breaker: first successful request wins.
   - failed grabs remain waitlisted with no extra confirmation prompts.
4. Draft phase (when draft_mode_enabled=true): admin assigns captains; draft auto-starts.
   - draft room visibility:
     - admins: always.
     - players: only when draft_visibility=public and (draft_status != pending or roster is full and, if confirmation_enabled=true, all rostered are attendance-confirmed).
   - when the room is visible but captains are unset, show "Captains coming soon."
5. Teams set: any roster change after captains are set (including admin removals during draft and drops after teams are set) resets to the pre-captains state; attendance confirmations persist.
6. Results: submissions require teams; captain submissions are pending until confirmed; admin submissions confirm immediately. Confirmation sets games.status=completed.
7. Cancellation: admin cancellation sets games.status=cancelled and ends the flow.

## Action permissions
Players:
- Claim spot: allowed when the game is open.
- Join waitlist: allowed when the game is waitlist open; allowed even when draft_status=in_progress.
- Drop (rostered or waitlisted): allowed when the game is scheduled and not locked, and draft_status != in_progress.
- Confirm attendance: allowed only while the confirmation window is open.
- Grab open spot: allowed only when the game is grab-only; only waitlisted players.
- Rate game: rostered players only, after results are confirmed.

Captains:
- Draft picks: allowed while draft_status=in_progress; admins can pick too.
- Report results: after kickoff; only if captains are assigned.
- Confirm results: only the other captain (not the reporter).

Admins:
- Add / remove / mark attendance-confirmed rostered players: allowed anytime.
- Add respects capacity: if roster is full, new adds go to the waitlist unless capacity is increased first.
- Assign captains: allowed when the roster is full, captains are rostered, captain count >= 2, captain count divides evenly into the roster, and team count equals captain count. If confirmation_enabled=true, all rostered players must be attendance-confirmed and the confirmation window must be open.
- Reset draft: allowed anytime while draft_mode_enabled=true.
- Report results: allowed after kickoff.
- Confirm results: allowed for captain-submitted results.
- Cancel game: admin only.

## Settings
Community defaults (apply to all games unless overridden):
- community_timezone (default set per community)
- confirmation_window_hours_before_kickoff (default 24)
- confirmation_reminders_local_times (default 09:00, 12:00, 15:00)
- crunch_time_enabled (default true)
- crunch_time_start_time_local (default 17:00)
- game_notification_times_local (default empty)

Per-game overrides:
- confirmation_enabled (default true)
- join_cutoff_offset_minutes_from_kickoff (default 0)
- draft_mode_enabled (default true)
- draft_visibility (default public)

Settings precedence: per-game override > community default > built-in default.

Time settings: all time-of-day settings use community_timezone.

Visibility + dependencies:
- confirmation_enabled=false: hide confirmation_window_hours_before_kickoff, confirmation_reminders_local_times, crunch_time_enabled, crunch_time_start_time_local, and confirmation UI.
- crunch_time_enabled=false: hide crunch_time_start_time_local and crunch-time UI.
- draft_mode_enabled=false: hide draft room, teams, and match summary; draft_visibility is ignored.
- only show dependent settings when their parent toggle is enabled.

Draft mode disable behavior:
- if draft_mode_enabled is turned off after teams or results exist, delete teams and results, clear captains, and reset draft_status.

## Notifications
- Confirmation reminders: follow confirmation_reminders_local_times; sent to rostered players who are not attendance-confirmed; only while the confirmation window is open.
- Draft notifications: sent only when confirmation_enabled=true and draft_visibility=public.
- Crunch time notice: sent to the full waitlist when crunch time starts.
- Promotion notice: sent to waitlisted players when they are promoted to the roster.
- Demotion notice: sent to rostered players moved to the waitlist due to capacity decreases.
- Game notifications: follow game_notification_times_local; sent to rostered players only; only between confirmation window start and join cutoff.
- Cancellation notice: sent to rostered and waitlisted players; cancels scheduled reminders.
- Results notification: completed games can send a "results are in" + "stats updated" notice.
- Notification copy depends on confirmation_enabled and draft_mode_enabled.
- Crunch-time notifications are suppressed when crunch_time_enabled=false.

## Notes
- UI availability labels: show "Waitlist open" to non-roster users when the roster is full and waitlist is open; show "Locked" when join cutoff has passed.
- UI actions: non-roster users who are not waitlisted see "Join waitlist"; "Grab open spot" is shown only to waitlisted players.
- Waitlist UI: show "X on waitlist".
- Drop behavior: dropping returns the player to the pre-join state (they can claim spot if open or re-join waitlist).
- Drop stats: drops are tracked once per player per game for stats (includes user drops, admin removals, and auto-drops).
- Game stats: completed games always count as played; W/L/GD only apply when results exist.
- Kickoff changes: if only kickoff time changes, captains/teams remain intact.
