# Draft Room Live Overlay

## What changed

- Added an Instagram Live–style overlay on Draft Room:
  - message stack (bottom-left)
  - comment input pill (bottom)
  - reaction button + floating emoji animations (bottom-right)
- Reused existing draft chat room infrastructure:
  - room id uses `getDraftChatRoomName(gameId)`
  - messages are `chat_messages` + existing realtime broadcast
  - reactions are realtime broadcast only (ephemeral, not stored)

## Files touched

- `packages/app/features/games/components/DraftRoomLiveOverlay.tsx`
  - new component: chat overlay UI + floating reactions
  - hydrates chat history via `api.chat.history`
  - realtime messages via `useRealtimeChatRoom`
  - reactions via lightweight broadcast event `live_reaction`
- `packages/app/features/games/draft-screen.tsx`
  - wraps the screen in a container and mounts the overlay
- `packages/app/features/games/components/index.ts`
  - exports `DraftRoomLiveOverlay`

## Behavior summary

- Shows last 6 messages in a translucent stack.
- Input is anchored above safe area and stays above keyboard.
- Reaction button sends a heart broadcast and spawns local float animation.
- Reactions are throttled (~4 per second per device).
- No database or migration changes required.

## Pending / optional follow-ups

- Decide if reactions should be persisted in a table (currently ephemeral).
- If needed: add thumbs up/down or other emoji options.
- UX polish: adjust opacity/size/position for taste, or add an emoji picker.
- Verify on web (keyboard + pointer events) and confirm overlay doesn’t block draft interactions.

