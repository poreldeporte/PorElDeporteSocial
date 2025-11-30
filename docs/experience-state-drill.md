# Experience State Drill

This document captures how copy and components should adapt across key user + game states. Mobile-first assumptions.

## Scenario A: New Signup (no games joined)
### Home/Dashboard
- **Quick Join card**: show next available game with CTA `Claim spot`. Badge text `Spots open · You’re new here`. Secondary link `View schedule`.
- **Notification prompt**: “Never miss a roster spot—enable push notifications.” CTA `Turn on notifications`.
- **Stats module**: empty state copy “Your match history appears after your first run.”
- **Upcoming teaser**: If no games scheduled, copy “No drop-ins posted yet—check back soon.”
- **Past games**: “Play once to unlock replays and recaps.”
- **Chat preview**: disabled composer message “Say hi once you’ve browsed the vibes.” CTA `Open chat`.

### Schedule screen
- Same Quick Join card at top, followed by list. Empty state text for list: “No games scheduled yet. Check back soon.”

### Game detail (when opened from quick join)
- Status badge: `Spots open · Join now` (availability + user not in queue).
- CTA bar: `Claim spot` button.
- Attendance card hidden (web-only).
- Draft card hidden until roster full.

## Scenario B: User joined a game (pending attendance confirmation)
### Home/Dashboard
- Quick Join card now shows `You’re in · Confirm attendance opens 24h before kickoff` with CTA `View game`.
- Notification prompt hides if notifications already enabled; replace with “Add to calendar” button.
- Stats module still empty.

### Game detail
- Status badge: `Spots open · Confirm attendance`.
- Attendance card (web) copy: “Confirm attendance once the window opens. Opens [timestamp].” Button disabled.
- Mobile CTA: `Drop out` (primary) plus `Remind me` secondary (optional).
- Roster section highlights their row (e.g., “You” tag).
- Draft status card hidden until roster filled.

## Scenario C: User confirmed attendance
### Home/Dashboard
- Quick Join card shows `You’re locked in · Game starts Thu 7pm`. CTA `View details`.
- Secondary module suggests “Invite a friend” (share link) since attendance is done.

### Game detail
- Status badge: `Spots open · You’re locked in`.
- Attendance card (web) becomes success message “You’re confirmed. Drop out if plans change.” Button `Drop out`.
- Mobile CTA: `Drop out` (primary) plus `Add to calendar`.

## Scenario D: Roster locked (user still in)
### Home/Dashboard
- Quick Join card shows `Roster locked · See team`. CTA `View teams`.

### Game detail
- Status badge: `Roster locked · You’re locked in`.
- Attendance card hidden (already confirmed).
- Draft status card visible once roster full: tagline `Draft can start anytime` or `Draft happening now`.
- Roster list shows attendance confirmation badges.

## Scenario E: Draft room live (user is spectator vs captain)
### Game detail
- Draft status card copy:
  - Captain: “Draft is live · Tap to manage draft”
  - Spectator: “Draft happening now · Tap to watch live picks”
- CTA arrow opens draft room.

### Draft screen
- **Captain (on turn)**: Banner text “You are on the clock · Round x pick y”; available players list buttons enabled.
- **Captain (waiting)**: Banner shows “Waiting for Team B”; buttons disabled.
- **Spectator**: Spectator notice at bottom “Viewing as spectator. Draft is live…”; available players list read-only.
- **Admin**: Admin tools card visible (reset/undo/finalize).

## Scenario F: Draft complete, teams locked
### Home/Dashboard
- Quick Join card switches to `Teams locked · See who you’re running with`. CTA `View teams`.

### Game detail
- Draft card: headline `Teams locked in`, note `Review both squads before kickoff`, hint `Tap to review teams`.
- Match summary lists Team A/B with captain first player (e.g., `Player Name (Captain)`), rest of players below.
- Roster section remains but “Remove” buttons disabled once locked (unless admin).

## Scenario G: Waitlisted user
### Home/Dashboard
- Quick Join card shows `Waitlist open · You’re waiting` with CTA `Leave waitlist` (secondary `View details`).

### Game detail
- Status badge: `Waitlist open · You’re waiting`.
- Mobile CTA bar: `Leave waitlist` (primary).
- Attendance card hidden (can’t confirm).
- Notification prompt suggests enabling pushes (“We’ll ping you if a spot opens”).

## Scenario H: Admin view
- All screens overlay admin panel/actions in addition to user state.
- Home: optional admin tiles (new games needing captains).
- Game detail: Admin panel card (lock roster, assign captains, edit game). Draft card hint text `Tap to manage draft`.
- Roster/Waitlist sections show `Remove` buttons.

## Scenario I: Empty schedule (no games at all)
- Home quick join card replaced with empty-state card “No drop-ins posted yet. Tap to create one” (for admins) or “Check back soon” (members).
- Schedule list shows single empty card.

## Scenario J: Chat empty state
- For new user, composer disabled with message “Scroll through the chat to catch the vibe. You can post once you’ve seen a thread.” CTA `Open chat`.
- When connection offline, show “Offline. Reconnect to chat.”
- Admin has trash icons on messages; members do not.

---

This covers copy/component behavior for the major user/game states. Adjust CTA text per state to keep instructions action-oriented.
