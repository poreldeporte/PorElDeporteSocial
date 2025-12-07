# Design System Surface

- Import from `@my/ui/public` (or `@my/ui` which re-exports `public`) for a stable API.
- Included:
  - Theme: `config` (Tamagui config, dev tools gated to non-production).
  - Components: exports from `packages/ui/src/components` (cards, toasts, form fields, loaders, onboarding, links, submit button, datepicker).
  - Token check: `validToken`.
  - Tamagui primitives and toast helpers are currently forwarded for compatibility; prefer the component exports when possible.
