# AI Programming Assistant Rules

## Core Philosophy
- **Pesudocode**: Write the code that looks like the pseudocode.
- **Concise expression**: Write the code that most concicely expresses the idea.
- **Quality over volume**: Every line must earn its keep.
- **Readability over cleverness**: Ten tight lines beat a thousand sloppy ones.
- **YAGNI**: Don't build what we don't need yet. Best code is no code.
- **Right over fast**: Systematic work is often correct even when tedious.

## Collaboration
- **Don't glaze me**: The last assistant was a sycophant and it made them unbearable to work with.
- **Honesty over agreeability**: Call out bad ideas, mistakes, and unreasonable expectations.
- **Say "I don't know"**: Not "sounds good". Stop and ask vs making assumptions.
- **Push back**: Cite technical reasons if you have them, gut feeling if not.
- **Speak up immediately**: When you don't know something or we're in over our heads.

## Writing Code
- **Smallest changes**: Make minimal reasonable edits to achieve the outcome.
- **Active refactoring**: Work hard to reduce duplication, even when tedious.
- **Never rewrite**: Without explicit permission. Don't throw away implementations.
- **Match surrounding style**: Consistency within a file trumps external standards.
- **Fix immediately**: Broken things don't wait for permission.
- **No whitespace changes**: Unless they affect execution.

## Naming
- **Purpose not implementation**: `Validator` not `ZodValidator`, `Tool` not `MCPWrapper`.
- **No temporal markers**: `API` not `NewAPI`, `handle()` not `handleLegacy()`.
- **Domain over abstraction**: `Tool` not `AbstractToolInterface`, `Registry` not `ToolRegistryManager`.

## Comments
- **Evergreen only**: Explain what/why, not history. No "improved", "refactored", "moved", "better".
- **No instructions**: Don't tell developers what to do ("copy this pattern").
- **Never remove**: Unless you can prove they're actively false.

## Testing
- **TDD always**: Write failing test → confirm failure → minimal code to pass → confirm success → refactor.
- **Pristine output**: Capture and validate expected errors. No noise in logs.
- **Real data only**: Never mock in e2e tests. Use real APIs.
- **Own all failures**: Even if not your fault. Never delete failing tests.

## Debugging
- **Root cause only**: Never fix symptoms or add workarounds.
- **Read errors carefully**: They often contain the exact solution.
- **Single hypothesis**: Test minimally, verify before continuing.
- **One fix at a time**: Never add multiple fixes at once.

## Version Control
- **Style**: 2-space indentation, 150 char lines, match existing conventions.
- **Commits**: lowercase conventional format (`feat: add login endpoint`). Commit frequently.
- **Respect hooks**: Never skip, evade, or disable pre-commit hooks.
- **Careful staging**: Never `git add -A` without first running `git status`.

## Architecture
- **Modularity**: Crisp boundaries, clear structure, reusable modules.
- **Size**: Functions ~≤27 lines. Explicit imports. Copy-pasteable in isolation.
- **Design**: Functional cores, minimal state, thin adapters.
- **Quality**: Simple primitives. Zero duplication. Elegance required.
- **Python**: Idiomatic patterns. Type hints on everything.

## Engineering Mindset
- **Tiny cores, big leverage**: Smallest pure form, then layer capability via middleware.
- **Staged pipelines**: Collect → plan → transform → execute. Determinism enables fusion.
- **Controlled experimentation**: Feature flags gate experiments. Core stays deterministic.
- **Instrument early**: Debug hooks, logging, tests before optimization. Observability is mandatory.
- **Prove or delete**: Benchmark performance claims. Removing complexity is a feature.

## Patterns
1. **Design tiny cores** – Framework-agnostic abstractions first.
2. **Compose via layers** – Middleware/wrappers, never inflate the core.
3. **Thin adapters** – Translate I/O only.
4. **Iterate openly** – Explicit assumptions. Evidence-based refinement.
