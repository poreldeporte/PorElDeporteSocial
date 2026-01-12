# Game audience (groups)

## Purpose
- Let admins limit a game’s visibility to a saved group of members.
- Group members can join and add guests using the existing flow.

## Data model
- `community_groups`: id, community_id, name, created_by, created_at
- `community_group_members`: group_id, profile_id, created_at
- `games.audience_group_id` (nullable; null = community-wide)

## Access rules
- Admins: always see/manage all games.
- Players: can see a game if:
  - `audience_group_id` is NULL, or
  - they belong to that group.
- Direct links for non-members return NOT_FOUND.

## Group changes
- Removing a member from a group auto-drops them (and their guests) from upcoming games tied to that group.

## UI
- Community settings: Groups screen (review-members layout). Header right is a “+” create button.
- Create/Edit game: Audience section with an “Entire community” toggle and a group selector.
