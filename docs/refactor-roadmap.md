# Refactor Roadmap

## Current Findings
- Backend API: `packages/api/src/routers/teams.ts` and `games.ts` mix auth/validation/domain/Supabase with no unit tests; `trpc.ts` handles both native/web auth and env checks; `supabase-admin.ts` still uses `NEXT_PUBLIC_*` for service creds.
- Client app: `packages/app/features/games/detail-screen.tsx` and `draft-screen.tsx` are monoliths; pure helpers (`status-helpers`, `useGameDetailState`, `state/deriveDraftViewModel`) have specs but no runner, so they are unenforced.
- Design system: `packages/ui/src/index.tsx` re-exports all of Tamagui/Toast plus internals; `tamagui.config.ts` calls `setupDev` unconditionally; token/component surface is undocumented.
- Surface/dead code: `bento-bundle/` removed; wide `packages/ui` exports inflate bundle surface.
- Tooling: no `yarn test`; TypeScript unused checks disabled (`noUnusedLocals`/`noUnusedParameters` off) in base config.

## Goals
1) Backend confidence: extract queue/draft/result rules into pure domain modules, backed by Vitest; keep Supabase I/O in thin adapters.
2) Client stability: enforce guardrail tests for `deriveUserStateMessage`, `computeGameDetailState`, and draft view-model; split `detail-screen.tsx` into container + presentational pieces.
3) Design system discipline: gate `setupDev` to non-production; publish a curated `packages/ui/src/public.ts` surface (tokens + vetted components) instead of re-exporting Tamagui wholesale; document allowed tokens/components.
4) Tooling hygiene: add workspace `yarn test` (Vitest) and enable `noUnusedLocals`/`noUnusedParameters` in `packages/api` and `packages/app`.
5) Surface cleanup: trim `packages/ui` exports to the curated surface for tree-shaking (bento bundle already removed).

## Next Actions
- Tooling first: add Vitest to `packages/api` and `packages/app`, wire existing specs under `features/games` so they run via `yarn test`.
- Backend: move snake-turn/pick/undo/lock rules into `domain/*` with Supabase fakes in tests; keep routers thin with adapter calls.
- Client: add edge-case tests for cancelled/completed/locked/waitlist-full CTA states and confirmation window bounds; start splitting `detail-screen.tsx` into container + presentational components while reusing pure state helpers.
- Design system: guard `setupDev`; introduce `src/public.ts` curated exports and update app imports; document allowed tokens/components.
- Cleanup: drop or isolate `bento-bundle`; shrink `packages/ui/src/index.tsx` to the curated surface.
