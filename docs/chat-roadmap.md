# Supabase Chat Roadmap

This plan describes how to introduce realtime chat into PorElDeporteSocial using the `realtime-template` reference as the baseline for UX, channel wiring, and Supabase usage.

---

## Goals
1. **Low-latency messaging:** leverage Supabase Realtime broadcast channels so chat updates arrive instantly without waiting on Postgres replication.
2. **Predictable rooms:** tie each chat room to an app domain entity (game, draft, team) with deterministic naming so clients can subscribe without extra lookups.
3. **Durable history:** persist messages to Postgres when needed, but keep the UI responsive by optimistically rendering broadcast payloads first.
4. **Shared primitives:** reuse the existing `useSupabase()` client, `useRealtimeChannel`, and debug/logging pipeline so chat follows the same operational rules as the rest of our realtime stack.

---

## Reference Takeaways (`realtime-template`)
- **Client-only broadcast hook:** `apps/web/hooks/use-realtime-chat.tsx` creates a channel per `roomName`, listens for `broadcast` events, tracks `isConnected`, and optimistically appends local messages before calling `channel.send`.
- **Composable UI:** `apps/web/components/realtime-chat.tsx` merges prefetched history with live messages, dedupes by `id`, auto-scrolls with `useChatScroll`, and exposes an `onMessage` callback for persistence hooks.
- **Environment parity:** Supabase clients live under `apps/web/lib/supabase` and read `NEXT_PUBLIC_SUPABASE_URL` + publishable keys, matching our current setup (see `packages/app/utils/supabase/useSupabase.ts`).
- **UX cues:** Disabled input + conditional send button driven by `isConnected`, animated message list with headers suppressed for consecutive sends, and a simple message schema (`id`, `content`, `user.name`, `createdAt`).

---

## Phase 1 – Foundation
1. **Room schema & naming**
   - Define a deterministic channel pattern, e.g., `chat:game:{gameId}` and `chat:team:{teamId}`.
   - Document mappings in each feature README plus `docs/realtime-roadmap.md` so realtime owners know which rooms exist.
2. **Broadcast helper**
   - Add `useRealtimeBroadcastChannel` (or extend `useRealtimeChannel`) to encapsulate Supabase `.on('broadcast')` subscriptions and expose `isConnected`, mirroring the template hook.
   - Reuse `debugRealtimeLog` for subscribe/unsubscribe events and emit error codes when `CHANNEL_ERROR` fires.
3. **Message store contract**
   - Create a lightweight TypeScript model (`packages/app/types/chat.ts`) with the same fields as `ChatMessage`.
   - Decide persistence strategy: start ephemeral (local state only) but wire the `onMessage` callback so later phases can sync to Postgres (e.g., `realtime.messages` or a new `public.chat_messages` table with RLS).

---

## Phase 2 – UI & Feature Integration
1. **Shared Chat component**
   - Build `packages/app/components/RealtimeChat` modeled after `apps/web/components/realtime-chat.tsx`. Props: `room`, `username`, optional `messages`, `onMessage`.
   - Integrate `useChatScroll` for auto-scroll and reuse `ChatMessageItem` styles from the template (ported into our UI library).
2. **Initial surfaces**
   - **Draft room chat:** render chat next to the draft board; room name = `chat:draft:{gameId}` so captains and viewers share a channel.
   - **Game lobby chat:** embed on the game detail screen so players coordinate before start (`chat:game:{gameId}`).
   - Each screen records the active room + whether history should be persisted.
3. **Auth & roles**
   - Ensure the Supabase anon token used client-side conveys the user’s display name; extend the payload to include profile id so we can attribute messages later.
   - Update legal/UX copy to mention chat presence only works while logged in (no guest posting).

---

## Phase 3 – Persistence & Observability
1. **Database storage**
   - Add migrations for `public.chat_rooms` + `public.chat_messages` (room id, message id, profile id, content, created_at).
   - Trigger `realtime.broadcast_changes` on inserts so history listeners stay in sync if we ever replay from Postgres.
   - Update the chat component to call a mutation (TRPC or Supabase RPC) inside `onMessage` to persist after broadcast succeeds.
2. **History hydration**
   - Fetch the latest N messages via TRPC when entering a room and pass them as the `messages` prop, exactly like the template does with `initialMessages`.
   - Handle pagination/“load more” for older history.
3. **Telemetry & limits**
   - Log channel joins, errors, and send failures to our analytics stream; monitor Supabase channel counts so we can shard rooms if necessary.
   - Add rate limiting on message sends (client-side debounce + server-side guard once persistence exists).

---

## Deliverables Checklist
- [ ] `useRealtimeBroadcastChannel` hook with tests.
- [ ] Shared chat UI (message list, input, scrolling hook).
- [ ] Game detail + draft room integration using deterministic room ids.
- [ ] Optional Postgres tables + migrations for persistent chat (Phase 3).
- [ ] Docs updates: `docs/realtime-roadmap.md` references this plan; feature READMEs list their room names.

Executing these steps incrementally lets us ship a template-quality chat experience quickly, while keeping the door open for durable history, analytics, and future presence/broadcast enhancements.

---

# Multi-Room + Direct Message Roadmap

Now that baseline chat exists, the next milestone is supporting multiple community channels and 1:1 conversations so every member can find and message anyone. This roadmap layers on top of the existing real-time plumbing.

## Product Goals
1. **Named community channels:** allow admins to spin up additional shared rooms (e.g., Brickell runs, Captains HQ) without shipping new code.
2. **Universal DMs:** let any two members start a private thread, discover past conversations, and get notified when new messages arrive.
3. **Consistency across clients:** web, iOS, and Android share the same room list, unread counts, and toast/push behavior.
4. **Safety + etiquette:** respect the invite-only vibe with clear rules (muting, blocking, reporting) and minimal spam vectors.

## Architecture Overview
- **chat_rooms** table stores `id`, `type ('community' | 'dm')`, `slug`, `name`, `description`, `created_by`, `created_at`.
- **chat_room_participants** links `room_id` ↔ `user_id`, with `role ('owner' | 'member')`, `last_read_at`, and optional metadata (muted flag).
- **chat_messages** is reused for both room types; each row references `room_id`, `sender_id`, `content`, timestamps, and soft-delete flags.
- **Deterministic DM rooms**: DMs are strictly 1:1. Enforce a unique constraint on the sorted participant pair (e.g., `dm_pair_hash = hash(minUserId,maxUserId)`) so only one room exists per duo.
- **Room aggregates**: store `last_message_id`, `last_message_at`, `last_sender_id`, and optionally message counts on `chat_rooms` (with triggers to update) so the room list UI never performs N+1 queries to compute previews/unread counts.

## Phase 1 – Schema & API
1. **Migrations**
   - Add `chat_rooms` table with indexes on `(type, slug)` and `(type, created_at)`.
   - Add `chat_room_participants` with composite primary key `(room_id, user_id)` and `last_read_at`.
   - Backfill existing global chat: insert a `community` row (`slug = 'main'`) and join every profile into `chat_room_participants`.
   - Add aggregate columns (`last_message_id`, `last_message_at`, `last_sender_id`, `message_count`) and triggers so they stay in sync when new messages land.
2. **RLS & policies**
   - Community rooms: allow `select` on `chat_rooms` and `chat_room_participants` for all authenticated users; restrict membership changes to admins.
   - DM rooms: lock `chat_rooms`, `chat_room_participants`, and `chat_messages` so only participants can `select` or mutate anything tied to the room (metadata leaks are still leaks).
   - Add a check constraint that DMs contain exactly two participants so the uniqueness rule can’t be bypassed by passing extra ids.
3. **tRPC layer**
   - `chat.listRooms({ scope: 'community' | 'dm' })`: returns rooms + `last_message`, `unread_count` sourced from the aggregate columns.
   - `chat.createRoom({ type, name, participantIds })`: admin-only for community. For DMs, require exactly two participant ids, auto-resolve the existing room using the deterministic hash, and reject attempts to sneak in a third member.
   - `chat.markRead({ roomId })`: updates `last_read_at`.
4. **Seeding + backfill scripts**
   - CLI script to enroll a cohort into a new community channel using `chat_room_participants`.
   - Migration job to create DM rooms for historical 1:1 interactions if needed in future.

## Phase 2 – Client UX
1. **Room list shell**
   - Add a “Messages” tab (or drawer section) with two sub-tabs: `Channels` and `Direct`.
   - Each row shows room name, preview of last message, timestamp, and unread badge (derived from `last_read_at`).
2. **Room detail**
   - Reuse `WhatsAppStyleChat` but pass `room` metadata for headers (channel name or other participant name). Show avatars for DMs.
   - Provide quick actions: mute/unmute, leave channel (where applicable).
3. **Starting DMs**
   - Build a `MemberDirectory` component with search by name/position. Each result includes “Message” button → calls `createRoom` with type `dm`.
   - Add “Message” CTA to profile screen, roster rows, and chat mention menu.
4. **Unread + notifications**
   - Track `last_read_at` client-side; when the user opens a room, call `markRead`.
   - Emit a `chat_message.created` event into the existing notifications worker (see `docs/notifications-roadmap.md`) so push/toast/email delivery honors quiet hours and per-channel preferences.

## Phase 3 – Enhancements & Safeguards
1. **Channel management**
   - Admin UI to rename/delete channels, promote other admins, and view membership.
   - Optional “invite-only” channels: require explicit membership before listing in the channel directory.
2. **Moderation primitives**
   - Add `/report` modal for DMs and channel messages (writes to `reports` table).
   - Allow users to mute or block another member; blocked users cannot start new DMs (store in `user_blocks` table, check before `createRoom`).
3. **Presence indicators**
   - Use Supabase real-time presence to show “typing…” or online dots in DMs/channels.
   - Add “currently drafting” or “in this room” hints for community channels.
4. **Performance & retention**
   - Paginate room list and message history; add index on `(room_id, created_at)` for fast fetch.
   - Introduce archival policy (e.g., auto-archive DM threads with no activity for 90 days).

## Deliverables Checklist
- [ ] Migrations + RLS for `chat_rooms`, `chat_room_participants`, DM uniqueness constraint.
- [ ] TRPC resolvers for listing rooms, creating rooms/DMs, and marking read.
- [ ] Room list UI with unread badges and room metadata.
- [ ] Member directory + “Message” entry points.
- [ ] Push/toast notifications for DM messages.
- [ ] Moderation/controls (mute, block, report) and optional admin tooling.

By following these phases we’ll move from a single global chat to a scalable messaging system with dedicated channels and private conversations, while preserving the invite-only culture that defines Por El Deporte.
