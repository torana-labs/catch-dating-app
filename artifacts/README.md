---
doc_id: artifact_retention
version: 1.0.1
updated: 2026-10-29
owner: design_system
status: active
---

# Artifact And Evidence Policy

`artifacts/` is for reviewable evidence with a named consumer, not a permanent dumping ground. Tracked marketing references must have a manifest or documented consumer. Raw app screenshots, UI captures, widget-dedupe reports, and failed golden diffs are regenerable evidence and stay ignored.

Other evidence lanes follow the same policy:

- `docs/visual_references/**` image files
- `test/goldens/failures/`
- root `firebase-export-*` and `emulator-data/`

The default retention period for regenerable evidence is 14 days unless an owning README or manifest records a longer product/legal need. Inspect retention candidates with:

```sh
node tool/repository_hygiene.mjs --scope evidence --json
```

Delete allowlisted candidates only with explicit mutation:

```sh
node tool/repository_hygiene.mjs --apply --scope evidence
```

The cleaner refuses tracked files, protected paths, worktrees, symlinks, and paths outside this repository. Curated evidence that informs a durable decision should be linked from the owner document; otherwise regenerate it when needed.
