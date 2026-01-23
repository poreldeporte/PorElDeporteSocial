# Community Wrapper — Product + System Spec

## Goal
Make **community** the top-level container for the entire app experience. Every screen, stat, roster, approval, rating, and game exists inside one community context.

## Core Principles
- One active community at a time.
- Everything is filtered by `community_id`.
- Switching communities switches the entire app surface.
- No “All communities” aggregation in v1.

---

## 1) Data Scope (What becomes community-scoped)
All the following are scoped to the active community:
- Home
- Games (list/detail)
- Schedule
- Leaderboard + stats
- Ratings
- Members + approvals
- Notifications
- Community settings
- Community chat (if/when used)

Profile:
- Identity stays global (name, avatar, phone, nationality).
- Stats/rating/recent form are community-scoped and displayed per active community.

---

## 2) User Flows

### A) New User → Community
1. Sign up / create account.
2. Verify phone + complete basic profile info.
3. Resolve memberships:
   - 0 memberships → Community selection (search/browse + request access; invite link/QR deep links also supported).
   - 1+ approved → enter favorite community (default to first approved).
   - Only pending/rejected → Community selection with pending banner + allow new requests.
4. Approved → Community Home.

### B) Existing User → App
1. If user has 1 approved community → auto-enter it.
2. If multiple approved communities → enter favorite; switcher available from Home logo.
3. User can set a **favorite** community; on app launch, log in to that one.
4. If user is approved in at least one community, never block app access due to pending memberships in other communities.

### C) Switching Communities
- Tap the main logo on Home → bottom sheet list.
- Select community → app reloads content in that scope.
- Switcher shows membership status (approved/pending). Rejected/left do not appear in My Communities.

---

## 3) Screens (Exact Experience)

### Community Selection
- Card list of available communities.
- Actions: “Request access”, “Search”.
- Messaging: “Communities are groups where games live.” (copy TBD)
- All communities are public, searchable, and browsable in this screen.
- Default sort: alphabetical by community name.
- Invites still create a request (approval required).
- Invite links/QR allow direct request without searching.
- Invite links/QR can be generated/shared by owners and admins.
- Invite links/QR are multi-use (one static link per community).
- No regeneration/invalidation in v1 (public link).
- Invite link uses community id (stable), not name slug.
- Renaming the community does not change the invite link.

### Pending Review (within Community Selection)
- “You’re in review. We’ll notify you when approved.”
- Optional later: “Message admin”.

### Community Home
- Shows: next games, active roster, key actions.
- CTA: “Join your first run.”
- Hero area uses the community logo.
- Tapping the main logo opens the community switcher.
- Community name is shown only on the Home header.

### Games / Schedule
- All queries filtered by `community_id`.
- Draft/roster/ratings unchanged, just scoped.

### Leaderboard
- Only community members.
- Ratings + stats based on community games only.

### Members / Approvals (Admin only)
- Approvals, reject, roles, settings.
- All actions scoped to active community.

---

## 4) Navigation Model

### Default Tabs (inside a community)
- Home
- Games / Schedule
- Leaderboard
- Profile (community-aware)
- Admin/Settings (admins only)

### Community Switcher (Home hero)
- Shows current community logo + name.
- Tap the Home hero → bottom sheet list.
- Each entry: name, member count, role (owner/admin/member).
- “Join another community” action.
- “Set as favorite” action (star icon). Only one favorite at a time.
- First approved community becomes favorite until switched.
- Home header title reflects the active community.
- Pending communities are visible but not selectable (tap does nothing).
- Rejected/left communities do not appear here.
- To switch communities, return to Home and tap the logo.

---

## 5) Data & API Implications
- Every query includes `community_id`.
- User context includes `activeCommunityId` and `memberships[]` (id, role, status).
- Communities store branding: `community_logo_url`, `community_primary_color`.
- Active community resolution order:
  1) Favorite community (if approved)
  2) First approved community
  3) If none approved → Community selection
- If favorite is no longer approved, fall back to the first approved community.

## 6) Branding Access
- Branding is public read (logo + primary color).
- Only admins/owners can edit via Community settings.
- Minimum surfaces:
  - Home hero logo + Home switcher icon
  - Notifications (logo + name)
  - Primary color for buttons/highlights
Admins/owners can edit all community settings fields (name/city/sport/branding).
Branding can be reset to defaults (remove logo, reset primary color).
City and sport are editable after creation.
Sport uses the same fixed list everywhere (no custom entry).

---

## 7) Permissions

### Non-Admin
- Can view / join games.
- Can view members list if allowed.
- Cannot access settings or approvals.

### Admin
- Can approve/reject members.
- Can configure community settings.
- Can manage games and roster.

### Roles
- **Owner**: creator of the community (full admin capabilities).
- **Admin**: same capabilities as today.
- **Member**: same capabilities as today.
- **Super Admin (global)**: can access all communities, approve community creation, and modify any community.
- Super Admins do not appear in community member lists.
- Super Admins are not members by default. They can only join games if they are approved members of that community (they can self-approve if needed).

---

## 8) Messaging / Copy
- Community select: “Find your people.”
- Pending: “You’re in review. We’ll notify you when you’re approved.”
- Home: “Welcome to {CommunityName}.”

---

## 9) Notifications
- Notifications are scoped to the active community.
- If user is in multiple communities, push opens the app in that community context.
- Notifications show community logo + name.
- If user is pending/rejected in that community, route to Community selection with the pending banner.
- Admins/owners receive a notification when a new membership request is submitted (push + in-app badge).

---

## 10) Deep Links & External Entry
- If deep link targets a community the user is **approved** in → open the target screen.
- If user is **pending/rejected/not a member** → route to Community selection with a banner and preserve the target route for later.

---

## 11) Profile Context (Important)
- Profile header stays global (name/avatar).
- Profile stats update per community (rating, W/L, recent form, badges).
- Community logo is shown in the Home hero area (not on the profile header).

---

## 12) Implementation Checklist

### Phase 1 — Data Scope
- Ensure all queries accept `community_id`.
- Ensure membership status is loaded early.

### Phase 2 — Navigation
- Add community switcher.
- Apply `activeCommunityId` globally.
- Persist favorite community and use it at launch.
- If user has zero memberships, land on “Join communities” screen.

### Phase 3 — UI Updates
- Home, games, leaderboard, approvals filter to active community.
- Profile and stats use community-scoped data.

---

## 13) Community Creation (Draft Spec)

### Intent
- Users can create a community (max 1 per user).
- Creation is instant, switches into the new community, and makes the creator the owner.
- CTA lives on the Join Communities page as “Start a community”.
- Single-form create flow (no multi-step).

### Create Fields
Required:
- Name
- City
- Sport (pick list: Fútbol, Basketball, Volleyball, Pickleball, Padel, Other)
City is free-text in v1.
Name length: 3–40 characters.

Optional:
- Logo (important, but not required)
- Description
- Primary color (optional; default to app primary)
No tagline field in v1.
Description max length: 160 characters.
Primary color only changes if user selects one (no auto-extract from logo).
No timezone field in v1.

### Ownership Rules (Single Owner)
- Exactly one approved owner per community.
- Owner cannot be demoted.
- Owner cannot leave without transferring ownership.
- Transfer should be explicit (no automatic promotion on leave).
- Transfer target: prefer an approved admin; if none, allow any approved member.
- If the owner is the only approved member, leaving is blocked; archive instead.
- Owner cannot delete/deactivate their account while they own a community.
- On ownership transfer, previous owner becomes admin.

### One-Community Limit
Rule: one community created per profile, permanent (even if ownership transfers).

### Deletion / Archiving
Rule: archive only (no hard delete).
- Archived communities are hidden from join/search and block new join requests.
- Archived communities remain visible to existing members in My Communities (disabled).
- Owner can archive/unarchive later (owner only).
- Only the owner can access an archived community; admins/members are blocked.
- Archived community is read-only for the owner (except unarchive).
- Existing games/memberships/stats remain intact.

### Name Uniqueness
Rule: global unique community name, case-insensitive.
Duplicate name blocks creation with a clear error.
Also enforced on name edits in Community Settings.
Archived community names remain reserved (no reuse).
Only name uniqueness matters (city/sport do not affect uniqueness).
Normalize names for uniqueness: trim and collapse whitespace.
Name characters: letters, numbers, spaces only (no special characters).
Accented letters are allowed.

---

## 13) Decisions (Locked)
- All communities are public and searchable.
- Multiple communities are allowed.
- Pending memberships never block access if another community is approved.
- Community switcher is opened by tapping the Home logo.
- Favorite community is the default on launch; first approved is favorite until switched.

---

## 14) Community Creation
- Creation is instant (no admin approval).
- Entry point: Join Communities screen (“Start a community”).
- If the user already created one, replace CTA with “My community” (opens it) + helper text “You can only create 1 community.”
- If archived, label “Archived community” and still open settings (with Unarchive).
- If the user already created one but is no longer a member, show disabled text “You already created a community.”
- Creator becomes **Owner** (approved), set as favorite, switch into the new community.
- Single-form create flow.
- Required: **name (3–40), city (free-text), sport (pick list)**.
- Optional: **logo**, **description (max 160)**, **primary color** (defaults to app primary).

---

## 15) Chat
- No community-level chat.
- Chat exists only inside each game draft room.

---

## 16) Membership Rules
- All communities require approval (no auto-join).
- For now, all communities are public/searchable/browsable. (Future: invite-only or hidden.)
- Members can leave a community.
- Leaving sets membership status to `left`.
- `left` members are hidden from member lists/leaderboards.
- Rejoin requires approval and reactivates the same membership (stats/history preserved).
- Users always have exactly one favorite community. Only approved communities can be favorited.
- If a user leaves their favorite, auto-select another approved community (favorite → first approved). If none approved, favorite is cleared and user goes to Join Communities.
- Admins can remove members; removal sets status to `left`.
- Pending communities are shown in the switcher but locked (not selectable).
- Rejected/left/kicked users appear in Join Communities like any other public community (no “pending” state).
- Reapply sets the existing membership back to `pending`.
- Pending requests cannot be canceled in v1.
- Kicked users see no special messaging in Join Communities.
- Recommended enums:
  - `join_policy` (future): `open` | `approval` | `invite_only`
  - `visibility`: `public` | `hidden`
- Guest rules:
  - Guests are per-game roster entries only (no membership, no profile).
  - Guests do not appear in members, stats, ratings, leaderboard, or badges.
  - Guest entries are scoped to the game’s community and are not shared across communities.

## 16b) Defaults
- If a community has no logo or primary color, use app defaults.

## 16c) Community Capabilities (Future)
- Use a single `communities.settings` or `communities.features` object to store per-community feature toggles.
- Example toggles: draft mode, ratings visibility, approvals required, chat enabled.

---

## 17) Zero Membership State
- If a user has zero memberships, land on a “Join communities” screen.
- Default layout: search + request access (invite link/QR via deep links).
- If all memberships are pending/rejected, show a “Pending review” state within the same screen.

---

## 18) Implementation Notes (Repo Touchpoints)

### A) Active community + favorite
- Add a community context/provider (new) to hold `activeCommunityId`, membership list, and favorite selection.
  - New: `packages/app/provider/community/CommunityProvider.tsx`
  - New hook: `packages/app/utils/useActiveCommunity.ts`
  - Wire into `packages/app/provider/index.tsx`
- Persist favorite community on `profiles.favorite_community_id` and default to the first approved community.
  - New column: `profiles.favorite_community_id`
  - Update on “Set favorite” in switcher.
- Store community branding on `communities.community_logo_url` + `communities.community_primary_color`.

### B) Membership roles + approvals (per community)
- Move role + approval from `profiles` to `memberships` (per community).
  - New columns: `memberships.role` (owner/admin/member), `memberships.status` (pending/approved/rejected/left).
  - Super Admin remains a global flag on `profiles` (not a membership role).
  - Update admin checks:
    - `packages/api/src/utils/ensureAdmin.ts`
    - `packages/api/src/utils/ensureOwner.ts`
    - `packages/app/utils/useUser.ts` (role should come from active membership)
- Update approvals + member list:
  - `packages/app/features/admin/member-approvals-screen.tsx`
  - `packages/app/features/admin/member-approvals-realtime.ts`
  - `packages/app/features/admin/member-list-screen.tsx`
  - `packages/api/src/routers/members.ts`

### C) Community creation
- Creation is instant (no admin approval flow).
- Enforce one community created per profile (permanent).

### D) Scope all queries by active community
- Games:
  - `packages/api/src/routers/games.ts` (list + byId)
  - `packages/app/features/home/screen.tsx`
  - `packages/app/features/home/schedule-screen.tsx`
  - `packages/app/features/games/detail-screen.tsx`
- Leaderboard + stats:
  - `packages/api/src/routers/stats.ts`
  - `packages/app/features/home/leaderboard-screen.tsx`
  - `packages/app/features/profile/screen.tsx`
- Community defaults:
  - `packages/api/src/routers/community.ts` (defaults must accept `communityId`)
  - Use `communities.community_logo_url` for home hero + switcher icon.
  - Use `communities.community_primary_color` for primary accents.

### E) Realtime invalidation
- Add `communityId` input to realtime hooks:
  - `packages/app/utils/useRealtimeSync.ts` (`useGamesListRealtime`, `useStatsRealtime`)

### F) Community switcher UI
- Add a bottom sheet switcher component launched from the Home logo:
  - Native: `apps/expo/components/FloatingHeaderLayout.tsx`
  - Web: `packages/app/features/home/layout.web.tsx`
- The switcher includes:
  - List of memberships (name + role)
  - Star “Set favorite”
  - “Join another community”
  - “Request community” entry

### G) Remove community chat
- Remove/repurpose:
  - `packages/app/features/home/community-screen.tsx`
  - `apps/expo/app/(drawer)/(tabs)/community/index.tsx`
  - `packages/app/constants/chat.ts` (`COMMUNITY_CHAT_ROOM`)

### H) Zero‑membership gate
- Add a join screen (new): `packages/app/features/community/join-screen.tsx`
- Gate access at app start (provider/router) to redirect if no memberships.
  - Update `apps/expo/app/(drawer)/_layout.tsx` gate to check approved membership count instead of `profile.approval_status`.
