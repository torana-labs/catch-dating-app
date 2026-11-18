# Catch Claude Context

Read [AGENTS.md](AGENTS.md) first and follow its routing, safety, and
verification rules. Reread them from the fresh task worktree after creation;
an older primary checkout may not contain current lifecycle enforcement.

Claude-specific notes:

- Preserve unrelated dirty work and inspect the current source of truth before editing.
- Use fictional names only: no real organiser, venue or brand names, handles,
  URLs or scraped records in the repo, issues, PR text or commits, and no bare
  `@name` in GitHub text (AGENTS.md, Non-Negotiable Rules).
- Keep machine-specific settings under ignored `.claude/`. Create task
  worktrees and close them out with the worktree guard exactly as
  [docs/agent_operating_model.md](docs/agent_operating_model.md) describes
  (Parallel Worktrees, Completion); that document owns the guard rules.
- Use [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) only as an orientation map. The documents linked from [docs/README.md](docs/README.md) own detailed contracts.
- Use [TESTS.md](TESTS.md) for test commands and [docs/release_operations.md](docs/release_operations.md) for release work.
