# Notifications Roadmap

## Objectives
- Surface time-sensitive actions (roster changes, confirmations, draft updates) without forcing users to poll screens.
- Keep users informed across both mobile (push) and web (in-app banners / email fallbacks).
- Respect preferences: opt-in categories, quiet hours, digest vs immediate.

## Event Matrix
| Domain | Trigger | Audience | Payload | Channel |
| --- | --- | --- | --- | --- |
| Games | Spot claimed from waitlist | Player who moved from waitlist → roster | Game id, kickoff, CTA link | Push, in-app toast |
| Games | Invite accepted (admin assigns spot) | Admin / host | Player + game id | In-app banner |
| Games | Roster locked | All roster players | Kickoff, roster summary | Push (mobile), email (optional) |
| Games | Confirm attendance window opened | Confirmed players w/out attendance | Window open timestamp | Push reminder |
| Games | Kickoff reminder (2h before) | All confirmed players | Game info, route CTA | Push |
| Draft | Draft started | Captains + spectators subscribed | Game id, draft URL | Push, in-app banner |
| Draft | Pick made | Players drafted (optional) | Team id, pick order | Push for drafted player |
| Draft | Draft complete | All roster players | Team assignments | Push |
| Queue | User bumped from waitlist to roster | Player | Game id | Push |
| Queue | User dropped from roster (admin action) | Player | Game id, reason | Push + email |
| Chat | Direct mention (@username) | Mentioned user | Message preview, room link | Push |
| Chat | Room announcement (admin pinned) | Room members (opt-in) | Message id | Push |
| Profile | Role upgraded (admin) | User | Role, capabilities summary | Email + in-app |
| System | New feature flag (optional) | Admins | Feature name | In-app banner |

## Architecture
1. **Event emitters**: Existing Supabase RPC / TRPC mutations emit domain events (e.g., `queue.spot_claimed`). Standardize payload interface `{type, entityId, metadata}`.
2. **Notification service (worker)**:
   - Consumes events via Supabase Realtime channel or message queue.
   - Runs subscription rules (user preferences, role filters, quiet hours).
   - Persists notifications to `notifications` table (status: pending, delivered, read).
3. **Device + token lifecycle**:
   - Clients request push permission on first need-to-know event; never block onboarding on prompts.
   - Each device stores `{user_id, platform, expo_push_token, app_version, last_seen_at}` in `user_devices`.
   - Tokens refreshed on every app launch/resume; stale entries deleted when Expo returns `DeviceNotRegistered`.
4. **Delivery adapters**:
   - **Push**: Expo Notifications for native; follow Expo chunk/batch guidelines, retry with exponential backoff, capture ticket + receipt ids for observability.
   - **In-app**: React Query hooks subscribe to `notifications` table via Supabase channel; dedupe per-notification, show toast + badge, persist read state.
   - **Email** (optional): Resend/SendGrid triggered by worker with feature-flagged rollout.
5. **Preferences UI + enforcement**:
   - Settings > Notifications houses toggles per category (Games, Draft, Chat, System) + quiet hours slider persisted to `notification_preferences`.
   - Worker enforces quiet hours by queuing events for later delivery (cron/Edge scheduled) rather than silently dropping them.
6. **Read state + UX contract**:
   - Notification center component (badge in nav) lists unread notifications and exposes swipe-to-dismiss.
   - Read transitions fire via dedicated mutation that updates `notifications.status` and clears client-local badge counts to avoid race conditions.

## Implementation Steps
1. **Schema**
   - `notifications` table: `id, user_id, type, payload(jsonb), delivery_channel, status(pending|sent|failed|read), created_at, read_at`.
   - `notification_preferences`: `user_id, category, channel, enabled, quiet_hours(jsonb{start,end,timezone})`, default rows inserted via trigger when user signs up.
   - `user_devices`: `id, user_id, platform, expo_push_token, app_version, last_seen_at, disabled_at`, plus unique constraint on `(expo_push_token)`.
2. **Event emitters**
   - Add helper `publishNotificationEvent(type, payload)` inside queue/draft/chat mutations.
   - Cover triggers from matrix; ensure idempotency (e.g., only notify once per spot change) and attach audience hints so worker can avoid N+1 lookups.
3. **Worker service**
   - Use Supabase Edge Function or Vercel cronless worker subscribed to `notification_events` channel or queued via `pgmq`.
   - Apply preference filters + quiet hours (store suppressed events with `deliver_after` timestamp), insert rows into `notifications`, call delivery adapters, and persist delivery logs (`notification_delivery_logs`) for auditing.
   - Implement retry policy (max 3 attempts, jitter) and alerting when failure rate exceeds threshold.
4. **Delivery adapters**
   - Push: integrate Expo Notifications using registered `user_devices`; handle chunking, store Expo ticket ids, poll receipts to mark failures and disable invalid tokens.
   - Web in-app: subscribe via Supabase realtime to `notifications` for current user; show toast + add to center. Cache last 50 notifications locally to cover offline reopen.
   - Email (phase 2) for critical events (roster lock, role upgrades) using Resend templates + background worker.
5. **Client UI**
   - Mobile: add notification bell in tab header linking to NotificationCenter screen.
   - Web: same in top nav.
   - Display per-notification CTA (e.g., `View draft room`, `Confirm attendance`).
6. **Preference management**
   - Settings screen: toggles for each domain, quiet hours selector with preview.
   - TRPC endpoints to read/write preferences, enforce auth, and hydrate defaults from schema.
7. **Permission + token UX**
   - Hook that requests notification permission after user confirms at least one rostered event; show inline rationale modal first.
   - On approval, register Expo token, call `/api/notifications/register-device`, and store response ID for later updates.
8. **Analytics & Monitoring**
   - Log send attempts + failures (structured logs + DataDog metrics).
   - Add SLO dashboard (delivered within 30s for roster moves) and alert when queue backlog > 1 minute or Expo failure rate > 5%.

## Notification Copy (first pass)
- **Waitlist promoted / Queue bump**: “You’re in! A spot opened for {gameName}. Confirm now before kickoff.”
- **Invite accepted (host)**: “{playerName} just claimed the open spot in {gameName}. Roster updated.”
- **Roster locked**: “Lineup locked for {gameName} on {date}. See who you’re playing with.”
- **Attendance window**: “RSVP window is open for {gameName}. Confirm to keep your spot.”
- **Kickoff reminder**: “Kickoff in 2 hours at {venue}. Gear up for {gameName}.”
- **Draft started**: “Draft for {gameName} is live. Join the room to follow picks.”
- **Draft pick made**: “{captainName} just drafted you as #{pickNumber} overall. Meet the squad.”
- **Draft complete**: “Draft’s wrapped for {gameName}. Check rosters and meet your squad.”
- **Dropped from roster**: “You were moved off {gameName}’s roster: {reason}. Rejoin the queue if you still want in.”
- **Chat mention**: “{sender} mentioned you in {roomName}: “{snippet}”.”
- **Chat announcement**: “Announcement in {roomName}: {title}. Tap to read.”
- **Role upgraded**: “You’re now a {role}. New tools unlocked in your dashboard.”
- **System feature**: “New feature: {featureName}. Explore it now.”

## Open Questions
- Should we batch waitlist notifications (group multiple drops into one push) vs fire per event?
- Do spectators need live draft push notifications or only captains? If yes, how do they opt-in?
- Email fallback cadence (immediate vs daily digest) and does it respect quiet hours?
- Where do we persist quiet-hour deferred events (same table vs separate queue) to avoid losing them on deploy?
