# agents

Hello agent.

This repo values **radical simplicity** and **maximum elegance**.
Prefer code that reads like pseudocode, concisely expresses the idea, and reduces cognitive overhead.

## philosophy

Every line must earn its keep. Prefer readability over cleverness.
If carefully designed, 10 lines can have the impact of 1000.

Optimize for **low cognitive load**:
- few concepts
- crisp boundaries
- deterministic flows
- obvious ownership

## collaboration

Don't glaze.
Be honest. Push back on complexity.
Say "I don't know" and ask when unsure.

Work safely:
- Assume the worktree is shared and dirty; never discard/revert/overwrite changes you didn't make; stop and ask if you see unexpected diffs in files you'll touch.
- Never rewrite large areas without explicit permission.
- One fix at a time.
- Fix root causes, not symptoms: if a bug points to a broken abstraction or missing invariant, fix that systemically instead of adding a band-aid.
- If context compacts, pause and ask for the missing context before continuing.

## design

- **tiny core, wide reach**: identify the primitives; everything else is composition.
- **one source of truth**: define once; derive enums/tables/build artifacts from it.
- **truth is visible**: no magic shims; call/import the real thing.
- **determinism is a feature**: prefer stable outputs and reproducible layouts.
- **wrappers must pay rent**: only wrap to add a real seam (invariants, instrumentation, caching, retries); otherwise call directly.
- **core is pure**: domain logic is `args -> return`; edges do I/O and translation.
- **normalize variability early**: turn "optional/sync/async/env-dependent" into one straight-line flow at the boundary.
- **resource budgets are explicit**: cap time/memory/recursion at boundaries; enforce them.
- **start simple, upgrade late**: pick the cheapest representation; upgrade only when needed.
- **immutable is canonical**: keep static data read-only; copy on mutation.
- **one canonical path per concern**: one settings mechanism, one client creation path, one storage boundary, one job/runner pattern.
- **abstraction barriers matter**: lower layers don't import upward; cycles are design bugs.
- **ownership is explicit**: who owns state/caches/locks/clients is obvious; lifetime is managed.

## code shape

Write code that reads like pseudocode and most concisely expresses the idea.

- **top-down files**: main entrypoints first; helpers later; deep internals last.
- **straight-line flow**: happy path first; guard returns only when they simplify.
- **bounded passes**: parsers/compilers should be one-pass or bounded; avoid unbounded recursion.
- **small functions**: if a function grows past ~27 lines, consider splitting by responsibility.
- **small files**: if a file grows past ~270 lines, consider splitting by responsibility (not by "layer").
- **no clever golf**: compactness is good only when readability improves.
- **default: no comments/docstrings**: code should be self-explanatory; only add them when they carry necessary "why/contract" value (invariants, public APIs, tricky edges).

## naming + api

- Names carry intent: short, purpose-first nouns/verbs.
- Avoid "Manager/Helper/Util" unless it's truly generic.
- Keep the public surface minimal and stable; keep boundary data dumb.

## types + invariants

Types clarify invariants and public contracts; don't decorate internals with noise.
Invariants live in the core; errors are shaped and actionable.
Failure is a first-class path: the core returns outcomes (or throws specific errors); edges translate into logs/UI/HTTP.
Prefer explicit tables/patterns over sprawling branching when behavior is structural.
Centralize coercion/translation; don't scatter implicit conversions.

## imports + dependencies

Make dependencies obvious.

- Prefer explicit imports/exports; avoid implicit "magic surfaces".
- Avoid re-export chains that hide where things come from.
- Avoid "preludes"/wildcard exports that make the surface implicit.
- Avoid aliasing; only alias to resolve a real collision, and keep it rare and consistent.
- Group imports by origin with blank lines: platform/stdlib -> third-party -> repo/external modules -> local/same-package.
- When the language supports it, prefer local/same-package import forms that make locality obvious (and keep them grouped and ordered from broader to nearer).

## testing + change hygiene

Don't mix functionality changes with whitespace-only changes.
Functional changes should be tested.
If something is hard to test, explain why.
Make nondeterminism explicit and controllable (time/randomness/env variability).
Commit messages: short, action-first, mostly lowercase; optional `scope:` prefix and optional `(#PR)` suffix, tinygrad-style.

Tests should assert:
- expected behavior
- expected failures
- key invariants (including performance invariants when they are part of correctness)
- stress invariants with adversarial configs (force worst-case paths)

If you claim a speedup, measure it. If you add complexity, justify it.
