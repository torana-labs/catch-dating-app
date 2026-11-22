# catch-tooling-automation

Use for repository tooling, scanners, generators, runners, and agent-harness
automation under `tool/`.

Read: `AGENTS.md`, `tool/README.md`, and `docs/agent_operating_model.md`.

Optional orientation:
`node tool/agent/context_pack.mjs --task tooling-automation --paths tool`.

Loop: update the owning implementation and its focused test, register ownership
and CI requirements in its `tool/manifest/tools/` file, then run the exact affected
checks plus manifest validation.

Closeout: follow `docs/agent_operating_model.md#completion` while task context is
fresh. Keep the guarded claim through merge/release acceptance, inspect exact
`retire` output, and run admitted `retire --apply` from outside the worktree.
Report retirement or its exact retention reason, accountable owner and next
action in the existing task/PR handoff. Claim-only `finish` does not retire it.

Failure modes to avoid: adding an unregistered script, allowing one file to map
to every active tool, using a full-repository fallback for an index-safe check,
or describing enforcement in prose without an executable check and test.
