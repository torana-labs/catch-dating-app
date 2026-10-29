# catch-design-parity

Use for Claude/Figma/design-context to Flutter/Widgetbook parity work.

Read: `docs/design_parity/README.md`,
`docs/design_parity/composition_migration_spec.md`,
`design/components/catch.components.json`, and `docs/widget_catalog.md`.

Optional orientation:
`node tool/agent/context_pack.mjs --task design-parity --paths docs/design_parity,widgetbook,packages/catch_ui`.

Loop: inspect the real Widgetbook or design artifact, classify decisions as
`canonical`, `repair`, `unify`, `register`, or `discard`, update contracts and
Widgetbook coverage, then run the design parity gate.

Failure modes to avoid: aliases as final state, stale generated directories, and
separate design-context/component-contract worlds.
