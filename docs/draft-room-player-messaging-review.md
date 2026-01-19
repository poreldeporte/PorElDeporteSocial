# Draft room player/viewer messaging review

Scope: non-admin copy inside the draft room (players, captains, spectators).
Content is grouped by state and section.

States: pending, ready, in_progress, completed.

## Access gating (draft room not accessible)
Current
- Draft room private: "Draft room is private for admins only."
- Roster not ready: "Draft room opens once the roster is full and confirmed."
- Button: "Back to game"
Replace with
- Hide draft room access screens from viewers when draft mode is off or private (admins only can enter).
- Keep roster-not-ready screen for viewers when the room is public but not yet open.

## Pending

### Draft banner (status)
Current
- Status label (roster not full, capacity known): "(x/y) Fill roster to start."
- Status label (roster not full, capacity unknown): "Roster not full. Fill roster to start."
- Status label (roster full): "Roster full. Select captains to start."
Replace with (viewer-facing)
- Status label (roster not full, capacity known): replace "(x/y) Fill roster to start." -> "(x/y) Roster filling. Draft starts when full."
- Status label (roster not full, capacity unknown): replace "Roster not full. Fill roster to start." -> "Roster filling. Draft starts when full."
- Status label (roster full): replace "Roster full. Select captains to start." -> "Roster full. Waiting for captains."

### Captain votes card
Current
- Title: "Vote for captains"
- Body: "Choose X lads you'd trust to lead a team."
- Summary: "X of Y votes remaining"
Replace with
- keep as is

### Available players list
Current
- Section title: "Available players"
- Vote action label: "Vote"
Replace with
- keep as is

### Spectator notice (non-captains)
Current
- "Captains haven’t been assigned yet. We’ll ping you when picks start."
Replace with
- replace "Captains haven’t been assigned yet. We’ll ping you when picks start." -> "No captains yet. We'll ping you when picks start."

## Ready

### Draft banner (status)
Current
- Status label: "Captains set · Ready"
Replace with
- keep as is

### Ready state card (non-admin)
Current
- Card: "Captains set. Draft begins soon."
Replace with
- Captain view: replace "Captains set. Draft begins soon." -> "You're captain today. Get your first pick ready."
- Viewer view: replace "Captains set. Draft begins soon." -> "Draft starts soon. Picks go live here."

### Spectator notice (non-captains)
Current
- "Captains set. Draft begins soon."
Replace with
- remove for ready state (already covered by the ready card)

## In progress

### Draft banner (status)
Current
- Status label: "Round X · Pick Y"
- Status label (all drafted): "All players drafted · X/Y assigned"
Replace with
- keep as is

### Teams section
Current
- Subline: "Captains are picking now."
Replace with
- keep as is

### Role alerts (captains)
Current
- "You’re on the clock. Draft a player now."
- "You’re up next. Line up your pick."
Replace with
- replace "You’re on the clock. Draft a player now." -> "You're on the clock. Make your pick."
- replace "You’re up next. Line up your pick." -> "You're next. Line up your pick."

### Spectator notice (non-captains)
Current
- "Draft is live. Teams update in real time—enjoy the show."
Replace with
- keep as is

### Pick confirm dialog (captains)
Current
- Title: "Confirm pick?"
- Confirm button: "Draft player"
Replace with
- keep as is

## Completed

### Draft banner
Current
- Status label: "Draft complete · Teams set"
Replace with
- keep as is

### Team cards
Current
- Team badge: "Locked (admin can reset)"
Replace with (viewer-facing)
- Team badge: replace "Locked (admin can reset)" -> "Locked"
