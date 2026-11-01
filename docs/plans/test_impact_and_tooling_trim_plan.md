---
doc_id: test_impact_and_tooling_trim_plan
version: 1.3.2
updated: 2026-11-01
owner: agent_operating_model
status: proposed
---

# Test Impact Analysis And Tooling Trim Plan

## Purpose

Run the narrowest set of tests a change can affect, at every level, in every
area of the repository. Use the same work to delete retired and unused tooling,
reorganize `tool/`, and adopt standard tools instead of hand-built ones.

The owner's goal is development velocity. GitHub Free gives this organization
20 concurrent jobs, 5 of them macOS, so CI capacity is the bottleneck. Every
test that cannot be affected by a change but still runs delays every other PR.

This plan owns test-selection precision and tooling trim. CI orchestration,
the merge queue and delivery stay owned by
[harness_v2_decision_and_cicd_delivery_plan.md](harness_v2_decision_and_cicd_delivery_plan.md)
and [../release_operations.md](../release_operations.md).

## Principle And Safety Model

Selection works in three layers, from coarse to fine:

1. **Area.** A changed path selects CI lanes through
   `tool/harness/component_graph.json`. This exists for the whole repository.
2. **Test file.** Inside a selected lane, run only the test files whose import
   graph reaches a changed file. This exists only for Flutter today.
3. **Result reuse.** Skip a test whose exact inputs already passed. This does
   not exist yet.

Safety rules for every layer:

- Narrow only when the graph proves a test cannot be affected. A changed file
  the graph cannot explain widens the selection to the whole lane.
- Code inputs come from real imports, computed by tools. Hand-declared inputs
  are only for non-code files (JSON, fixtures, generated output, assets), and
  every declaration must have a seeded test proving it fires.
- Shared code widens automatically. A change to a shared package reaches every
  test that imports it, on every surface.
- The merge queue validates the exact combined source before `main` moves, and
  the nightly full run catches anything selection missed. Selection can make a
  PR check lighter. It never lets untested code reach `main`.

## Measured Baseline (2026-10-23)

### CI compute, successful runs, 7 days

Source: Actions API, 267 successful `ci.yml` runs from 2026-10-15 to
2026-10-22. Cancelled and failed runs are excluded, so real usage is higher.

| Event | Job-minutes | macOS minutes |
|---|---:|---:|
| Pull request | 13,977 | 3,061 |
| Main push | 14,034 | 3,227 |
| Merge queue (enabled 2026-10-22) | 782 | 184 |
| Nightly | 1,391 | 344 |
| Total | 30,200 | 6,816 |

### Pull request compute by lane

| Lane | Job-minutes | Share | macOS minutes | Selection inside the lane today |
|---|---:|---:|---:|---|
| flutter | 4,065 | 29% | 0 | Import graph per test file (`tool/harness/lib/flutter_test_selection.dart`) |
| tools | 2,778 | 20% | 31 | Declared inputs per tool; full matrix on 58% of Tools runs |
| visual-integration | 1,952 | 14% | 1,806 | Whole suite; merge queue only since #759 |
| app-builds | 1,528 | 11% | 829 | Whole build; merge queue only since #759 |
| firestore-rules | 937 | 7% | 0 | Whole suite of ~100 emulator files; 3 shards since #742 |
| marketing | 707 | 5% | 0 | Whole suite |
| admin | 528 | 4% | 0 | Whole Vitest suite (`vitest run --project=unit`) |
| source preflight | 458 | 3% | 0 | Selected checks |
| functions | 426 | 3% | 0 | Whole suite (`functions/scripts/run-tests.cjs`) |
| capture-freshness | 397 | 3% | 393 | Whole check, on macOS, on every PR |
| contracts, docs, operations, plan, required | 187 | 1% | 0 | Small |

Already merged or merging on 2026-10-22/23: #745 (Tools inputs), #742 (rules
shards, harness narrowing), #759 (macOS and app builds in the queue only),
#758 (main reuses the queue's proof) and #760 (Flutter selection: full-suite
runs fell from 85 to 20 of 94 replayed commits).

### Tools lane replay

Replaying the Tools selector over the last 150 merges on `main`, before and
after #742 narrowed which harness files count as shared CI control:

| | Before #742 (`cdd7a5fd9`) | After #742 (`9ec40fa7e`) |
|---|---:|---:|
| Merges that selected the Tools lane | 103 | 103 |
| Full matrix (all 724 check commands) | 60 (58%) | 54 (52%) |
| Selective runs, average check commands | 36 | 40 |

Why the full matrix still runs after #742 (one run can have several reasons):

| Full-matrix trigger | Runs |
|---|---:|
| A Tools-lane path no tool declares | 28 |
| `tool/harness*`, `tool/run.mjs` or `tool/tools_manifest.json` changed | 25 |
| A workflow file changed | 8 |
| `package.json` or `package-lock.json` changed | 8 |
| Anything under `tool/lib/` changed | 5 |
| A shared `tool/ci/` file changed | 2 |
| `pubspec.yaml` or `pubspec.lock` changed | 2 |

#742 moved CI-only scripts and tests out of the shared control plane, which
stops them re-running every CI lane. Inside the Tools lane, most of those paths
now show up as "no tool declares this path", because the manifest has no owner
for them. Deriving owners from imports (Phase 1 step 1) closes that gap.
Registering or editing one tool edits `tool/tools_manifest.json` and reruns all
724 commands; the manifest diff (Phase 1 step 2) closes that one.

## Standard Tools: Adopt Versus Keep

| Need | Recommendation | Why |
|---|---|---|
| Test selection for admin, website, `packages/web-ui` | **Adopt** Vitest `--changed <base>` (already on Vitest 4.1) | Built in. Uses Vite's module graph. Config and lockfile changes rerun everything by default (`forceRerunTriggers`). |
| Import graph for Node tools, Functions and emulator tests | **Adopt** dependency-cruiser (`--affected <revision>`, v18) | Standard, handles ESM, CJS and TypeScript, and lists every module that can reach a changed file. Can also replace hand-rolled import-boundary checks with its rule engine. |
| Unused files, exports and dependencies | **Adopt** Knip | Standard dead-code finder for JS and TS. Turns the trim inventory below into a repeatable check instead of a one-off audit. |
| Command-line argument parsing in tools | **Adopt** `node:util` `parseArgs` | Built into Node. Replaces 93 hand-written `parseArgs` functions in `tool/`. |
| Flutter test selection | **Keep** the custom Dart selector | No standard Dart tool selects tests by import graph. The selector already uses the analyzer's real imports; #760 removed its main source of over-selection. |
| Result caching across runs | **Evaluate later**: Turborepo first, then Nx | Root `package.json` already declares npm workspaces (admin, website, web-ui, web-config). Turborepo adds input-hash caching with little configuration. Worth it only after layers 1 and 2 are precise; revisit with measured data. |
| Whole-repo build graph | **Do not adopt** Bazel or Pants now | Highest ceiling, but too much migration and upkeep for the team's size. |

## Retirement Rule: Salvage Before Deleting

The owner's rule for every deletion in this plan: past work must not be lost,
even when nothing uses it today. A tool, script or folder is retired only when
its PR shows all four of these:

1. **What it did.** One or two plain sentences, and the data or decisions it
   produced.
2. **Why it is no longer needed, or what replaced it.** The replacement must do
   at least what the old code did. Name the file or feature. If the
   replacement is missing part of the old behavior, port that part first.
3. **What was salvaged.** Reusable logic, fixtures, tests, data shapes and
   lessons move into the code that lives on (a shared library, the replacement
   feature, its tests or its doc) before the old code is deleted.
4. **Where it went.** The retirement PR's description lists each deleted path,
   the reason, where its value moved, and the last commit that contained it, so
   it can be restored with one `git` command. The PR stays in Git history; there
   is no tracked ledger file, per the `tool/README.md` rule against them.

Anything that fails a check stays until it passes. Code that still has value
but no current user gets an owner and a home, not a deletion.

## Phases

Every selector change ships as its own PR with a before/after replay over the
last 150 merges in its description, using the method from #760.

### Phase 0: Quick wins and clear deletions

1. Run `capture_freshness` only in the merge queue, like visual-integration and
   app builds. It spends about 393 macOS minutes a week on pull requests.
2. Retire the 34 tools the manifest already marks `retired`, under the
   retirement rule above. The Tools lane selects only `active` tools, so their
   197 check commands never run. They are the organizer-intake pipeline in
   `tool/organizer_intake/` (157 files), and they are not cleanly separable:
   Functions (`functions/src/admin/eventSupplyReadiness.ts`, retired
   2026-10-29), Admin (the data quality screen, likewise), operations tests, `tool/remote_ops_manifest.json` and
   `tool/lib/cli_args.test.mjs` still reference their files and generated
   JSON. First map which behaviors the live Functions and Admin features
   already cover, port the rest (for example the search-capture and
   URL-normalization logic, the event import planning, and the fixtures), then
   retire. The live organizer-intake data model is not touched.

   **Decided 2026-10-23: the external event import workflow stays.** Importing
   events from other platforms (Luma first) is wanted. It needs to work again
   on today's Firestore-backed review state, and to run from both event intake
   and the Sales pipeline (an organizer nomination that generates a listing
   also imports that organizer's events). The import chain is therefore not a
   retirement candidate: capture, ingest, location resolution, event review,
   import plan, preflight and readiness publish. It is being restored under
   [CAT-213](https://linear.app/catchdating/issue/CAT-213); 10 of its 12 checks
   fail on main because #109 moved review state to Firestore while the scripts
   still read repo JSON. Only the organizer discovery and promotion scripts
   that #109 replaced with Admin and Firestore remain retirement candidates,
   under the rule above.

   **Decided 2026-10-29: the readiness publish step is superseded.** The
   Supply Intake path (`onSupplyIntakeRequestCreated`,
   `recoverSupplyIntakeRequests`, `onSupplyIntakeListingApproved`,
   `adminPublishListingEvents` and Organizer Intake's "Imported events"
   panels) replaces it. `adminGetEventSupplyReadiness`,
   `adminPublishExternalEvent`, `adminDecideOrganizerEventCandidate` and
   `adminResolveOrganizerEventLocation` are retired from Functions, Admin and
   contracts; they last existed at `acb66a698`. Staff-entered coordinates moved
   to `adminPublishListingEvents.eventLocations` (#1005). The scripts in
   `tool/organizer_intake/` are retired in a separate change.

   **2026-10-29: `tool/organizer_intake` and the event guide were retired;
   Supply Intake in `operations/` replaces them.** They last existed at
   `bb58cad05`.
3. Retire tools with no caller at all (listed in "Trim Inventory") under the
   same rule. A guard that is still wanted gets wired into CI instead.

### Phase 1: Tools lane selection from real imports

Expected: full-matrix runs fall from 54 to roughly 10–15 of 103, and the
Tools lane's PR compute falls by about half (estimate; each PR measures it).

1. **Derived code inputs.** For each active tool, compute the import closure
   of its entry file and its test files with dependency-cruiser. A changed file
   selects the tools whose closure contains it. This replaces most hand-written
   `impactPaths` and the `tool/lib/**` full-matrix trigger.
2. **Manifest diff.** When `tool/tools_manifest.json` changes, select only the
   tools whose entries changed, plus the manifest validator.
3. **Workflow and `tool/ci/` files.** Select the checks whose tests read that
   file. Keep full validation for the true selector controls that
   `tool/harness/compare_selectors.mjs` protects.
4. **Lockfiles.** Select tools whose import closure uses a package whose
   version changed. A root `package.json` script-only change runs the manifest
   validator only.
5. **Non-code inputs.** Declare them per tool. A Tools-lane path that no tool
   imports or declares still runs the full matrix, with the path named in the
   PR summary so the gap gets fixed.

### Phase 2: Admin, website and web-ui

Run `vitest run --changed $BASE_SHA` on pull requests and keep the full suite in
the merge queue and nightly. Shared `packages/web-ui` changes reach admin and
website tests through the module graph.

### Phase 3: Functions and the emulator lane

Select Functions unit tests and the ~100 emulator test files from the
dependency-cruiser graph of `functions/src`. A `firestore.rules` or
`storage.rules` change runs every rules suite. Evaluate moving Functions unit
tests to Vitest, which would bring `--changed`, watch mode and running
TypeScript without the compile step.

### Phase 4: Reorganize and consolidate `tool/`

- Move the 29 loose scripts at the top of `tool/` into their domain folders.
- Replace the 93 hand-written `parseArgs` functions with `node:util`
  `parseArgs` through `tool/lib/cli_args.mjs`.
- Add Knip to the Tools lane so unused tools, exports and dependencies are
  reported continuously.
- Make the manifest smaller: derive inputs instead of declaring them, so a
  tool's entry describes what it is, not what it reads.

### Phase 5: Result reuse

With measured data from phases 1–4, decide whether Turborepo (or Nx) caching
is worth it for the npm workspaces, and whether a hash-keyed GitHub Actions
cache can skip unchanged Tools checks.

## Trim Inventory (evidence 2026-10-23, `main` at `cdd7a5fd9`)

Method: every source file under `tool/` (373, excluding tests) was checked for
callers. A caller is a workflow, a package script, a static import, or a path
or tool-id mention in code. Imports pass liveness on: a helper used only by a
dead tool is dead too.

| Category | Files | Action |
|---|---:|---|
| Live (a workflow, package script, product code or live tool uses it) | 278 | Keep |
| Mentioned only in docs (runbook or one-off operator tools) | 58 | Owner decision, by group below |
| No caller except its own test and manifest entry | 16 | Delete in Phase 0 after a final check |
| Used only by other non-live tools | 10 | Delete with their callers |
| Mentioned only by other manifest entries | 11 | Review with their owners |

Separately, 34 tools are already marked `retired` in the manifest (they fall
into the categories above). They are the organizer-intake pipeline (`generate`, decision-answer packets, search and
Luma capture, event-source ingestion, location resolution, crawl planning,
curation and review decisions, Firestore exports, promotion pipeline) and
related helpers.

No caller (16; four one-off data backfills among them were deleted on
2026-11-01), for example:
`tool/analytics/user_analytics_live_status.mjs`,
`tool/copy/migrate_simple_mobile_copy.dart`,
`tool/design/check_host_event_field_contracts.mjs`,
`tool/design/check_option_group_usage.mjs`,
`tool/design/check_rail_contracts.mjs`,
`tool/design/check_terminal_padding.mjs`,
`tool/firebase/create_config_cities.mjs`,
`tool/platform/upload_crashlytics_symbols.py`,
`tool/store/generate_catch_host_app_store_screenshots.swift`.
Some design checks may be intended as guards that nothing currently runs; each
deletion PR either wires a still-wanted guard into CI or deletes it.

Docs-only groups needing an owner decision:

- **One-time data migrations and backfills** in `tool/data/` (backfills,
  recomputes, repairs, coordinate stripping). The tool README already says
  completed migrations are retired after production verification, and the
  pre-launch clean-schema mandate means no data needs to be kept compatible.
- **Proofs of concept**: `tool/demo/rsvp_escape/`. The weekly event guide PoC
  was retired 2026-10-29.
- **Operator utilities**: analytics BigQuery deploy and status scripts, App
  Check debug-token registration, iOS pod and processing-receipt helpers. These
  stay if anyone still runs them; otherwise they go.

Outside `tool/`:

- `tool/contracts/generated/schema_contract_registry.mjs` is a 9 MB generated
  file in Git. Generate it during the build or split it, so clones, searches and
  reviews do not carry it.
- Large PNGs under `docs/plans/assets/` (about 1 MB each) belong in compressed
  form or outside the docs tree.
- The root `ios/`, `macos/`, `android/` and `web/` shells are being retired
  separately (#755 and its follow-up).

## Missing Tooling And Quality-Of-Life Gaps

- **No weekly CI cost report.** The baseline above was computed by hand. A
  small scheduled report of job-minutes per lane would show regressions as they
  happen.
- **No "why did this run" summary on PRs.** The planner knows why each lane and
  check was selected. Showing that on the PR would let authors fix over-broad
  triggers themselves.
- **No flaky-test tracking.** Reruns are counted nowhere. Tests that fail and
  then pass on a rerun should be recorded and quarantined.
- **Functions tests run compiled output.** Every run builds TypeScript first.
  Running tests directly on the sources would shorten both local and CI loops.
- **Dependabot lockfile bumps rerun every Tools check.** Phase 1 step 4 fixes
  this.

## Owner Decisions

1. Organizer intake (decided 2026-10-23): external event import stays and is
   restored under CAT-213; organizer discovery and promotion scripts replaced
   by #109 are retired under the salvage rule.
2. Decide on the one-time data tools: retire them now, or keep any you still
   run.
3. Decide on the remaining proof of concept.
4. Phase 3: whether to move Functions unit tests to Vitest.
5. Phase 5: whether to pay for result caching after the measured phases.

## Measurement

- Every selector PR includes a replay over the last 150 merges: lanes, check
  commands or test files selected before and after, and every case that still
  falls back to the full suite.
- Weekly CI job-minutes per lane from the Actions API, compared with the
  baseline above.
- A selection miss is any failure the merge queue or nightly run finds that the
  PR check skipped. Each miss gets a seeded regression test in the selector.
