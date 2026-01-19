# Draft room admin messaging review

Scope: admin-facing copy for draft states across draft room UI plus the admin entry surfaces
(game detail draft card and admin panel). Content is grouped by state and section.

States: pending, ready, in_progress, completed.

## Pending

### Entry surfaces (game detail draft card + admin panel)
Current
- Draft card headline: "Pick captains to unlock drafting"
- Draft card subline: "Choose rostered captains so we can start picking."
- Draft card hint: "Tap to set captains"
- Admin panel primary action: "Set captains"
- Admin panel status line: "Draft: pending"
Replace with
- Draft card headline: replace "Pick captains to unlock drafting" -> "Select captains to start the draft"
- Draft card subline: replace "Choose rostered captains so we can start picking." -> "Select rostered captains. Votes are advisory."
- Draft card hint: replace "Tap to set captains" -> "Tap to select captains"
- Admin panel primary action: replace "Set captains" -> "Select captains"
- Admin panel status line: replace "Draft: pending" -> "Draft: captains needed"

### Draft banner (status + summary)
Current
- Status label: "Waiting for roster to fill (x/y)" or "Waiting for roster to fill"
- Status label (roster full): "Waiting for captains to be assigned"
- Selection summary: "Pick captains below to start the draft."
- Selection summary (valid): "Selected N captains · Teams of X"
- Selection summary (invalid): "Selected N captains · Must divide Y roster"
Replace with
- Status label (roster not full, capacity known): replace "Waiting for roster to fill (x/y)" -> "(x/y) Fill roster to start."
- Status label (roster not full, capacity unknown): replace "Waiting for roster to fill" -> "Roster not full. Fill roster to start."
- Status label (roster full): replace "Waiting for captains to be assigned" -> "Roster full. Select captains to start."
- Selection summary (no captains yet): replace "Pick captains below to start the draft." -> "Select captains below, then press Start draft."
- Selection summary (valid): replace "Selected N captains · Teams of X" -> "Selected N captains · Teams of X players"
- Selection summary (invalid): replace "Selected N captains · Must divide Y roster" -> "Selected N captains · Must divide Y players"

### Draft controls (draft mode + start)
Current
- Section title: "Draft mode"
- Primary button: "Start draft" (often disabled)
Replace with
- Section title: replace "Draft mode" -> "Choose draft mode"
- Add helper line under the button (always visible when pending): "Select captains and fill the roster to enable Start draft."

### Captain votes card
Current
- Title: "Captain votes are open"
- Body: "Pick up to X teammates you'd trust to draft."
- Summary: "X of Y votes left" or "Rostered players can vote for captains."
Replace with
- Title: replace "Captain votes are open" -> "Vote for captains"
- Body: replace "Pick up to X teammates you'd trust to draft." -> "Choose X lads you'd trust to lead a team."
- Summary (voters): replace "X of Y votes left" -> "X of Y votes remaining"

### Available players list (row-level actions)
Current
- No explicit label for row tap (selects captain)
- Heart icon for voting with count
Replace with
- Add a label under the heart icon: "Vote"
- Add admin-only helper line above list: "Tap players to select captains."

## Ready

### Entry surfaces (game detail draft card + admin panel)
Current
- Draft card headline: "Captains set"
- Draft card subline: "Draft is about to start."
- Draft card hint: "Tap to manage draft"
- Admin panel primary action: "Start draft"
- Admin panel status line: "Draft: ready"
Replace with
- Draft card headline: replace "Captains set" -> "Captains set"
- Draft card subline: replace "Draft is about to start." -> "Ready when you are."
- Draft card hint: remove
- Admin panel primary action: keep "Start draft"
- Admin panel status line: replace "Draft: ready" -> "Draft: captains set"

### Draft banner (status)
Current
- Status label: "Captains set · Draft coming soon"
Replace with
- Status label: replace "Captains set · Draft coming soon" -> "Captains set · Ready"

### Ready state card
Current
- Card: "Draft coming soon. Stay tuned."
Replace with
- Admin view: replace "Draft coming soon. Stay tuned." -> "Captains set. Draft is ready."
- Non-admin view: replace "Draft coming soon. Stay tuned." -> "Captains set. Draft begins soon."

### Draft controls (draft mode + start)
Current
- Section title: "Draft mode"
- Primary button: "Start draft"
Replace with
- Section title: replace "Draft mode" -> "Choose draft mode"
- Add helper line under the button: "Captains are set. Pick format."

## In progress

### Entry surfaces (game detail draft card + admin panel)
Current
- Draft card headline: "Draft is live"
- Draft card note: "Keep picks moving until both rosters are full."
- Draft card hint: "Tap to manage draft"
- Admin panel primary action: "Manage draft"
- Admin panel status line: "Draft: live"
Replace with
- Draft card headline: replace "Draft is live" -> "Captains are drafting"
- Draft card note: replace "Keep picks moving until both rosters are full." -> "Monitor picks and undo if needed."
- Draft card hint: replace "Tap to manage draft" -> "Tap to manage picks"
- Admin panel primary action: replace "Manage draft" -> "Open draft room"
- Admin panel status line: keep "Draft: live"

### Draft banner (status + undo)
Current
- Status label: "Round X · Pick Y"
- Status label (all drafted): "All players drafted · X/Y assigned"
- Undo button: "Undo last pick"

### Teams section
Current
- Section title meta: "X/Y drafted · Z available"
- Active team badge: "On the clock"
Replace with
- Add subline under section title: "Captains are picking now."

### Available players list
Current
- Section title: "Available players"
- Confirm dialog: "Confirm pick?" + "Draft player"

### Role alerts (captains only)
Current
- "You're on the clock. Draft a player now."
- "You're up next. Line up your pick."
Replace with
- Add admin-only alert when not captain: "Captains are drafting. Monitor or undo picks."

## Completed

### Entry surfaces (game detail draft card + admin panel)
Current
- Draft card headline: "Teams locked in"
- Draft card subline: "Captains finished picking. Review the squads before kickoff."
- Draft card hint: "Tap to review teams"
- Admin panel primary action: "Review draft"
- Admin panel status line: "Draft: completed"
Replace with
- Draft card headline: replace "Teams locked in" -> "Teams set!"
- Draft card subline: replace "Captains finished picking. Review the squads before kickoff." -> "Teams are set. Review squads before kickoff."
- Draft card hint: keep "Tap to review teams"
- Admin panel primary action: keep "Review draft"
- Admin panel status line: replace "Draft: completed" -> "Draft: complete"

### Draft banner
Current
- Status label: "Draft complete · Teams locked"
Replace with
- Status label: replace "Draft complete · Teams locked" -> "Draft complete · Teams set"

### Teams section
Current
- Team badge: "Locked"
Replace with
- Team badge: replace "Locked" -> "Locked (admin can reset)"

### Reset control
Current
- Icon-only reset with aria-label "Reset draft"
Replace with
- Add visible label or tooltip text: "Reset draft (admin only)"
