# Session Notes (Context + Actions)

## Product/context we see
- Por El Deporte social sports app with web (Next) and native (Expo) shells sharing code in `packages/app`.
- Core flows: game creation/scheduling, roster/queue with waitlist, draft teams (captains pick), match results and stats, profile/settings/auth screens. Uses Supabase (auth, data, RLS) and tRPC (`packages/api`).

## Architecture snapshot
- apps/: `next` (web), `expo` (native), `storybook` / `storybook-rn` (component docs).
- packages/: `app` (features/screens/state/hooks), `api` (tRPC + Supabase admin), `ui` (Tamagui theme/components), `fonts-and-icons`, `config`.
- supabase/: schema, migrations, seed.
- Removed: `bento-bundle/` (previous demo components).

## Design system
- Import via `@my/ui/public` (exports config + components + Tamagui/Toast; dev setup gated to non-prod). Path alias added in `tsconfig.base.json`; package exports include `./public`.
- Curated docs: `docs/design-system-surface.md`.

## Recent UI tweaks
- Game detail badge no longer shows “You dropped”.
- Draft status card hides after draft completion.
- Match summary copy simplified; captain shown with a badge, no redundant “Team” labels or “Teams locked in” after completion.
- Leaderboard hero cards fit one row on larger screens (responsive wrap on small).

## Backend/domain
- Draft helpers: `nextSnakeTurn`, `undoPayload` extracted to `packages/api/src/domain/draft.ts` with tests.
- Mark-completed util has a Vitest spec.

## Testing
- Vitest wired in `packages/app` and `packages/api`; run `yarn test` (root) for all suites.
- Existing guardrails: games status helpers, game detail state, draft view model, draft domain, markGameCompleted util.

## Tooling/commands
- Install deps: `yarn install` (use repo `yarn.lock`; avoid stray `package-lock`).
- Tests: `yarn test`.
- Web dev: `yarn web` (Next).
- Native dev: `yarn ios` / `yarn android` from root scripts (delegates to `apps/expo`).

## Known gaps / next improvements
- More backend domain tests for draft pick/undo and queue rules.
- Tighten TS unused checks (`noUnusedLocals/Parameters`) incrementally.
- Ensure Next `_document` is valid (invalid-hook errors noted when mixing lockfiles/react versions).
