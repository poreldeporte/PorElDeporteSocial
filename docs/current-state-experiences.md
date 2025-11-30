# Current State Experience Map (As-Is)

This document reflects the UI as it behaves today, without proposing new components.

## Scenario A: New Signup landing on Home (mobile/web)
### Home Screen Modules
1. **Hero / Logo strip** – current schedule screen shows a centered crest + “Por El Deporte” text. No CTA.
2. **Game list** – same `GameCard` component as schedule (kickoff, location chips, roster chip). If there are no games, the list surfaces a card saying “No games scheduled yet. Check back soon.”
3. **Stats card** – `StatsCard` shows zero values (“Matches 0, Wins 0, Win rate —”). There’s no empty-state copy beyond the zeros.
4. **Quick join / schedule teaser** – `QuickJoinCard` currently renders a static description + button linking to `/games`. It doesn’t adapt to user state.
5. **Past games** – `PastGamesSection` shows placeholder cards even when empty; there’s no explicit “no history” copy yet.
6. **Chat** – `WhatsAppStyleChat` loads even for new users; composer is enabled as long as the user is connected.

### Schedule Screen
- Starts with the same logo strip + “Por El Deporte” text.
- Below it, `GameListSection` (from `schedule-screen.tsx`) renders `GameCard`s or the empty-state card (“No games scheduled yet. Check back soon.”).

### Game detail (before joining)
- Status badges show `Open` (availability) and no user badge.
- Top CTA bar says `Claim spot`.
- Attendance card (web) is hidden because they’re not in the queue.
- Draft card hidden (roster not full).
- Roster/Waitlist sections show empty-state text (“No players yet.” / “No one on the waitlist yet.”).

## Scenario B: User joined a game (pending attendance confirmation)
### Home Screen
- `GameCard` on the schedule list now shows user badge `On roster` (we don’t alter copy on the dashboard).
- Quick join card still shows generic copy; no state-specific text.

### Game detail
- Status badges: `Open` + `On roster`.
- Mobile CTA bar shows `Drop out` primary, but no secondary CTA.
- Attendance card (web) shows “Please confirm as soon as possible.” Even if the confirmation window isn’t open, it says “Opens [timestamp]”.
- Draft card still hidden.
- Roster list highlights nothing; the user is just another entry.

## Scenario C: Attendance confirmed
### Game detail
- Status badges: `Open` + `Confirmed`.
- Attendance card (web) now shows “You’re confirmed. Drop out if you can’t make it.” With button `Drop out`.
- Mobile CTA bar: `Drop out` primary.
- Nothing else changes on the home/dashboard; the `GameCard` still shows the same chips.

## Scenario D: Roster locked
### Game detail
- Availability badge: `Locked`; user badge `Confirmed`.
- Attendance card stays as “You’re confirmed…”
- Draft status card appears (once roster full) with headline `Draft is live`/`Captains set` depending on status, plus a button (before our recent change) `Enter draft room`.
- Match summary shows teams if result exists or if draft completed.

## Scenario E: Draft room open
### Game detail
- Draft status card headline `Draft is live` and button `Enter draft room` (before removal). Subtext “Captains are picking in real time. Teams update instantly.”

### Draft screen
- Admin sees reset/finalize cards.
- Captains see `Drafting…` button if it’s their turn; otherwise button says `Waiting`.
- Spectators saw the notice; we recently added always-visible available players list, read-only.

## Scenario F: Draft complete
### Home/Schedule
- `GameCard` shows nothing special beyond the `Locked` badge.

### Game detail
- Draft card headline `Teams locked`, button `View teams`.
- Match summary shows Team A/B with captain listed on separate line (now `Captain Name (Captain)` at top).

## Scenario G: Waitlisted user
### Game detail
- Availability badge `Waitlist`, user badge `On waitlist`.
- Attendance card hidden (web).
- CTA bar `Leave waitlist`.
- No additional copy in home/schedule.

## Scenario H: Admin view
- Admin panel card at top of Game Detail (edit game, lock roster, etc.).
- Roster/Waitlist sections show `Remove` buttons.
- Draft status card includes note “Keep picks moving…”
- No special admin widgets on the dashboard today.

## Scenario I: Empty schedule
- Schedule screen shows the crest + “Por El Deporte” text, then the empty card “No games scheduled yet…”
- Home quick join card still shows static description.

## Scenario J: Chat empty state
- Chat currently doesn’t have a special prompt; composer is enabled even if history is empty.
- When offline, we show “Offline” status but composer remains active.

---

This reflects the current behavior; any improvements would layer on top of these baseline states.
