---
doc_id: agent_operating_model
version: 3.8.0
updated: 2026-10-29
owner: agent_operating_model
status: active
---

# Agent Operating Model

Catch should be easy for an AI agent to change because the repository has
small routing documents, explicit source contracts, and deterministic checks.
The goal is not to make agents remember more. It is to make the correct path
the shortest path.

## What This Harness Is

Git already owns source, history, branches, worktrees, diffs, and recovery.
GitHub Actions already owns shared execution, artifacts, approvals, and
deployment history. Catch adds only three repository-specific layers:

1. `tool/harness.mjs` is a read-only impact planner. It maps explicit paths or
   a Git diff to existing checks, build lanes, and delivery lanes, using the
   path-to-component graph in `tool/harness/component_graph.json` and an event
   mode: `pr` (validation before merge), `merge_group` (the exact queued
   result), `main` (affected builds and deploy groups after integration),
   `nightly` (broad backstop) or `release` (promotion). Unknown or ambiguous
   paths fail closed. Adding a component relationship is an architecture
   change; ordinary feature work does not edit the graph.
2. `tool/agent/context_pack.mjs` is optional read-only guidance. It prints
   relevant owner docs, project skills, source rules, and check suggestions to
   stdout for a supplied path set.
3. `tool/git/worktree_guard.mjs` is an optional thin safety wrapper around
   ordinary Git worktrees. It protects exact-base creation, claimed-path
   overlap, dirty or out-of-scope work, unpushed handoff, and guarded retirement
   through ordinary non-forced Git after verified acceptance.

None of these layers schedules agents, runs a hidden command pipeline, owns
product state, or replaces Git and CI. `tool/tools_manifest.json` gives existing
commands stable ids and `node tool/run.mjs check <id...>` runs them; it is a
command runner, not a second test framework. Exact-artifact delivery is owned by
[`release_operations.md`](release_operations.md#exact-artifact-promotion-and-resume).

## Operating Principle

Treat every agent as a capable contributor with unreliable ambient memory. A
rule that matters must be one of:

- executable: a lint, scanner, test, contract check, preview coverage gate, or
  CI job;
- authored: a canonical source document or domain contract with a clear owner;
- derived: read-only planner output, Git state, or an expiring CI artifact; or
- explicitly manual: a named review point in the owning runbook.

Do not create tracked execution histories. The former audit inventory, pass
history, documentation catalog, regression snapshot, and readiness machinery
have been removed. Put recurring protection in the owning test or scanner.

Guardrails against another governance layer:

- Ordinary product changes modify zero governance-evidence files, and no check
  writes tracked source by default.
- Derived reports are generated on demand or uploaded as expiring artifacts.
- No new ledger, receipt file, readiness score or per-task registry replaces
  the removed system.
- New Harness functionality must prevent a demonstrated failure or materially
  reduce wall-clock or runner cost.
- Nightly broad validation is the backstop for omissions; PR validation stays
  affected-only.

## Starting Loop

[`AGENTS.md`](../AGENTS.md) owns the starting loop; do not restate it here.
Two details extend it:

- If the primary `main` cannot fast-forward to fetched `origin/main`, retain it
  and report the exact divergence. Never reset or stash another task's work to
  refresh the launcher. Maintenance and retirement use current lifecycle
  tooling, not an old task's copy.
- For one path set, `node tool/harness.mjs explain --paths <path[,path...]>
  --json` shows why each check was selected. Before a broad edit, state the
  outcome, included and excluded paths, owner docs, focused checks and
  acceptance criteria (see the Broad Cleanup Contract below).

## Execution Venue And Source Handoff

Default new source tasks to the saved Codex Cloud VM after checking its actual
toolchain against `tool/ci/toolchain.env`. On that VM, source
`/workspace/catch-cloud-setup/env.sh` when it exists. Install only the dependency
family selected by the task's checks with `bootstrap_worktree.sh --target
<family>` (`root`, `functions`, or `flutter`). Omit bootstrap for checks that
need no packages. Use `--target all` explicitly only when all three families are
needed. The bootstrap refuses an omitted target before installing anything.
Each task still has one guarded worktree and its own dependencies; do not copy
or symlink another checkout's installed packages. Close accepted worktrees with
the existing retirement procedure instead of accumulating completed checkouts.

Run Linux and Android checks in cloud or CI when their pinned inputs are
available. Prefer the existing hosted macOS CI build and visual lanes for iOS
and macOS source verification. Use the local iMac for connected devices and
macOS-specific local work that the hosted lane cannot prove. Keep required CI,
security/ownership review, user approval, and live-provider release gates.

Commit the exact source tree, publish the branch through ordinary Git/PR
tooling, and ask CI to verify that head. Cross-environment handoff uses that
commit, not a downloaded/generated snapshot whose origin or completeness is
unverified. If push is unavailable, retain the commit and report the exact
publication barrier to the integration owner. Every ready PR runs CI without
the queue-only macOS and app-build lanes, and the merge queue validates the
combined source with every lane before `main` moves. When a task's PR is
ready, its owner turns on auto-merge (`gh pr merge --auto` or the equivalent
API call) in the same step that marks it ready: GitHub queues it once Required
CI passes and the merge queue lands it after its own run, so no one clicks
merge. A draft is the only hold: keep a PR in draft while it still waits on
owner input, a live-provider gate or another PR, and say which. Do not turn on
auto-merge for a PR you did not open unless its owner asks. A
draft intentionally skips CI until it is marked ready: report the draft state as
the blocker, give the integration owner the readiness action, and do not call
the skipped lanes test failures. A disconnected
agent or VM does not establish task termination: inspect the branch, running
process/command or CI run, and latest output after reconnecting. Report a
blocked task with its exact commit, last observed command or run evidence,
accountable owner, and specific next action. Do not mark work done based on
elapsed time, a stale status label, or an unverified command assumption.

## Enforcement Integrity

Rules, tools, CI wiring, and documentation anchors must not drift
independently. Active rules in `tool/policy/rules.json` name their
enforcement. Manifest tools that enforce a rule name the reverse mapping and,
for gates or ratchets, prove that the check cannot pass vacuously. A genuinely
manual check is declared as manual in its owning rule.

Run the meta-gate after changing an enforcement asset:

```sh
node tool/run.mjs check meta:enforcement-integrity
```

Update the rule, manifest entry, documentation anchor, executable known-bad
proof, and ratchet baseline together when those sources are affected. Do not
add a prose-only rule that claims deterministic enforcement.

## Execution Modes

| Mode | Use when | Required behavior |
|---|---|---|
| `answer` | The user asks a pointed question | Read the narrow source of truth and answer from current files or live state. |
| `focused-change` | The user asks for a specific code or document change | Edit the smallest safe surface and run focused checks. |
| `broad-cleanup` | The user asks for cleanup, migration, consolidation, or refactor | Inspect the read-only plan, declare scope, fix a coherent batch, and run selected checks. |
| `design-implementation` | The user gives a design, handoff, or screenshot | Convert intent into component contracts and preview states before or alongside implementation. |
| `release-operation` | The task affects deploy, CI, Firebase, App Store, or production data | Follow the release runbook and verify external state when the answer depends on it. |
| `parallel-delegation` | Independent work can proceed concurrently | Use disjoint Git worktrees and keep one final integration owner. |
| `strategy` | The user asks what to do | Separate current facts from recommendations and propose an executable next pass. |

## Broad Cleanup Contract

Before editing a broad surface, be able to state:

- the durable outcome;
- included and explicitly excluded paths;
- owner documents and source contracts;
- executable rules and relationships that apply;
- commands that prove the batch; and
- observable acceptance criteria.

If the plan is too broad to review as one diff, split it into coherent batches.

## Reference Pattern Contract

Repeated architecture migrations start with one high-quality reference
implementation, not prose alone. Use the existing pattern-adoption contract
when the surface is governed by one:

- create or reuse its pattern id;
- build and verify one reference implementation;
- keep the reference exhibit in the owning architecture document current;
- classify adopters, variants, and explicit exceptions; and
- if a later adopter improves the pattern, update the reference and revisit
  earlier adopters.

This is product architecture state, not agent execution state.

## Git Preservation And Reconciliation

Working branches are single-use preservation units. Commit bounded work and
push when publication is authorized; otherwise hand the exact commit to the
integration owner and report that remote preservation is pending. Do not leave
unique intended work only in a working tree, stash, or reflog.

Before a rebase, reset, amend, history rewrite, or conflict-heavy merge:

1. fetch and record the current branch, HEAD, upstream, and status;
2. create a dated recoverable `backup/` ref when the branch has unique or
   shared work;
3. keep `rerere.enabled=true` for stable repeated conflict resolution; and
4. never rewrite a shared upstream branch; create a fresh branch and import
   reviewed commits instead.

For a reconciliation touching more than 50 paths, use the exact four-tree
classifier. Review every path where both sides diverged; exact blob comparison
cannot prove semantic incorporation.

```sh
node tool/git/audit_merge_drops.mjs \
  --base <merge-base> --ours <pre-merge-ours> \
  --theirs <integrated-tip> --merged <result> --json
```

Governed Markdown owns its identity, semantic version, update date, owner, and
lifecycle in source frontmatter. Validate it against Git directly:

```sh
node tool/docs/check_doc_metadata.mjs --base origin/main
```

After a squash or merge is proven on `origin/main`, follow the manual completion
and retirement checks below before removing its disposable worktree or pruning
its single-use branch. Do not reuse it for another slice.

## Repo-Managed Pre-Commit Hook

Install the repository hook for this clone only; do not use `--global`:

```sh
git config core.hooksPath tool/git/hooks
git config --get core.hooksPath
```

`core.hooksPath` is stored in the repository's common Git config, so linked
worktrees inherit it. The hook reads the source-owned compile-codegen catalog.
Staged localization ARB changes regenerate and explicitly stage the declared
Flutter outputs; staged Dart files are formatted and explicitly re-staged; all
committed compile-critical generator families run their declared
freshness checks when an input or output is staged. Contract changes therefore
check both schema projections and, for `contracts/callables/**`, Admin callable
validators. A failure prints the exact write command to run.

The hook does not run the analyzer or broad test suites. It refuses partially
staged Dart files because formatting and re-staging one would otherwise absorb
unstaged work into the commit. Install only the dependency families needed by
the triggered hook/checks; do not bootstrap every worktree with the full stack.

## Parallel Worktrees

Parallel agents are useful only when one parent remains responsible for the
integrated result. Assign disjoint file sets. Keep shared architecture
decisions, canonical owner documents, common manifests, and final verification
with the parent unless a child is explicitly assigned the whole file set.

After creating a worktree, install only its required pinned dependency family
with the repository command:

```sh
bash tool/git/bootstrap_worktree.sh --target root       # root npm checks
bash tool/git/bootstrap_worktree.sh --target functions  # Functions checks
bash tool/git/bootstrap_worktree.sh --target flutter    # Flutter checks
# Use --target all explicitly only when the task needs all three.
```

The command checks the selected committed manifests and lockfiles, then runs
their `npm ci` or `flutter pub get` in that worktree. Keep installs local to the
worktree; do not symlink another checkout's `node_modules` or invent `NODE_PATH`
overrides. A docs-only worktree with dependency-free checks needs no install.

Use the worktree guard to create every new task worktree. It also provides the
overlap and closeout checks needed when several local tasks are active:

```sh
node tool/git/worktree_guard.mjs start \
  --task-id <task-id> \
  --base-sha <40-character-sha> \
  --paths <claimed-path[,claimed-path...]>
node tool/git/worktree_guard.mjs doctor --worktree <path>
node tool/git/worktree_guard.mjs scope --paths <additional-paths> --worktree <path>
node tool/git/worktree_guard.mjs finish --worktree <path> \
  --retain --reason <blocker-and-next-action>
node tool/git/worktree_guard.mjs finish --worktree <path> \
  --abandon --reason <why> [--by <identity>]
node tool/git/worktree_guard.mjs retire --task-id <task-id> --worktree <path> \
  --head-sha <task-head> --accepted-sha <verified-integrating-commit> \
  --by <task-owner> --clearance <current-closeout-evidence>
node tool/git/worktree_guard.mjs stale --stale-days 7
```

Fetch `origin/main` immediately before resolving `--base-sha`. `start` rejects
any other base, then creates a normal branch and worktree at that exact commit
and records a disposable local claimed-path set. Continue explicitly requested
non-main work in its existing worktree rather than creating a new task from an
ambient branch. It refuses overlap with another active local claim. `doctor`
reports registration, branch, dirty-state, and out-of-scope problems. Its
committed scope uses the latest shared ancestor with fetched `origin/main`, so
ordinary upstream merges do not claim other tasks' changes. The original exact
base still must be an ancestor of the task head; unavailable main history keeps
the original scope window. Dirty paths are always checked independently.
When authorized work reveals additional files, use `scope` before editing them.
It adds paths under the same transition lock, preserves the original task
identity and Git state, and refuses overlap with another task or any existing
inspection blocker. In-scope uncommitted work is preserved; already out-of-scope
edits cannot be legitimized through scope expansion. Repeated additions are
idempotent. The command cannot narrow a claim or change its branch or base.
Plain `finish` refuses claim-only closeout. `finish --retain --reason <why>`
checks that the branch is clean and unique work is pushed, reports handoff
readiness rather than completion, and preserves the original claim and
worktree. Its reason names the accountable next action/review condition.
Successful `retire --apply` is the normal path that removes the checkout and
then its claim. `stale` reports candidates and
never deletes anything. When a task is deliberately superseded and pushing its
commits is inappropriate, `finish --abandon` releases the claim only if the
worktree is clean. It requires a reason, records `--by` or the local Git
identity in a disposable file under Git's common directory, and leaves the
branch and worktree untouched.

For a task awaiting acceptance, keep the claim until `retire` rather than
calling `finish` without an explicit retention reason. `retire` reports
eligibility and exact retention reasons; its explicit `--apply` performs only non-forced `git worktree remove`
and releases the own claim after verifying path and registration absence.
It preserves every branch, recovery ref and stash. Unique task commits count
as remotely preserved when the task branch, or the `refs/pull/<number>/head`
ref GitHub keeps after the merge queue deletes a merged branch, points at the
exact head on `origin`; acceptance is still proven only by the task-path
comparison, never by PR status. Disposable task branches are `codex/` and
`claude/` branches outside `*/backup/`. Repeat after successful
closure returns `already_absent` without another removal; absence alone never
claims acceptance or a newly retired task. Missing claims on existing worktrees
remain blocked and must not be recreated to bypass ownership review.

The guard does not fetch, install dependencies, run checks, push, merge, delete
refs, or authorize commands. `retire` checks live remote refs read-only and
requires manual owner clearance and normal cleanup admission. Ordinary Git remains appropriate inside an
existing task worktree; new task creation goes through the guard.

### Delegation Flow

1. The parent records its exact base SHA and assigns non-overlapping claimed
   paths. It may inspect a planner result or optional context guidance first.
2. The child confirms its worktree, branch, base SHA, and status before editing.
   When using the guard, `doctor` performs the local safety inspection.
3. The child edits only its assigned files, runs focused checks sequentially
   where the toolchain requires it, commits, pushes only when authorized, and
   reports the branch, commit SHA, changed files, checks, and blockers.
4. The parent reviews the Git diff and imports only accepted commits into an
   integration worktree created from freshly fetched `origin/main`. Small,
   compatible ready tasks may share one PR; one task does not require one PR.
   Batch only when dependencies, source authority, and ownership allow each
   task to be accepted and reverted independently, and the combined diff stays
   bounded. Keep high-risk security, schema, and payment changes separate.
   Review the combined diff and evidence, then derive and run the full required
   CI and release verification once against the exact integrated tree. Worker
   checks support that review; stale branch statuses do not prove the result.
   Every required review, branch protection, and current-source gate still
   applies. Isolate a failing task and reverify the resulting tree before
   delivery; do not waive a failure to keep the batch together.
5. Keep the own claim through merge and required release acceptance, then use
   `retire` and its normally admitted `--apply` path under the completion checks
   below. A deliberately superseded task may use clean-only `finish --abandon`;
   that releases its claim, preserves all work and is not shipped completion.

If a child appears on the parent's worktree or edits an overlapping file set,
stop it and preserve only a reviewed Git diff. If the parent base advances,
finish or preserve the old proposal and create a fresh worktree from the new
exact SHA instead of silently rebasing a live child.

### Ownership Rules

- One file has one writer during a parallel batch.
- Claim the paths a task will write, not every path it may read. Use a whole
  feature-root claim only when the planned edits require that breadth.
- Parent-owned by default: `AGENTS.md`, this document, canonical architecture
  docs, authored design contracts, shared manifests, and integration changes.
- Children avoid generated output unless generation is their explicit task.
- Flutter tests, Flutter analysis, emulator checks, and native builds run
  sequentially unless one isolated verification owner is assigned.

Assess delegation with ordinary task and PR wall time, merge conflict rate,
escaped defects, and user rework. Keep that analysis in the task or CI system,
not in repository telemetry.

### Manual CLI Delegation Review

The parent owns this review when using an external agent CLI; the Catch
planner does not dispatch agents or certify their completion.

- Inspect the installed CLI's version and help before relying on unfamiliar
  model, sandbox, or output flags. Confirm the selected model can run under
  the configured account; a remembered model name or configuration is not
  proof of availability.
- For JSONL runs, require a successful process exit and a terminal
  `turn.completed` event. Treat `turn.failed`, a terminal error, or a missing
  completion event as failure even if a result file exists or the process
  exits zero. Inspect the reported diff and checks before accepting the work;
  model completion alone does not prove the requested outcome.
- Give read-only reviewers read-only access. Before assigning commits or
  toolchain work, account for the linked worktree's common Git directory and
  the required SDK/package caches. Those may sit outside the child's writable
  directory. An `EPERM` or cache-lock failure is an environment constraint,
  not evidence that the product check passed or the requested edit is wrong.
- Keep permission changes explicit and narrow. The parent can own commits or
  verification when a child's sandbox cannot support them. Preserve partial
  work and report the limitation; do not disable the sandbox, share another
  checkout's dependency tree, or skip a failed gate to manufacture success.

Keep CLI event streams and review reports in temporary output or CI artifacts.
Do not add a tracked delegation history or a second worktree registry.

## UI And Design Implementation

Design work should flow through:

```text
design or handoff
  -> component or screen contract
  -> Widgetbook state or preview surface
  -> implementation
  -> screenshot, golden, or focused visual review
  -> deterministic design checks
```

When intent is ambiguous, inspect the actual artifact or preview before asking
for a narrow product decision.

## Regression Ownership

Put regression protection in the owning test, scanner, component risk gate, or
named manual release check. Do not recreate a central regression database.

## Project Skills

Project-local skills under `docs/agent_skills/` are short routers to canonical
documents and existing checks. Their machine-readable manifest owns path
matching and required checks. Context guidance is optional and does not make
the skills a second architecture system.

After changing skill routing, run:

```sh
node tool/run.mjs check agent:context-pack
```

## Storage Discipline

Retire accepted disposable worktrees while their context is fresh. Retained
worktrees need an exact path, owner, reason and next action in the existing task
handoff. Age, a merged PR, an unclaimed checkout, or a green hygiene audit does
not replace preservation/ownership checks. Keep lightweight Git recovery refs
instead of repeated full source clones when they provide the required recovery.
Do not copy installed dependencies into backup/source handoffs.

Install only the selected dependency family. Keep required recovery and release
outputs explicitly identified so generated caches can be reviewed and removed
at closeout. Dart's global analyzer/plugin caches and application update caches
are shared across tasks: inspect their size and active consumers separately,
never delete them from a child task's closeout. Re-measure actual filesystem
free space after approved cleanup; apparent folder totals are not recovered
bytes on APFS.

The local branch-hygiene automation and GitHub Branch Hygiene workflow are
read-only auditors, not cleanup workers. They must not be represented as
retiring local checkouts. Follow up on actionable retained-worktree findings
through the existing task owner; do not create another tracked cleanup ledger.

## Completion

A local contribution is ready for handoff when its intended source and
contract changes exist, compile-critical generated output is synchronized,
relevant deterministic checks pass, and the bounded diff is preserved in an
exact commit. Report that commit, checks, and remaining blockers to the
integration owner; local handoff does not establish that the task has shipped.

The task owner performs this manual lifecycle through existing Git, CI, release,
and connected task tooling, only within the user's authorized scope:

1. Move work from **Ready for execution** into execution with an agreed outcome,
   scope, and acceptance criteria; use the guarded task worktree.
2. When publication is authorized, open or update the PR, complete its required
   reviews and CI gates against the exact head, and turn on auto-merge when it
   is ready; obtain a separate merge approval only where branch protection or
   the owner requires one. For a batch, retain each task's commit, acceptance criteria,
   focused test results, and independent revert mapping in the existing PR/task
   tooling. If squash is required, map each task to its incorporated paths and
   behavior in the squash commit and record how to revert that task safely.
   A local commit or green check alone is not merge verification.
3. Verify the accepted change on fetched `origin/main`, including incorporation
   after a squash. If acceptance requires a release, follow
   `docs/release_operations.md` and verify the exact release and required live
   checks. Keep original task PRs open until their accepted changes are verified
   equivalent on merged `origin/main`; then link the integrating PR before
   closing superseded proposals. Report pending authorization, delivery
   failures, or unverified state.
4. Only after merge and any required release acceptance are verified, update the
   task to **Done** in Linear through the existing connected owner tooling, with
   the PR/commit and verification evidence. Confirm the update succeeded. If the
   tooling is unavailable or rejects the update, report the status blocker;
   never claim Linear synchronization or task completion from a local handoff.
5. Complete the retirement checklist below for the task's own disposable
   worktree and eligible branches while the task context is fresh. Record the
   exact retirement result or retention reason in the existing task handoff; do
   not defer routine closeout to a separate cleanup task. No tracked harness
   evidence is required.

Retirement is part of closeout, using existing Git and the guard:

1. Fetch and prove the task's accepted source is equivalent on `origin/main`,
   including after squash or batch integration. Check required CI and release
   acceptance before treating a proposal as obsolete.
2. Verify the exact worktree, local/upstream branches and claim belong to this
   task. Check active owners, other users and running task processes; inspect
   dirty and untracked files, stashes, unique commits and unpushed work.
3. Preserve unincorporated work and verify recovery references before removing
   anything. A merge, Done status or stale claim never permits discarding other
   work. Retain the worktree when another active owner or dependency needs it.
4. Run the guard's `doctor`, then `retire` from outside the own guarded worktree
   while its original claim still exists. Supply exact `--task-id`, `--worktree`,
   `--head-sha` and the verified integrating `--accepted-sha`. The guard checks
   current live main, accepted-commit ancestry, all task paths after squash
   (including additions/deletions/modes), exact local recovery tip and live
   remote preservation of unique commits. Any differing or empty unmerged task
   delta is retained for integration review, not assumed equivalent. Dirty,
   untracked and ignored files, conflicting local claims, changed identity,
   locked worktrees and unavailable evidence block retirement.
5. The task owner supplies `--by` and current `--clearance` evidence after the
   explicitly manual review of exact CI/release acceptance, cross-clone claims,
   other active owners/users, current and planned processes/runtime consumers,
   stashes and recovery, and existing deletion authority/queue admission. A
   claim, stale timestamp, typed flag or previously denied deletion is not
   authority. Preserve denied targets and route their blocker to the existing
   owner; never try another actor or cleanup path. Preserve unique ignored files
   and verify external recovery. During the same closeout, the task owner reviews
   the compact ignored-directory list, stops its consumers and disposes only of
   proven regenerable dependency/build caches within the existing cleanup
   authorization, then retries. Do not defer ordinary dependency cleanup to a
   separate task or drop the claim to silence the blocker. Unknown files,
   credentials, release binaries and recovery/report outputs remain protected;
   the directory name `build` alone is not deletion proof. There is no
   ignored-file bypass.
6. In the normal admitted cleanup slot, repeat the exact `retire` command with
   `--apply`. It rechecks and runs `git worktree remove <path>` without force,
   verifies path/registration absence, then releases only its own claim. A Git
   refusal preserves the claim and reports the exact error. Legacy unguarded or
   already claim-released worktrees follow these same manual eligibility checks
   and existing normal Git cleanup with the owner; do not manufacture a claim.
   Review eligible single-use branches separately with `git branch -d <branch>`
   and, when the remote
   branch has no active owner, open proposal or unique work requiring retention,
   `git push origin --delete <branch>`. Do not delete main, shared branches or
   recovery references. Squash incorporation alone may make `branch -d` refuse;
   preserve the branch and record that retention reason rather than force it.
7. Verify the resulting worktree/branch/claim state and report it. If ownership,
   recovery, authorization, dirty state or a Git/guard check blocks any step,
   preserve the work and name the exact retained path/ref, reason, accountable
   owner and next action in the existing task handoff. A blocked
   retirement remains an explicit closeout item, not a claim of cleanup.

The harness remains healthy when the planner explains affected work without
writing source, optional context guidance stays stdout-only, parallel work is
ordinary Git plus a thin optional guard, and an ordinary product change causes
zero governance-file churn.
