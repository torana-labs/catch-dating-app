# catch-architecture-refactor

Use for broad app code organization, feature-boundary, controller, async-state,
repository, widget-ownership, and testability refactors under `lib/**`.

Read: `docs/app_architecture.md`, `lib/README.md`, and the owning
architecture/design contracts for the changed surface.

Optional orientation:
`node tool/agent/context_pack.mjs --task architecture-refactor --paths lib,docs/app_architecture.md`.

Loop: inspect the read-only impact plan, edit a coherent batch, run focused
tests/analyzer/scanners, and keep compile-critical generated artifacts current.
Git and CI output preserve the evidence.

For repeated architecture patterns, prototype first:

1. Create or reuse a pattern id from the exhibits in `docs/app_architecture.md`.
2. Build one high-quality reference implementation before broad migration.
3. Copy the reference code excerpt into `docs/app_architecture.md` as an
   exhibit.
4. When the pattern must hold everywhere, make it a lint. Exceptions are reasoned
   `// ignore:` comments next to the code, not a list of adopters.
5. If a later candidate improves the pattern, update the exhibit first and
   revisit all earlier adopters in the same pass.

Failure modes to avoid: ad hoc file choice, stale generated output, and
feature-boundary moves that do not update the canonical architecture doc.
