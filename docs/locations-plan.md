# Locations Plan (Venues)

## Summary
Make venues first-class records and point games at `location_id`. Use Google Places for discovery and normalization, with a manual fallback. Keep everything global and simple.

## Decisions
- Venues only. No field-level modeling.
- One global `locations` table. Manual entries are global too.
- Google Places is optional seeding, not the source of truth.
- Lat/lng optional; store if Google returns it.
- No bulk import.

## Goals
- Canonical venue registry for per-venue metrics.
- Minimal admin effort and minimal UI friction.
- Safe dedupe without blocking game creation.

## Non-Goals
- Field-level metrics.
- Player-facing venue creation.
- Automatic geo updates or background enrichment.

## Current State
- `games.location_name` and `games.location_notes` are plain strings.
- API exposes `locationName` / `locationNotes`.
- UI uses a free-text location field in create/edit.

## Proposed Data Model
New table:
```
locations
  id uuid pk
  name text not null
  address_line1 text
  address_line2 text
  city text
  region text
  postal_code text
  country_code text
  place_id text
  source text check in ('google','manual') not null default 'manual'
  normalized_name text
  normalized_address text
  latitude double precision
  longitude double precision
  timezone text
  is_active boolean not null default true
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()
```

Manual entry requires: `name`, `address_line1`, `city`, `region`, `country_code`.

Games:
```
games.location_id uuid references locations(id)
```

Indexes and constraints:
- Unique on `place_id` where not null.
- Index on `lower(name)`, `normalized_address`, and `games(location_id, start_time)`.
- Optional index on `(country_code, region, city)` for analytics filters.
- RLS: authenticated read; admin-only write (mirror current games policy).

## Dedupe + Creation Logic
Rules (ordered):
1) If `place_id` exists and matches, reuse the venue.
2) Else if `normalized_address` matches, reuse the venue.
3) Else show possible matches by `normalized_name` + address similarity; admin chooses.
4) Else create a new venue.

Manual entry never overwrites an existing venue. If a match is found, reuse it.

Normalization (simple, deterministic):
- Lowercase, strip punctuation, collapse whitespace.
- Normalize common address terms (`st`, `street`, `ave`, `avenue`, `rd`, `road`).
- Build `normalized_address` from address fields when available.
- Store `normalized_name` and `normalized_address` on insert/update.

## Google Places Integration
Server-side only:
- `locations.searchPlaces(query)` calls Places Autocomplete or Text Search.
- `locations.upsertFromPlaceId(placeId)` calls Place Details, maps to schema, and upserts by `place_id`.

Manual fallback:
- `locations.createManual({ name, address_line1, city, region, country_code, ... })` creates a venue with `source = 'manual'`.
- Dedupe rules run before create.

## API Changes
Add `locations` router:
- `list` (search existing by name/address)
- `searchPlaces` (Google suggestions)
- `upsertFromPlaceId`
- `createManual`
- `byId`

Update `games` router:
- Accept `locationId` in create/update.
- Return `{ locationId, location }` plus legacy `locationName` during cutover.
- If `locationId` is set, derive `locationName` from `locations.name`.

## UI Changes
Admin create/edit game:
- Replace free-text location with a picker:
  - Search existing venues.
  - "Search Google" tab.
  - "Add manual venue" form.
- Store `locationId`.
- Keep `location_notes` for check-in instructions.

Game detail/list:
- Display `location.name` (fallback to legacy `locationName` until cutover).

## Migration + Backfill
1) Add `locations` table + `games.location_id`.
2) Backfill:
   - Insert distinct `location_name` values into `locations`.
   - Set `games.location_id` by name match.
3) Keep `games.location_name` during cutover.
4) After UI is fully `location_id`, stop writing `location_name` and treat it as legacy.

## Analytics
Per-venue metrics:
- Games count, attendance, waitlist rate, cancellation rate grouped by `location_id`.
- Optional rollups by `country_code` / `region` / `city`.

Track coverage:
- Percentage of games with `location_id` set.

## Rollout Plan
1) DB + API read support (safe, no UI change).
2) Admin UI picker + create/edit writes `location_id`.
3) Migrate existing games and watch coverage.
4) Lock down: require `location_id` for new games (admin-only).

## Codex Implementation Prompt
You are implementing venue locations as first-class records with optional Google Places seeding.

Constraints:
- No field-level modeling.
- No bulk import.
- Global venue list (manual entries are global too).
- Lat/lng optional; store only if Google returns it.
- Manual entries must not overwrite existing venues; reuse matches instead.

Tasks:
1) Add a migration:
   - Create `public.locations` table with fields described above.
   - Add `games.location_id` FK.
   - Index `locations(place_id)`, `locations(normalized_address)`, `locations(lower(name))`, `games(location_id, start_time)`.
   - Add updated_at trigger and RLS policies (authenticated read, admin write).
2) Backfill:
   - Insert distinct `games.location_name` into `locations`.
   - Set `games.location_id` by name match.
3) Add `locations` router under `packages/api/src/routers/` and register it in `packages/api/src/routers/_app.ts`:
   - `list` (search existing venues).
   - `searchPlaces` (server-side Google API call).
   - `upsertFromPlaceId` (place details -> upsert by `place_id`).
   - `createManual` (name + address_line1 + city + region + country_code).
   - `byId`.
4) Update `packages/api/src/routers/games.ts`:
   - Accept `locationId` in create/update.
   - Return `locationId` and `location` in list/byId.
   - Keep legacy `locationName` until UI cutover (derive from `locations` when possible).
5) UI:
   - Replace free-text location in `packages/app/features/games/form-config.ts` with a venue picker.
   - Use the picker in create/edit forms.
   - Display `location.name` everywhere currently using `locationName`.
6) Dedupe:
   - Add a simple normalization util in the API layer.
   - On manual create, check `place_id` then `normalized_address`; if match found, return existing.
7) Types:
   - Regenerate `supabase/types.ts` after migration.
   - Update client types derived from tRPC outputs.
8) Tests:
   - Add basic tests for normalization + dedupe behavior if feasible.
   - If not, explain why.

Deliverables:
- New migration file.
- Updated API routers.
- Updated UI location picker.
- Documentation update in this file if changes diverge.
