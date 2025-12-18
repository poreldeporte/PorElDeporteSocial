# Focus Group Feedback (organized)

## Home
- Next Available shortcut: show next game with open spots.
- “Roster locked” but not fully confirmed: keep games “open” until everyone confirms (affects schedule logic and labels).
- PED Hero colors: black bg + black text on light theme → fix contrast.
- “My record” tap should navigate to Profile.
- Upcoming confirmation: show user’s upcoming games on Home with ability to confirm (not just in Schedule).
- My record counts game before result finalized; overcounts games vs wins/losses.

## Schedule
- “Roster locked” shown when not fully confirmed; should remain open until all confirmations and still allow waitlist joins.
- Same lock/awaiting confirmation badge is incorrect.
- Waitlist should be joinable even when roster locked/full.

## Draft
- Pre-select picks that auto-draft when available.
- Draft style toggle: OG vs Snake.
- Remove player numbers from lists.
- Draft list sync/render is slow after each pick.
- Randomize who gets first pick.
- Add chat/emotes during draft; notifications for watchers/drafted/moved up; opt-in push for drafts.
- Draft room “Finalize” should drop the draft card in real time (done separately; verify).
- Top header back button fixed to icon only (done separately; verify).

## Leaderboards
- Rankings off when filter changes; investigate sorting/metric mapping.
- Add timeframe filters (30/90/year).
- Recent matches display request: “Recent form” with W/L indicator on each game line item.

## Game Detail
- Shows “You’re locked in” after game ends.
- Drop-out allowed after game ends; button says “game completed” but still prompts drop.
- “Roster locked” shown before confirmations complete; should stay open until all confirm.
- Drop-out copy tweak: “Drop out if life or death” (tone tweak).
- Drop-out should disappear once teams are set.
- When someone drops after teams set: reset status/teams, promote next waitlist.

## Profile
- Add images to user profile (currently badge only in edit; display photos?).
- Birthdate save fixed; ensure profile performance stats update real-time (pending).

## Auth
- Sign up: require phone; add phone verification login.
- Sign in: add social logins; forgot password flow missing.

## Notifications (push/WhatsApp)
- Push when: drafted, moved up from waitlist, new game created, draft watching opt-in, captains to report result.
- Consider WhatsApp bot/updates for games/drafts.

## Roster/Queue logic
- Waitlist order wrong: new entries appear at top; should append.
- Roster locked logic: keep open until confirmations; allow waitlist joins even when full/locked.
- Confirmation UX: consider emoji confirmations instead of pending/confirmed.

## Other ideas
- Post-draft grades + shareable recap.
- “Who will win” voting after teams set.
- Add color to app (overall theming refresh).
