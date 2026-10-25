# Tooling

The `tool/` tree owns repository checks, generators, migrations, deploy helpers,
and bounded data-repair commands. Use `node tool/run.mjs` to discover, validate,
and run tools by stable id instead of memorizing file paths.

Durable business workflows do not belong here. Resumable workflow runs, work
items, leases, budgets, agent decisions, and receipts live in `operations/` and
are governed by `docs/operations_platform.md`. Organizer-intake remains a
bounded reviewed-migration utility and event-guide remains a Marketing
packager; neither is a Supply Intake runtime input. Stable workflow checks remain discoverable through
`operations:boundaries` and `operations:workflow-manifest` in
`tools_manifest.json`. `remote_ops_manifest.json` remains the separate inventory
for commands that can touch external systems.

```sh
node tool/run.mjs list
node tool/run.mjs list --category data
node tool/run.mjs check --manifest-only
node tool/run.mjs check audit:backend-errors
npm run audit:backend-errors:check
node tool/run.mjs check contracts:flutter-form-inventory
node tool/run.mjs check --category demo
node tool/run.mjs affected-tools --paths tool/docs/check_doc_metadata.mjs --json
node tool/run.mjs affected-tools --base origin/main --check
node tool/run.mjs run demo:ops --help
```

## Retirement Review Without Model Sweeps

Reuse the existing parsers and fingerprint tools to produce a disposable review
queue. These scans do not call a model or modify source:

```sh
node tool/docs/check_doc_metadata.mjs --retirement --json
# First install the small tool package: (cd tool/widget_dedupe && dart pub get)
dart run --packages=tool/widget_dedupe/.dart_tool/package_config.json tool/widget_dedupe/bin/extract_fingerprints.dart --retirement
```

The Dart report indexes authored identifiers once, separates production from
Widgetbook/tests, and follows widgets referenced only by other candidates. Own
state classes are folded into their widget. Same-file/part-library uses,
ambiguous names, generated references and unrooted cycles conservatively retain
code. Generated files use lexical identifiers, including comments and strings,
so unsupported generated syntax cannot hide a caller. Any authored parse error
or missing part suppresses all candidates. The report includes coverage, source
digest, callers and physical declaration lines; it is not semantic resolution,
external-package usage proof, or a promise of net deletions.

Non-widget classes and top-level functions with no production references appear
in a separate advisory queue; test helpers, generated annotation callbacks, and
public package APIs still need deliberate ownership review.

The Markdown report flags explicit retirement states, completed-checklist
signals, missing literal paths and duplicate bodies. Historical documents and
generated content are protected. No inbound Markdown links means only that:
code, CI, external readers and human navigation still require review. Missing
paths can describe planned or removed work, so they are not automatic fixes.

Work in bounded batches: inspect the candidate and its callers, preserve live
API/catalog contracts and unresolved documentation decisions, remove or migrate
consumers, regenerate owned outputs, then run the checks selected by the impact
plan. For visual alternatives use the existing fingerprint/similarity tools to
rank likely duplicates before reviewing behavior and design. Add a known-bad
and known-good regression example when a new recurring pattern needs a scanner;
do not add one scanner or model pass per file. Reports belong in ignored local
output or expiring CI artifacts, never a tracked retirement ledger. Measure
actual Git additions/deletions separately from candidate line counts.

Filtered `list` and `check` commands fail with exit 64 when no active tool
matches, and a mixed valid/unknown id selection fails before any check runs; an
empty category can never count as a successful CI lane. Tools CI
validates the complete category matrix before fanout. Ordinary tool changes run
the exact active owner declared by `path` or `impactPaths`, its transitive
`alsoCheckIds`, and the mandatory repository guards in
`tools_manifest.json#ciImpact`. In CI each tool also owns every file its checks
reach through static imports: `tool/impact/import_owners.mjs` derives them with
the dependency-cruiser pinned in `tool/impact/` (`npm ci --prefix tool/impact`),
and `affected-tools --import-owners <file>` reads that output. A path owned only
through imports also runs `ciImpact.importOwnerCheckIds`, because imports cannot
show files read as text. Shared helpers in `ciImpact.importGraphPaths` run the
full matrix whenever the graph is absent or names no owner. An edit to
`tool/tools_manifest.json` runs only the tools whose entries changed plus
`ciImpact.manifestCheckIds`; a `ciImpact` edit, or a plan without a base
revision, still runs the full matrix. Canonical Harness control-plane paths come from
`component_graph.json#repo.harness`; the tool manifest declares only additional
full-matrix paths. Terminal graph classifications override broad Harness
patterns. Shared control-plane changes, unowned lane inputs, and explicit full
runs retain the complete six-bucket matrix.
The feature-coverage ledger and schema select `design:feature-coverage`; the
context-pack and gallery manifests select `design:context-pack`, which rebuilds
the pack in a temporary directory and verifies drift. Their check tests and
generator have the same owners. These explicit mappings avoid full fanout when
ordinary screen changes update generated manifests; unknown companion inputs
still trigger the full fallback. Committed evidence follows the same rule:
website Storybook baselines select `web:storybook-visuals`, app screenshots
select every capture check that reads their bytes, and feature contracts select
each compiler, coverage, responsibility, screen and pending-operation check that
reads them. Declare an input on every check that reads it, because a declared
owner suppresses the fallback for that path. Admin and `@catch/web-ui`
baselines, Widgetbook Flutter tests and Operations unit tests have no Tools
reader, so they keep the full fallback. `operations:boundaries` is a mandatory
guard because it scans every code file under `tool/` and `operations/src/`. Both owners retain the full source checkout,
with Node/root npm for coverage and Node/Flutter/pub for context generation.
CI passes the same PR, merge-queue, main, or nightly mode into both planners.
Companion files owned exclusively by Docs, Policy, or another Harness lane are
excluded from direct tool ownership instead of broadening a valid Tools
selection. Their graph-declared check ids are still included, so a mixed
workflow change keeps its policy wiring checks when Tools owns that validation.
The shared React validation workflow routes to both Admin and Marketing plus
policy and Hosting workflow checks. Changing that file alone does not select
native app builds or backend deployment; mixed source edits retain their own
validation and release ownership. Unknown and shared orchestration files keep
the full validation fallback.
Graph checks, exact tool owners, and mandatory checks all expand through the
same transitive `alsoCheckIds`; an unavailable required check fails planning.
Identical check commands run once per invocation, preserving their first owner's
order. When the required same-run React marketing lane owns validation, Tools
reuses its exact site build, Storybook build, accessibility gate, and visual
comparisons. Postbuild, build-output, and Storybook configuration tests still run
in Tools. Standalone tool checks keep their own builds and browser gates. This
reuse requires the React caller to retain its normal deployable build; changed
commands execute until their equivalence is verified.
Active tools must define non-empty checks. This prevents a non-tool contract
that selects the Tools lane from silently receiving guard checks only and
prevents full mode from succeeding through a vacuous tool entry. The affected
tool's `safety` describes its command. A remote-write tool may separately set
`checkSafety: local-readonly` when its declared checks are safe for Harness CI;
that is the only accepted override, it requires executable checks, and local
tools must omit the redundant field. Malformed overrides fail closed. The affected
planner unions each selected tool's optional `ciRequirements` only after
mandatory and transitive `alsoCheckIds` expansion. A missing declaration keeps
the conservative full repository view and all seven setup requirements;
malformed declarations fail preflight. `repositoryView: index` describes the
required logical read view and is consumed by both the affected Tools job and
optional context guidance. The affected Tools job's root-anchored non-cone
checkout materializes its declared CI closure. Every active index-view tool is
ratcheted to Node-only setup; a missing, malformed, or non-index view selects
the full checkout instead. The preflight job uses its own fixed closure for the
toolchain pin guard. CI sparse checkouts retain full history and local Git
blobs: do not add partial-clone filtering, because logical repository reads
disable lazy object fetches and fail closed when an omitted blob is
unavailable. Full tool buckets remain unchanged.
Tools that require an operating-system framework declare `platforms` using
Node platform names (`darwin`, `linux`, or `win32`). Category checks report and
skip incompatible entries; direct `run` calls fail with exit 64 instead of
executing a platform-incompatible command.

The legacy audit evidence layer has been removed. Repository hygiene prevents
those paths from returning. Git and CI own change and execution history.

The Harness component graph is the sole product-impact authority. It resolves
stable CI targets, role-selective app builds, deployment groups, and
mobile-release eligibility. `affected-tools` derives only registered tool
checks from that same graph and the tool manifest; it fails closed rather than
maintaining a second dependency map:

```sh
node tool/harness.mjs plan --base origin/main --head HEAD --json
node tool/harness.mjs plan --full --json
```

Harness models exactly one terminal classification or component owner per path,
then expands through explicit dependency edges. Unmapped or ambiguous paths fail
before any conditional lane can be mistaken for success. Only direct ownership
can authorize deploy or release operations; dependency expansion may add
validation but never mutation. Compile-codegen entries name declared,
deterministic, network-free freshness checks for CI or explicit `tool/run.mjs`
execution; the Harness itself never runs them.

```sh
node tool/harness.mjs validate
node tool/harness.mjs coverage --json
node tool/harness.mjs explain --paths lib/features/explore/presentation/explore_page.dart --json
node tool/harness.mjs plan --base origin/main --head HEAD --json
```

The authored graph and compile-codegen allowlist live in
`tool/harness/component_graph.json`. Use the plan's check ids with the explicit
`node tool/run.mjs check <id...>` runner. Harness commands are read-only.

## Source Preflight

`node tool/harness/verify_local.mjs --preflight --base origin/main --json`
runs the affected source checks and graph-selected compile-codegen freshness
checks before rendering or expensive validation. It collects all findings in
one pass. Missing runtimes, packages or a sparse checkout make the preflight
incomplete and return failure; bootstrap the selected dependencies first.
`--allow-deferred` is reserved for inexpensive sparse planning/feedback and
reports every deferred obligation. It never sets `preflightComplete` true while
one remains and never ignores a failing executable check.

The required `source-preflight` job uses a full checkout and pinned runtimes.
Its structural gates include dependency direction, mutation/error boundaries,
route literals, source/test size, generated route/catalog/responsibility/design
references, provider ownership and resolved composition. Selected expensive
jobs depend on its success, and Required CI independently rejects missing,
skipped, failed or cancelled preflight. Full tests and analysis remain required.

## Documentation Checks And Retrieval

`docs:metadata` validates source-owned Markdown metadata. Its `--base` comparison
also rejects surviving references to deleted or renamed documents: Markdown
links and code spans, plus literal repository paths in any tracked
non-Markdown text such as `tool/policy/rules.json`, `tool/tools_manifest.json`,
workflows, scripts and generated packs. For each document the change edits, it
also rejects `path.md#heading` references whose heading the change removed;
anchors that were already unresolved before the change are printed as
advisories. A sparse CI checkout reads omitted consumers through the Git index.
`--inventory [--query <text>] --json` prints owners, headings, word counts, and
literal document references without writing a catalog. Fenced Markdown
examples, external links, and dynamic or constructed paths remain outside the
reference check.

The existing Host responsibility generator provides `--explain audience` for
question-oriented answers and `--affected audience --base <ref> --json` for
section-level review advice. The impact command needs only Node, Git, and its
source contract. CI publishes that advice as a separate seven-day artifact in
the planner job, including for source-only changes; the one-file delivery-plan
artifact remains unchanged. The advice does not add a release gate or claim
semantic freshness. Generation/`--check` still validates schema facts, source
paths, named examples, and generated READMEs. Named examples are declarations;
run their selected tests to verify behavior.

See `docs/README.md` for document placement and retirement policy. Keep
inventories and run evidence in temporary output or expiring CI artifacts.

## Build Versus Adopt

Before adding a dependency, a general-purpose subsystem, or a substantial
replacement for shared tooling, state in the implementation Issue or PR:

1. the observable capability or defect being addressed;
2. at least one platform or established-tool alternative considered; and
3. why the selected option fits Catch's safety and maintenance boundaries.

Prefer the platform standard library, then a focused zero-dependency library,
then a maintained framework, and write a shared utility only when those options
do not fit. A candidate must be actively maintained, permissively licensed,
proportionate in transitive dependencies, required by current behavior, and
free of unnecessary privileged or build-time network access. More than roughly
100 new lines of general-purpose code triggers this review; it is not an
automatic rejection. Catch-specific schemas, release identities, consent
rules, and other product policy remain custom when a generic package cannot own
their semantics.

Replace existing behavior only behind a real repository equivalence oracle.
Measure the smallest useful slice, retain or reject the candidate explicitly,
and delete the former authority only after equivalence passes. A mature package
may serve only as a development-time oracle when making it a bootstrap runtime
dependency would widen CI failure or network boundaries. Do not add a scanner
that claims to prove ecosystem research occurred, and do not keep a tracked
adoption ledger after the bounded decision is complete.

## Layout

- `audit/`: repo audit and code catalog scripts.
- `agent/`: optional, read-only AI-agent context guidance and its focused
  tests.
- `branding/`: native launcher and splash branding generators.
- `contracts/`: Firestore, schema, business-rule, and generated contract gates.
- `copy/`: typed locale-catalog validation, ownership scanners, and generated
  structured product-copy sync tools.
- `data/`: Firestore data validators, repair scripts, backfills, and read-only
  privacy audits. The legacy Host contact-projection audit never implements an
  apply path or prints raw contact values; remediation is a separately reviewed
  operation after its high-confidence and reconciliation counts are accepted.
- `demo/`: demo seeding, demo operations, and demo seed fixtures.
- `design/`: visual review and design-preview entrypoints.
- `env/`: checked-in Dart define files for app environments.
- `firebase/`: Firebase project/config helper scripts.
- `harness/`: authoritative component graph, safe compile-codegen catalog,
  planner kernel, and fixtures.
- `lib/`: shared Node helper modules for repo paths, CLI parsing, and Firebase project selection.
- `marketing/`: app-derived website media manifests and screenshot sync checks.
- `platform/`: Apple/platform configuration helpers.
- `store/`: deterministic App Store and Google Play asset generators.
- `test/`: Flutter coverage reporting and test-maintainability ratchets.
- `ui_capture/`: route inventory, capture coverage, and deterministic screen capture tooling.
- `remote_ops_manifest.json`: consolidated index for Firebase, App Check, data,
  CI/CD, and App Store/TestFlight operational surfaces.
- Completed one-time migration tools are retired after production verification;
  Git and the owning contract retain the history.

The registered `contracts:generate-schemas` generator also projects authored
catalog contracts when they require typed cross-runtime consumers. Event
Success moment choreography is authored in
`contracts/catalogs/event_success_moment_presentations.json` and emitted to
the existing Dart and Functions TypeScript generated-contract directories.
Its generator validation owns exhaustive moment coverage and the shared
timeline/seed fixture; generated outputs are never edited directly.

## Shared CLI Parsing

`tool/lib/cli_args.mjs` uses Node's built-in `node:util.parseArgs` for the
common `env`, `project`, emulator, JSON, help, and opt-in mutation flags used
by fourteen current data and intake commands. Strict callers can reject
positionals and project custom kebab-case flags to camel-case fields without
reimplementing token loops. Callers retain command-specific validation,
enum/path handling, subcommands, and every apply or production confirmation
boundary. Do not broaden this helper by moving product or remote-write policy
into a generic parser.

`meta:enforcement-integrity` discovers every repository `*_baseline.json`
and requires an `owner` identifying its source document plus a `targetPhase` Markdown heading
reference. Fixture baselines obey the same rule. Baseline refreshers must emit
both fields; metadata belongs in the existing baseline, not a separate ledger.

## Flutter Test Evidence

`tool/test/flutter_coverage_report.mjs` converts `coverage/lcov.info` into
handwritten-code and top-level-feature visibility. It deliberately has no
aggregate percentage threshold and calls out that uninstrumented files do not
appear in LCOV.

`tool/test/check_flutter_test_size.mjs` keeps new and split Flutter test specs
at or below 1,200 lines. The exact reviewed legacy debt lives in
`tool/test/flutter_test_size_baseline.json`; growth and stale reductions both
fail so every improvement is ratcheted. Git owns the current test filenames;
focused test runners and coverage output derive their input from source when
needed instead of maintaining a tracked cross-surface inventory.
The CI shard and coverage selectors fail when they resolve zero test files;
an empty selection is never reported as a green test run.

```sh
node --test tool/test/flutter_coverage_report.test.mjs
node tool/test/flutter_coverage_report.mjs --lcov coverage/lcov.info
node tool/test/check_flutter_test_size.mjs --check
```

## Flutter Source Budgets

`node tool/run.mjs check audit:flutter-source-size` enforces the architecture
owner's 800-line handwritten source budget across app, packages, and Widgetbook.
The exact Field constructor facade has its approved 1,150-line ceiling; both
ordinary debt and the facade can only shrink. `lib/routing/go_router.dart` is
exempt from the line budget: the route inventory requires every `GoRoute` in
that one file, so its length tracks route count rather than debt. Git comparison prevents manually
adding new or split oversized files to the legacy baseline. The check uses Node
and repository source directly, so it does not start a Flutter analyzer.

After a coherent split, run
`node tool/architecture/check_flutter_source_size.mjs --write-baseline` and
commit the reduction with the source changes. `--base` defaults to `origin/main`;
an unresolved comparison base fails closed. Generated source is excluded only
by the producer identities documented in
`docs/app_architecture.md#source-size-budgets`.

## Analyzer-Backed UI Gate

`node tool/ci/check_flutter_workspace_analysis.mjs` is the one fail-closed
repository analyzer command. It discovers every non-ignored `pubspec.yaml`,
resolves the root Dart workspace once plus each standalone nested package, then
analyzes root, Consumer, Host, Widgetbook, lint/plugin, icon-package, example,
and tooling packages sequentially with info diagnostics fatal. Root analysis
uses the deterministic `dart analyze --format machine` Catch-plugin path.
The token package uses `dart analyze lib --fatal-infos`: a seeded unresolved
symbol proved that directory-wide `flutter analyze` can report success while
skipping this root-excluded workspace package.

This intentionally uses the Node standard library rather than adopting Melos.
Melos was evaluated, but Catch needs exhaustive package discovery and one
sequential command—not another package task graph—and the product application
still lives primarily in the root package. The small repository-specific
orchestrator therefore has less configuration and no additional bootstrap
dependency while its plan and nonzero-stop behavior remain unit tested.

Pass `--root-diagnostics-dir <directory>` to retain the root analyzer's machine
output and exit status from that same invocation. Flutter CI uses this output
for its all-rules lint gate and report; it never launches another root analyzer
just to collect diagnostic evidence. Plugin crashes and nonzero analysis still
fail before the output can authorize a successful gate.

The old UI/design shell scanners and their compatibility wrapper names are
retired. Matching policy lives in `packages/catch_ui_lints`; CI collects one
repository-root `dart analyze --format machine` census and
`tool/check_catch_ui_lint_drift.sh` projects focused reports or enforces the
complete zero-diagnostic invariant. In this workspace,
`flutter analyze` and `dart analyze lib` do not load the Catch plugin; never
use either command as proof that a Catch UI rule is clean.

Phase 5 also retired the broad `tool/scan_architecture.py` report in favor of
the focused dependency, adopted-boundary, mutation-error, error-catalog,
source-size, and widget-classification gates. The three unreferenced Dart
personality/visual-review entrypoints are removed; Widgetbook goldens, UI
captures, and registered reference-screen comparisons own visual review.
Validators already executed by a canonical aggregate check are `internal` in
the manifest, so the same probes run without advertising duplicate check IDs.

Use `--summary` for review-friendly output, `--count` for cheap automated
checks that only need a numeric debt signal, and
`tool/check_catch_ui_lint_drift.sh --all --json <path>` when a cleanup pass
needs a reusable drift snapshot artifact with analyzer completion status.
The drift helper parses the machine analyzer diagnostic-code field; it must not
count `catch_*` text from filenames, symbol names, or diagnostic messages.

`bash tool/widget_cleanup_scan.sh --check` is the checked broad-cleanup ratchet.
Only the eight remaining regex-only categories live there. Promoted categories
are analyzer rules with seeded fixture parity, and every Catch analyzer
diagnostic must remain at zero.

## Analyzer Plugin Lints

Catch-owned UI lints live in `packages/catch_ui_lints` and use Dart's
`analysis_server_plugin` API. They are enabled from the top-level `plugins`
section in `analysis_options.yaml`. The deterministic CLI load path is a
repository-root `dart analyze`; CI caches that one machine-diagnostic census
and applies each severity gate to the exact diagnostic-code field.
The Catch UI plugin runs across handwritten `lib/**` while exempting
`packages/catch_tokens/lib/**` token definitions, `packages/catch_ui/lib/src/foundations/**` foundations and `lib/core/theme/**` app adapters,
and generated code.

Smoke wrappers stay in `tool/` because CI needs deterministic proof that the
plugins are loaded:

- `tool/check_riverpod_lint.sh`
- `tool/check_catch_ui_lints.sh`

The canonical Catch UI drift reporter is
`tool/check_catch_ui_lint_drift.sh`; do not add diagnostic-specific wrapper
scripts around it.

The component registry generates the plugin steering tables and steering
probes through `tool/design/build_lint_enforcement_tables.mjs`. The
bidirectional coverage gate rejects undecided components, orphan codes, stale
generated output, and expired waivers. Cross-file shell/top-bar/state policy is
resolved by `tool/architecture/check_ui_composition_contracts.dart`.

## Where Enforcement Lives

- Analyzer diagnostics live in `packages/catch_ui_lints` and are probe-tested
  through `tool/check_catch_ui_lints.sh`.
- Repo architecture scanners live in `tool/architecture/*.mjs` and ship with
  Node `*.test.mjs` coverage.
- Dart classification scanners live in `tool/audit/*.dart`.
- Meta-gates that validate other tools live at the `tool/` root.
- Checks that need the Flutter toolchain gate directly in
  `.github/workflows/flutter-ci.yml`; pure Node and Bash gates run through
  `tools-ci.yml` manifest categories.

Composite Firestore query/index parity is owned by
`tool/contracts/check_firestore_query_indexes.mjs`. Repository query builders
declare ordered `firestore-index` contracts next to the query; the gate scans
handwritten Dart data repositories and the program/transport Functions modules.
It checks static backend query shapes and validates declared shapes against
`firestore.indexes.json`. Dynamic query additions need an explicit contract and
review. Block comments support readable multiline field lists. Run it through
`node tool/run.mjs check contracts:firestore-query-indexes`.

New scanners must ship with a manifest `role`, `rules`, `vacuityProof`, and a
test containing a known-bad fixture.

## Riverpod Provider Graph

`tool/architecture/provider_graph.dart` parses every handwritten Dart AST under
`lib/` and checks the live provider topology. Its deterministic JSON includes
generated and handwritten providers, aliases, families, consumers, provider
operations, overrides, and Riverpod experimental Mutations, but no generated
view is committed to the repository.

```sh
dart run tool/architecture/provider_graph.dart --check
dart run tool/architecture/provider_graph.dart --summary
dart run tool/architecture/provider_graph.dart --json
```

Architecture candidates are exhaustively reviewed in
`tool/architecture/provider_graph_reviews.json`; this small authored ledger is
the durable decision authority. The live gate rejects cycles, unresolved
provider-internal references, new unreviewed relationships, and obsolete review
entries. Redirect `--json` or `--summary` into `build/` when a temporary local or
CI artifact is useful.

## Repository Hygiene

`tool/repository_root_manifest.json` is the exact ownership contract for every
repository-root entry. It deliberately does not own a dependency graph; the
Harness component graph does. The gate rejects unclassified or multiply
classified entries, a returned duplicate relationship authority, prohibited
roots, unsafe cleanup targets, and machine-local Markdown links. Audit policies
identify generated/vendor trees reviewed as aggregate units. The cleaner is dry-run by default, preserves
tracked children in mixed retention directories, refuses candidate-root
symlinks while counting nested dependency symlinks without following them, and
rejects protected or path-escaping targets; mutation additionally requires an
explicit scope.

```sh
node tool/check_repository_root_hygiene.mjs
node --test tool/check_repository_root_hygiene.test.mjs
node tool/repository_hygiene.mjs --scope evidence --json
# Apply only after reviewing the dry-run output:
node tool/repository_hygiene.mjs --scope evidence --apply --json
```

## Git Reconciliation And Document-Version Gates

Large reconciliation merges use an exact four-tree classifier. It distinguishes
discarded sides from equivalent resolutions and requires a reasoned receipt for
every exact discard in strict mode:

```sh
node tool/git/audit_merge_drops.mjs \
  --base <merge-base> --ours <pre-merge-ours> \
  --theirs <integrated-tip> --merged <result> \
  --receipt <receipt.json> --strict --json
node --test tool/git/audit_merge_drops.test.mjs
```

Remote branch hygiene uses a separate read-only classifier. GitHub's native
delete-after-merge setting handles only the exact pull-request head; it cannot
recognize source branches integrated through a different branch, squash-era
tree equivalence, or abandoned code with no pull request. An age-only stale
branch action was rejected because it could delete the very undeployed work the
gate is meant to expose. The zero-dependency Git classifier therefore reports
ancestry, exact main-history trees, exact merged-PR tips, final changed-path
identity, open PRs, and review age. The daily workflow has read-only contents
permission; it reports safe candidates for supervised pruning and fails on
abandoned code.

```sh
node tool/git/branch_hygiene.mjs --base origin/main --remote origin --json
node tool/git/branch_hygiene.mjs --base origin/main --local --json
```

Governed Markdown owns its identity, version, update date, owner, and lifecycle
in source frontmatter. Versions may increase or remain unchanged but may not
decrease. Identities must be unique, and reviewed deletions are allowed without
a preparatory catalog or lifecycle edit. The target defaults to the working
tree; no parallel catalog or generated integration-state artifact is
maintained:

```sh
node tool/docs/check_doc_metadata.mjs --base origin/main
node tool/docs/check_doc_metadata.mjs --self-test
node --test tool/docs/check_doc_metadata.test.mjs
```

## Remote Ops Manifest

`tool/remote_ops_manifest.json` is the remote-operations index. It does not
deploy or mutate anything; it groups the existing tools, workflows, docs, and
manual console dependencies by blast radius. Keep it current when adding Firebase
deploy targets, data repair tools, App Check/App Store console steps, or CI/CD
workflows. Manual console entrypoints must include `owner`, `ticket`, and
`guardrail` metadata so unsafe additions cannot hide behind descriptive labels.

```sh
node tool/check_remote_ops_manifest.mjs --check
node tool/check_remote_ops_manifest.mjs --list
```

## Installable App Targets

`tool/app_targets.json` is the checked Consumer/Host × dev/staging/prod target
matrix. Build wrappers and Apple flavor generation resolve identity from it;
the app-target gate reconciles the remaining native, Firebase, capability,
deep-link, force-update, and release surfaces. Each target has its own explicit
composition entrypoint (`main_<role>_<environment>.dart`); aggregate Android
build tasks and caller-supplied wrapper arguments that cannot resolve exactly
one target fail before compilation.

`tool/app_target_external_gates.json` separately owns the two unresolved
TestFlight and Play owner prerequisites. It contains only stable issue links,
status, scope, and closure criteria—never workflow runs, artifact receipts, or
promotion history. Harness classifies this operational status under the Tools
lane, so updating external proof cannot authorize signed packages. Real target
identity or release-policy changes in `tool/app_targets.json` remain high-risk
and still authorize the exact affected mobile release targets.

```sh
node tool/platform/resolve_app_target.mjs --role host --environment prod
node tool/run.mjs check platform:app-targets
node tool/run.mjs check platform:verify-ios-release-identity
```

The release-identity verifier accepts an `.xcarchive`, extracted `.app`, or
signed `.ipa` and checks compiled target markers, version/build, embedded
Firebase identity and OAuth URL scheme, plus role-specific signed entitlements.
The exact producer verifies the IPA container and deep code signature before it
persists byte-bound JSON receipts; legacy Xcode Cloud receipts remain historical
cutover evidence only.

`Mobile Internal Release` is the CI-authorized signed-package producer. Its iOS
and Android jobs consume exact role/platform targets from the successful `main`
CI impact plan, publish verified IPA/AAB packages for 90 days, and emit a strict
post-comparison build authority. It never mutates TestFlight or Play.

`Mobile Internal Exact Promotion` is the separate manual store authority. It
accepts one current producer attempt and exact build-authority artifact, derives
the selected package id/digest from that authority, re-extracts and reverifies
the already-signed bytes immediately before credentials, then uploads to
TestFlight or the Play `qa` track without Flutter, Gradle, Xcode archive/export,
or signing work:

```sh
node tool/run.mjs check \
  ci:mobile-release-package \
  ci:mobile-release-workflow \
  ci:mobile-promotion-core \
  ci:mobile-promotion-workflow \
  platform:app-targets \
  platform:mobile-build-number \
  platform:verify-ios-release-identity \
  platform:verify-app-store-build \
  platform:verify-android-release-identity \
  platform:upload-google-play-bundle
```

Promotion persists one immutable, exact-package claim for 90 days only after
store verification and credential cleanup. Reuse requires the same successful
promotion attempt, source and producer attempts, authority/package ids and
digests, signed-byte SHA-256, and store result. App Store Connect
version/build identity alone cannot prove IPA bytes: if Apple accepted an
upload but the exact claim was not saved, exact automation fails closed and a
new build is required. Play may reconcile an ambiguous retry only when the
completed `qa` readback proves the exact version code and remote SHA-256.

The Android package gate uses a checksum-pinned bundletool jar and compares the compiled
target, role, Firebase, Maps, debug, package, version, and upload-certificate
identity. `platform:verify-app-store-build` prevents a non-monotonic Apple build.
Historical `platform:verify-ios-processing-receipts` evidence still binds the
completed Xcode Cloud retirement, but current processing evidence belongs to an
exact promotion run rather than package production.
`platform:upload-google-play-bundle` refuses the production track and requires
explicit `--apply --allow-prod`. `platform:xcode-cloud-workflow-state` is a
guarded cutover operation, not a routine release command.

Every Android exact promotion runs the separately authenticated, apply-guarded
`platform:probe-google-play-access` fleet gate before the selected AAB uploader.
It requires both Catch app records, both `qa` tracks, effective app-scoped edit
access, and at least one Google Group tester per track; it creates and deletes
an uncommitted edit for each app and never uploads or commits a release.

Do not add a bundle id, Firebase app id, native flavor, or store product only to
a workflow or platform file. Add it to the target contract and make the
consumer query or checker change in the same pass.

Every signed artifact is also checked by
`platform:mobile-package-policy`. The JSON receipt records compressed and
uncompressed size, archive entries, and compiled app-binary hashes. The policy
rejects fixture/demo assets, role-forbidden native plugins, size regressions,
and byte-identical Consumer/Host products. Its compressed-archive and expanded
payload budgets are deliberately separate, calibrated to signed integration
artifacts, and limited to 20% headroom. Neither number is an App Store Connect
or Play processed download/install estimate; store-displayed sizes must be
recorded as separate release evidence.

### Firebase deploy and client-callable gates

`tool/firebase/environment_readiness.json` declares target-specific remote
prerequisites. Its checker is offline by default in the tool manifest and can
run a metadata-only live probe after OIDC authentication. The live probe
resolves project ids from `.firebaserc`, lists enabled secret-version metadata,
verifies the default Functions runtime account has secret-level accessor IAM,
and reads Firestore TTL policy state. It never accesses secret payloads and has
no apply mode:

```sh
node tool/firebase/check_environment_readiness.mjs --manifest-only
node tool/firebase/check_environment_readiness.mjs \
  --env staging --targets functions:getCrossPathsSuggestions
```

`Deploy backend` (`.github/workflows/backend-deploy.yml`) runs this gate after
planning and parameter materialization and before any remote mutation. A
not-ready prerequisite stops the run; one the probe cannot confirm only warns.

The backend deploys from an exact `main` commit through `Deploy backend`.
- **Dev** deploys on every backend-relevant merge.
- **Prod** deploys after one protected approval.
- **Staging** refreshes on the first day of each month at 02:17 UTC.

Each environment's last deployed commit is the Git tag `deployed/<env>`; see
`docs/release_operations.md`, "Deploy Backend".

Admin, standalone Host, and Marketing Hosting keep exact-artifact promotion. `_web-hosting-build.yml` produces one environment-
bound React or Host Flutter web bundle and `tool/ci/package_web_hosting.mjs` projects it into a
single-target, lifecycle-hook-free Firebase package with a strict file inventory.
`_web-hosting-promote.yml` downloads only the recorded artifact id, verifies the
GitHub ZIP digest plus source/workflow/run binding, verifies every package byte
before credentials and again immediately before mutation. It installs only the
pinned Firebase CLI before credentials; it never installs source dependencies,
rebuilds frontend bytes, or rematerializes organizer data. Recovery is terminal-source-
bound, current-main-only, and rejects older attempts at the same SHA.

`tool/firebase/affected_function_targets.mjs` plans each `Deploy backend` run
from exact Git base/source objects and transitive TypeScript module
dependencies, excluding whole-declaration type-only imports and exports.
Functions runtime imports use individual generated schemas, validators and
catalogs; the schema/type boundary gate rejects aggregate runtime imports.
It retains all authorized functions for shared initialization,
runtime/dependency changes, snapshots, and uncertain analysis; a proven empty
selection records a Functions no-op. It never rewrites package bytes or adds
unauthorized targets. Its focused tests run with the delivery-package check.

`tool/firebase/plan_firebase_deploy_targets.mjs` is the pure planner behind
`tool/deploy_firebase_targets.sh`. It validates target syntax, expands logical
Functions from source exports, keeps exact `functions:<name>` targets, orders
selected stages as indexes → Functions → Firestore rules → Storage rules, and
fails empty plans before any remote command runs. The deploy wrapper
synchronizes live callable Cloud Run invoker bindings during the Functions
stage, after index readiness and before either rules stage.

`tool/firebase/check_rules_deployment_drift.mjs` is the read-only postcondition
for those rules stages. It compares normalized SHA-256 hashes of the exact
committed Firestore and Storage sources with the immutable ruleset source named
by each applicable active release. Missing credentials skip explicitly; once a
credential is present, authorization failures, missing releases, and drift fail.
The promotion workflow checks the exact approved source checkout rather than the
newer control-plane checkout.

`tool/firebase/client_callable_dependencies.json` declares production client
features that require a callable. The static checker reconciles the Dart define,
`AppConfig`, and Functions export. Release workflows add `--verify-live` so an
enabled dependency must reach the Firebase callable adapter before archive:

```sh
node --test tool/firebase/plan_firebase_deploy_targets.test.mjs
node tool/firebase/check_client_callable_dependencies.mjs \
  --role host --environment prod
```

Do not enable a production callable-backed client flag in the same release step
that first creates the backend. Deploy and prove the backend while the flag is
dark, then enable the client in a later merge.

`--from-source` derives the Functions client source references instead of
reading the hand list: any string literal in authored `lib/`, `website/src` or
`admin/src` source (generated and test files excluded) that names a Function
export. It fails offline when a literal `httpsCallable` call names something
`functions/src/index.ts` does not export, or when a client references a dormant
export. `check_deploy_parity.mjs --client-callables` compares that derived set
with one environment's deployed inventory, using the same metadata-only reads;
`--client-root` checks a newer client checkout against older deployed source.

`synthetic_backend_probe.mjs` signs in as a synthetic Host that manages a
synthetic organizer (both documents must carry `synthetic: true`) and runs the
Host app's rules-checked Firestore reads, plus two read callables outside
production, validating callable responses against the generated contracts. It
is a dry run unless `--apply`; production also needs `--allow-prod`, and runs
callables only with `--allow-prod-callables` because each writes the caller's
`rateLimits` counter.

```sh
node tool/firebase/check_client_callable_dependencies.mjs --from-source --surface website
node tool/firebase/check_deploy_parity.mjs --env prod --client-callables all --client-root .
node tool/firebase/synthetic_backend_probe.mjs --env dev --uid <uid> --organizer-id <id>
```

### What's live where

`tool/firebase/report_environment_parity.mjs` is the one on-demand answer to
"which features exist in which environment". It compares this checkout with
live dev and prod (`--env dev,staging,prod` opts staging in) across deployable
Functions, deployed Functions params against the GitHub variable the next
deploy would materialize, GitHub environment variables and the jobs that read
them, composite indexes and field overrides, Firestore and Storage rules, the
dormant deploy policy, client callable gates, Remote Config, workflow-default
and Dart-define build modes, and hard-coded source release holds. It reuses the
deploy-parity, rules-drift, index-readiness/sanitizer, dormant-policy and
params modules, runs only allowlisted metadata reads, and prints identity
values as fingerprints. Nothing is stored; `--json` emits the full matrix.

`tool/firebase/environment_difference_policy.json` classifies every
environment-conditional switch as `identity`, `feature-gate` or
`release-state`. Environments may differ only in identity. A feature gate that
must temporarily differ needs one `allowedDifferences` entry with an owner,
reason, `CAT-` Linear ticket and unexpired date; the report marks every other
gate difference `UNDECLARED-DIFFERENCE`. `--policy-only` is the offline CI
guard: a new Functions param, workflow variable, Dart define or Remote Config
template key fails until it is classified, and an expired allowance fails
until the gate is flipped or renewed. Removed switches move to `retired`: they
may not reappear in source, the template or a workflow outside their listed
`allowedIn` sources, and the live report marks leftovers `RETIRED-STILL-LIVE`
so the owner can delete them. A retired key that older app builds still read
carries a `liveHold` instead: the report lists it as a retired gate still live
for old builds and flags `RETIRED-HOLD-BROKEN` if the held live value changes
or disappears.

```sh
node tool/firebase/report_environment_parity.mjs
node tool/firebase/report_environment_parity.mjs --surfaces remote-config,function-params --json
node tool/firebase/report_environment_parity.mjs --policy-only
```

## App Check Debug Tokens

Local simulator App Check debug tokens are registered through a narrow helper
that reads `FIREBASE_APP_CHECK_DEBUG_TOKEN` from the environment or `.env.local`
without printing it:

```sh
node tool/firebase/register_app_check_debug_token.mjs --env dev --role host --platform ios
./tool/run_host_dev_simulator.sh "iPhone 17 Pro"
```

Do not set `DISABLE_AUTH_APP_VERIFICATION_FOR_TESTING=true` for real
phone-number verification. That flag is only for Firebase test phone numbers.

## Cross Paths Demo Fixture

`demo_ops seed-cross-paths` is the guarded fixture builder for Cross Paths. It
selects one synthetic viewer and at most two compatible synthetic attendees,
creates a fresh synthetic event when necessary, and adds current event consent
plus fingerprint-bound showcase review state. Dev and emulator use remain
general. Production accepts only the pinned `cross_paths_mumbai_qa` world, its
three known identities, its one event, the hidden `courtside` organizer, and a
fictional Firebase test phone; every other production shape fails closed. Dry
run is the default and production additionally requires both explicit
production acknowledgements.

```sh
npm --prefix functions run build
node tool/demo/demo_ops.mjs seed-cross-paths --env dev --json
node tool/demo/demo_ops.mjs seed-cross-paths --env dev --apply
```

Synthetic metadata is decoded by the app and filtered from public organizer,
event-discovery, search, and Host event lists. Only the signed-in synthetic QA
viewer can recover its own signed-up fixture through personal-event
enrichment. Cleanup can preserve that single world with
`--keep-seed-prefixes cross_paths_mumbai_qa` while deleting older synthetic
data, including organizer mirrors.

Cross Paths no longer has a compile-time preview lab. Use the normal Consumer
build; the selected event, synthetic scope, layered consent, showcase review,
admission policy, and server-owned safety checks determine whether the pinned
fixture can appear.

## Sales Demo Persona Profile Projection

The sales demo persona catalog is projected into app-ready profile JSON before
UI capture, marketing, and golden-image consumers read it. The checked planned
asset projection lives at
`tool/demo/demo_seed/personas/us_nyc_sales_profile_projection.planned.json`.
The command requires explicit `--asset-statuses`; use `--allow-empty` only when
auditing an intentionally empty status slice.

```sh
node tool/demo/demo_ops.mjs persona-profile-projection --asset-statuses planned --output tool/demo/demo_seed/personas/us_nyc_sales_profile_projection.planned.json --check
node tool/demo/demo_ops.mjs persona-profile-projection --asset-statuses planned --output tool/demo/demo_seed/personas/us_nyc_sales_profile_projection.planned.json --update
```

## Exact-Source CI Inventories

`node tool/ci/generated_inventories.mjs --source-sha <full-commit-sha>` derives
route inventory and the widget catalog's generated region from a complete clean
checkout of that exact commit. CI runs it before full source preflight, relevant
Tools checks and Flutter resolved composition. Authored prose, classifications,
coverage decisions and regression goldens remain inputs; generation cannot make
missing semantic coverage pass. These first-phase outputs remain tracked for
local consumers but need no routine CI refresh commit.

In Actions, materialization also writes the ignored
`build/ci/generated-inventories.json` receipt, binding both output hashes to the
source tree, workflow and run attempt. Full-checkout Tools consumers pass
`--generated-inventories-materialized`; the runner verifies the receipt and
authored source before and after checks, and substitutes only the exact catalog
and route inventory drift commands. Sparse index consumers and standalone
commands keep their ordinary checks. Missing or changed proof fails; authored
coverage decisions and semantic gates still execute.

## Marketing App Screenshot Context

Marketing app screenshots are tracked by `tool/marketing/capture_manifest.json`.
The `marketing-captures.yml` hosted macOS exporter accepts an exact source SHA
through manual dispatch, an explicit `capture:requested` label event on an
open same-repository PR into `main`, or an exact-source reusable CI call. It uploads all 12 validated canonical
exports without committing or publishing. The producer renders only invalid or
changed-input/font captures; reuse preserves the original PNG and render SHA,
while the v2 receipt records verification against the selected source SHA.
Website captions and destination metadata do not invalidate rendering.
Capture requests never start CI or
change merge authority. See
`docs/marketing_app_media_pipeline.md#hosted-export-cat159-enabling-slice`
for controller integration, exact event/source selection and artifact receipts. Its focused
wrapper/workflow checks run through `marketing:hosted-capture-export`.
`tool/marketing/import_hosted_captures.mjs --import` requires `CAPTURE_BINDING`,
`GITHUB_REPOSITORY`, `GITHUB_SHA` and read-only GitHub Actions access. It uses
Node, `gh` and Python 3's standard ZIP reader to validate the complete artifact
before replacing generated outputs. Consumers run it before dependency setup;
`--check-dist` verifies actual website build bytes before Hosting packaging.
Tools uses `--marketing-captures-imported` with the same run's binding to verify
all 26 imported outputs before and after selected checks, then reuse only the
three exact exporter/design-context/sync freshness commands. Missing or changed
proof fails; standalone commands, syntax/unit checks and Dart framing checks
still execute. Strict import precedes bootstrap; later proof tolerates only the
standalone widget-dedupe analyzer's generated dependency cache and lockfile.
The Figma/AI-friendly metadata shape is checked into
`tool/marketing/app_screenshots_design_context.json` so downstream consumers do
not depend on ad hoc stdout.

```sh
node tool/marketing/export_app_screenshots.mjs --check
node tool/marketing/export_app_screenshots.mjs --check-design-json
node tool/marketing/export_app_screenshots.mjs --update-design-json
```

## Marketing Website Route Contracts

Public marketing website routes are tracked in `design/website/routes.json` and
validated against the React route shell, `website/src/content/meta.json`, its
runtime validator, postbuild static output, and generated organizer listings.

```sh
node tool/marketing/check_website_routes.mjs --check
node --test tool/marketing/website_meta_contract.test.mjs
node tool/run.mjs check marketing:website-routes
```

Organizer listing generation produces two explicit projections: deployable
`website/src/generated/hostListings.json` excludes `catchDemo`, while
`hostListings.demo.json` includes demo records for Storybook and sales tooling.
`npm --workspace catch-marketing run check:organizer-listings` validates both.

## React Web Architecture Gates

The React website/admin surfaces share scanners for route ownership, UI
primitive ownership, governed component families, and server-state ownership.
The query-state scanner is a baseline-backed ratchet: current manual async
state candidates are listed in `tool/web/react_query_state_baseline.json`, and
new feature controller or `use*` hook loading/saving/submitting/in-flight state
fails the check unless the owning baseline is deliberately updated in the same
reviewed change with a source-level rationale.

```sh
node tool/run.mjs check web:react-architecture-boundaries
node tool/run.mjs check web:react-ui-primitives
node tool/run.mjs check web:react-component-governance
node tool/run.mjs check web:react-query-state
node tool/run.mjs check web:shared-ui-adoption
node tool/run.mjs check web:react-controller-test-targets
node tool/run.mjs check web:admin-pending-operations
node tool/run.mjs check web:react-dependency-graph
npm run web:ui:test
npm run web:ui:typecheck
```

`web:react-dependency-graph` derives the website/admin/web-ui topology live from
TypeScript ASTs. It blocks unresolved repo-local imports, direct
website-to-admin dependencies, and runtime cycles. Type-only cycles remain
visible without blocking the check. No generated graph view is committed;
use `--summary` or `--json` for deterministic on-demand evidence and redirect it
into `build/` when a temporary artifact is useful.

`web:shared-ui-adoption` reconciles the cross-surface decision tracker with
website/admin runtime exports and `@catch/web-ui`. Adopted entries must be used
through both surface adapters. The same gate also preserves the shared focus,
accessible table/field/button contracts, and package CI path coverage.

`web:react-controller-test-targets` keeps every feature controller and mutation
hook classified in `tool/web/react_controller_test_targets.json`. Promoted
targets need a named importing behavior suite; planned targets remain visible
without turning aggregate coverage percentages into a brittle merge gate.

`web:admin-pending-operations` derives write and submitted-query controllers
from frozen Admin feature-contract cases. It requires each controller to
acquire and release the shared exclusive lease, rejects pending cases with
enabled actions, and verifies the workspace, navigation, link, unload, and
focused regression-test boundary remains installed.

Registry-ready Storybook stories also have deterministic desktop and mobile
image baselines under `design/visual_baselines/<surface>/<platform>/`. Build
the relevant Storybook before comparing or intentionally updating them:

```sh
npm --workspace catch-marketing run build:storybook
node tool/web/check_storybook_visuals.mjs --surface website --check
node tool/web/check_storybook_visuals.mjs --surface webui --check
npm --workspace catch-admin run build:storybook
node tool/web/check_storybook_visuals.mjs --surface admin --check
# Limit a baseline update/check to task-owned registry entries in a dirty refactor.
node tool/web/check_storybook_visuals.mjs --surface admin --component workspace_intake_operations --update
```

Use repeatable `--component <registry-id>` filters to isolate a task-owned
visual check or baseline update. Use `--update` only after the target UI and
registry review states are final. The checker fixes both viewports, requests
reduced motion, waits for fonts, and compares only against the current
operating system's baselines. This separation is required because the product
intentionally uses `system-ui`, whose glyph metrics and rasterization differ
between Darwin and Linux. A mismatch writes both the rendered image and its
diff under `artifacts/visual-actuals/<surface>/<platform>/` and
`artifacts/visual-diffs/<surface>/<platform>/`.

A story that provably drifts a few tenths of a percent between identical
builds can take a scoped waiver instead of forcing a global threshold raise.
`tool/web/storybook_visual_thresholds.json` maps a built story id to its own
changed-pixel ratio with a required `surface`, evidence `reason`, and valid
`expires` date; the check fails on unknown story ids, malformed entries, and
expired overrides so waivers cannot rot silently.

The Admin Website and Marketing Website workflows pin the blocking Linux
capture to Ubuntu 24.04. Their manual `workflow_dispatch` input
`update_visual_baselines=true` captures Linux baselines and uploads them as a
review artifact; it does not commit them. Review that artifact before replacing
`design/visual_baselines/<surface>/linux/`. Local Darwin updates remain useful
for local visual review but never substitute for the Linux CI baseline.

## Agent Harness

The permanent agent-facing layer is deliberately small. Git owns code, history,
branches, and worktrees. GitHub Actions owns shared checks, artifacts,
approvals, and deployments. Catch adds three pieces.

First, `tool/harness.mjs explain|plan` maps explicit paths or a Git diff through
the Catch component graph. The planner selects existing checks and safe
compile-codegen freshness verification, but it never executes them, coordinates
agents, or records execution history.

```sh
node tool/harness.mjs explain --base origin/main --head HEAD --json
node tool/harness.mjs plan --base origin/main --head HEAD --json
```

Second, `tool/agent/context_pack.mjs` is optional, read-only orientation for
broad work. It prints owner docs, matching project skills, source rules, and
suggested checks to stdout. It does not write a context artifact or gate work.
Its logical repository snapshot excludes paths owned by registered nested
worktrees using `git worktree list --porcelain`; those separate checkouts never
become malformed untracked paths in the current checkout.

```sh
node tool/agent/context_pack.mjs --task <label> --paths <path[,path...]>
```

Third, `tool/git/worktree_guard.mjs` is the thin creation and safety wrapper for
new task worktrees. After an explicit `git fetch origin main`, `start` requires
the exact fetched `origin/main` commit and rejects overlap with another active
local claimed-path set. Continue explicitly requested non-main work in its
existing worktree instead of using an ambient branch as a new base. `doctor`
reports dirty and out-of-scope work. `start` also refuses lifecycle files that differ from fetched main in
its launcher; refresh a stale primary checkout safely and reread the new task's
instructions. Plain `finish` refuses claim-only closeout. `finish --retain
--reason <blocker-and-next-action>` checks clean/pushed work, retains its original
claim, and reports handoff readiness rather than retirement.
`finish --abandon --reason <why>` releases a deliberately superseded claim only when its worktree is clean, retaining an attributable
local record under Git's common directory. `stale` reports candidates and
never deletes them. After merge/release acceptance, `retire` checks the exact
owned task/head against current remote main, proves ancestry or exact squash
path equivalence, and verifies unique history has a live remote recovery ref.
Dirty, untracked and ignored files block removal. Ignored output is reported
by directory root rather than every dependency file, keeping large installs
within the subprocess output limit. Review and dispose of proven generated
caches in the same closeout, preserve unique files, then retry retirement.
Keep the claim until admitted `retire --apply` confirms ordinary non-forced Git removal; all refs and stashes
remain preserved. Current external acceptance, owners/cross-clone claims,
users/runtime consumers and deletion authority are explicit manual checks in
`docs/agent_operating_model.md#completion`, identified by `--by` and `--clearance`.

```sh
node tool/git/worktree_guard.mjs start \
  --task-id <task-id> --base-sha <40-character-sha> --paths <paths>
node tool/git/worktree_guard.mjs doctor --worktree <path>
node tool/git/worktree_guard.mjs finish --worktree <path> \
  --retain --reason <blocker-and-next-action>
node tool/git/worktree_guard.mjs finish --worktree <path> \
  --abandon --reason <why> [--by <identity>]
node tool/git/worktree_guard.mjs stale --stale-days 7
node tool/git/worktree_guard.mjs retire \
  --task-id <task-id> --worktree <path> --head-sha <task-head> \
  --accepted-sha <verified-integrating-commit> \
  --by <task-owner> --clearance <current-acceptance-ownership-and-recovery-evidence>
# Repeat the exact report command with --apply only in its normal cleanup slot.
```

The guard does not fetch, install dependencies, execute checks, push, merge,
delete refs, or authorize commands. Retirement uses read-only live ref queries
and refuses stale/unavailable remote evidence. Its local claims are disposable; Git
branches and commits remain authoritative.

Bootstrap requires an explicit target and fails before installing if omitted.
A newly created worktree contains tracked files only. Install the selected
locked dependency family before its checks; omit bootstrap for dependency-free
checks:

```sh
bash tool/git/bootstrap_worktree.sh --target root
bash tool/git/bootstrap_worktree.sh --target functions
bash tool/git/bootstrap_worktree.sh --target flutter
# Explicit --target all only when all three families are required.
```

The repo-managed hook at `tool/git/hooks/pre-commit` is installed per clone with
`git config core.hooksPath tool/git/hooks`. Its Node guard consumes
`component_graph.json#compileCodegen`, regenerates staged localization inputs,
formats staged Dart, and runs only the triggered committed-output freshness
checks. It never runs the analyzer or a broad test lane, and it refuses to
re-stage partially staged Dart files.

The following legacy evidence paths were deleted and must remain absent:

- `docs/audit_registry/files.jsonl`
- `docs/audit_registry/passes.jsonl`
- `docs/audit_registry/agent_metrics.jsonl`
- `docs/audit_registry/doc_versions.json`
- `docs/agent_regression_ledger.json`

Repository hygiene prevents their return. Active invariants belong in tests,
linters, component risk gates, or explicitly manual owner-runbook checks. Git
and CI provide the durable proof of work.

## Feature Contract Compiler

`design/features/feature_coverage.json` is the exhaustive migration ledger for
registered feature surfaces. It derives its inventory from the Flutter screen
registry, marketing route registry, and route-kind entries in the admin
component registry. Every authority item must be contracted, grouped under one
primary feature projection, planned against a stable migration debt id, or
explicitly excluded. The checker also rejects orphaned source contracts and a
`contracted` decision whose source contract does not bind the claimed surface.

```sh
node tool/design/check_feature_coverage.mjs --check
node tool/design/check_feature_coverage.mjs --summary
```

`planned` proves that a surface is visible to the migration; it does not claim
that its state/action/evidence contract exists yet. Grouping is reserved for a
secondary route projection of the same feature, such as a dynamic lookup or a
live controller wrapper. Static legal/support and platform fallback routes may
be excluded when their existing route, metadata, and preview contracts are the
correct authority and there is no stateful product-action workflow to model.

`design/features/*.feature.json` holds reviewed feature orchestration sources.
One semantic feature may contain Flutter, marketing React, and admin React
surface projections. Each projection binds exactly one authoritative screen or
route, its native component registry, one or more typed action owners, and its
capture/preview/test evidence instead of duplicating those authorities. The
compiler expands every action case into enabled, disabled, and not-allowed
classifications and writes one deterministic cross-surface artifact under
`design/features/generated/`.

Each surface must state its action scope. Event Detail covers the Flutter
booking dock; Explore combines Flutter empty-result recovery with marketing-web
URL filtering/search analytics; Host Event Manage covers primary Flutter
edit/cancel/delete lifecycle rows; the consumer social reference batch adds
Catches Hub, Catches Event, Matches List, Member Chat, Self Profile, and Public
Profile. Organizer Detail adds a three-surface reference for consumer Flutter,
host Flutter, and the canonical marketing organizer listing. Generated action
counts must not be read as coverage of excluded route or section actions.
Actions name their owning Dart or TypeScript symbol and may
end in local surface states, route destinations, or named side effects.
Read-only surfaces use empty action/action-owner arrays instead of inventing
synthetic behavior. Missing required evidence must use an explicit stable-debt
exception, and the compiler rejects that exception once the referenced evidence
exists.

State-heavy surfaces may use the compact matrix form. `stateIds` still must
equal the authority's full state inventory, while `scenarioDefaults` owns the
common dimension/action case and `scenarioOverrides` records only divergent
states. The compiler expands this form into ordinary generated scenarios and
fails missing or unknown state ids and overrides, so the shorter source format
does not weaken drift detection.

For React routes, `bindings.previewEvidence` maps an authority state to an
explicitly selected registry preview when route-review and Storybook state
names differ. The compiler verifies the component belongs to that route and
that its story source is declared. Website static-output tests under
`website/scripts/*.test.mjs` are valid evidence for indexing, canonical, and
sitemap behavior that has no meaningful visual preview.

```sh
node tool/design/build_feature_contracts.mjs
node tool/design/build_feature_contracts.mjs --check
node tool/design/build_feature_contracts.mjs --summary
```

The `--check` command is blocking in the design parity gate. Generated feature
contracts are review artifacts and must not be edited by hand.

## Host Feature Responsibility Generator

`design/features/host_feature_responsibilities.json` defines the exact ordered
responsibility boundary for Today, Events, Audience, Inbox, and Organizer. It
is intentionally an index over the Host shell, typed route contract, and the
existing cross-surface feature contracts; it does not duplicate their state or
action algorithms. Direct transitional owners are allowed only when the wider
feature contract does not yet cover that destination seam.

The generator resolves referenced action-owner paths and symbols, verifies
owned and handoff routes, checks data-contract and focused-test paths, and
writes one `README.md` under each target `lib/hosts/<destination>/` root. The
generated docs state whether the vertical slice is live or whether current code
still resides in named legacy roots. This makes migration state visible without
letting five handwritten summaries drift.

```sh
node tool/design/build_host_feature_responsibilities.mjs
node tool/design/build_host_feature_responsibilities.mjs --check
node tool/run.mjs check design:host-feature-responsibilities
```

The selected implementation uses the repository's existing Node/Ajv tooling
instead of adding a documentation framework or extending the much denser
feature-contract schema with Host-only migration prose. The JSON contract is
Catch-specific architecture policy, generation is deterministic and
network-free, and the standard design-parity gate owns freshness.

## Design Tokens

The canonical UI primitive source is `design/tokens/catch.tokens.json`. It
generates the customer website token CSS, website font assets, and Flutter Dart
constants in `packages/catch_tokens/lib/generated/catch_design_tokens.g.dart`.
The Flutter-only `catch_tokens` workspace package exports these scales and its
handwritten semantic/component tokens to the apps and Widgetbook.

```sh
dart run tool/design_tokens.dart
dart run tool/design_tokens.dart --check
node tool/run.mjs run design:tokens
node tool/run.mjs check design:tokens
```

## Stable Root Entrypoints

These wrappers intentionally stay at the top level because CI, release runbooks,
or muscle memory already depend on them:

- `tool/check_data_contract.sh`
- `tool/check_catch_ui_lint_drift.sh`
- `tool/design_tokens.dart`
- `tool/check_riverpod_lint.sh`
- `tool/check_catch_ui_lints.sh`
- `tool/deploy_firebase_targets.sh`
- `tool/firebase_with_env.sh`
- `tool/flutter_with_env.sh`
- `tool/use_firebase_environment.sh`
- `tool/validate_firebase_environment.sh`
- `tool/widget_cleanup_scan.sh`
- `tool/write_ios_maps_key_xcconfig.sh`

## Product Copy

Short Flutter UI copy is owned by `lib/l10n/app_en.arb`. Structured content
that must remain usable by synchronous domain models is owned by locale JSON
under `copy/` and generates deterministic Dart. For Event Success
questionnaires:

`tool/copy/check_mobile_copy_ownership.dart` enforces that boundary across
widget arguments, copy-shaped constructor defaults and initializers,
presentation-state members, validator/share/status helpers, and Event Success
display enums. Its self-test seeds each supported AST shape plus technical and
diagnostic counterexamples. The product-copy baseline stays empty; the narrow
allowlist is reserved for proven technical identifiers.

`tool/copy/check_mobile_copy_catalog.mjs` also rejects new ARB identifiers that
contain the generated `Visiblecopy` marker. Reviewed legacy exceptions live in
`tool/copy/mobile_copy_identifier_allowlist.json`; additions require an explicit
review instead of silently expanding the catalog.

```sh
node tool/copy/check_l10n_key_usage.mjs --check --json
node tool/run.mjs check copy:l10n-key-usage
node --test tool/copy/check_l10n_key_usage.test.mjs
```

The live key-usage scan reports exact handwritten Dart references, excludes
generated Dart, comments, and string contents, and fails on any new orphan or
missing catalog getter. Use `--json` for ephemeral review evidence; do not
commit a generated usage snapshot. Baseline reductions pass; baseline growth
is rejected.

```sh
node tool/copy/sync_event_success_questionnaires.mjs --write
node tool/run.mjs check copy:event-success-questionnaires
```

Event Success playbooks, coach guidance, and event-policy descriptions use the
same ownership model. Marketing edits `copy/structured_domain_copy_en.json`;
engineers edit typed structure templates only when the data model changes:

```sh
dart run tool/copy/sync_structured_domain_copy.dart --write
node tool/run.mjs check copy:structured-domain-content
```

Edit the JSON source, never the generated Dart file. The check validates stable
ids, non-empty text, and exact generated output.

## Adding Or Moving A Tool

1. Put the implementation in the narrowest matching category folder.
2. Add or update the entry in `tool/tools_manifest.json`.
3. Include at least one cheap `checks` command unless the tool is an interactive Flutter entrypoint.
4. Declare `ciRequirements.repositoryView: index` only when sparse Git-index
   visibility is sound; otherwise CI uses a full repository checkout.
5. Use `tool/lib/` helpers for repo paths, CLI flags, and Firebase project selection.
6. Run `node tool/run.mjs check --manifest-only` before opening a PR.

Remote write tools should default to dry-run/read-only behavior, require an
explicit apply flag, and carry a `safety` label that reflects the blast radius.

## PR validation and the merge queue

Every ready PR into `main` runs `CI` in parallel. A newer push or a
conversion to draft cancels that PR's older run, and drafts validate once they
are marked ready. Pull requests defer the slow macOS and app-build lanes
(`visual_integration`, `flutter_build_*` and `flutter_web_smoke`): the plan
lists them as `queueDeferredCiTargets`, and the merge queue runs them on the
exact combined source before `main` moves. Pass `--mode merge_group` to
`tool/harness/verify_local.mjs` to select them locally. The `Plan affected
targets` job gives the early planner feedback within a minute; skipping
expensive jobs is never evidence that those jobs passed.

Pull requests also run only the strict Firestore/Storage emulator tests their
change can reach. `tool/impact/emulator_test_selection.mjs` follows the
dependency-cruiser graph of `functions/src` and `functions/test`, plus contract,
index and fixture files a test names as a string path; rules, `firebase.json`,
Functions package, TypeScript config and script changes keep the full list.
`functions/scripts/run-tests.cjs` honors the result through
`CATCH_TEST_SELECTION`; the merge queue, main and nightly run every listed test.

A PR result does not need to stay current with `main`. The GitHub merge queue
validates each group's exact combined source with the same `Required CI`
aggregate (`merge_group` mode) before `main` moves, so two individually green
PRs cannot break `main` together. Queue a PR with
`gh pr merge <number> --auto --squash`; a failed group drops the failing PR and
retests the rest. Main validation, backend source approval and delivery
authority remain separate and retain their existing checks.

Read failed-job logs before rerunning, and push a reviewed repair batch once
rather than iterating on CI. Drafts with missing implementation stay drafts
until their stated scope is complete. Measure completed job runner time, reruns
and superseded work separately from queue and approval waits. Public
standard-runner usage and private billed usage must not be conflated when
reporting savings.

## Host measurement preview runtime

The manual `Host measurement preview runtime` workflow publishes only the two
reviewed PR726 assets to `catch-host-measurement.web.app`. The
`ci:host-measurement-preview` binds their configuration/content hashes and
rejects extra files and symlinks before deploy. After deploy, serving acceptance
allows only the pinned Hosting client's generated hash cache and validates its
two gzip-upload hashes against the reviewed runtime before checking public
bytes and privacy headers.
The release helper requires current main, its successful same-source main CI,
the exact workflow caller and a first-attempt dispatch before existing Hosting
OIDC authentication and again at the deployment boundary. No source build,
Functions, IAM, credential installation or production-parent permission is part
of this release. The existing website preview is a separate deployment.

The runtime accepts messages only from the reviewed `next-candidate` origin and
sends only consented internal/debug Analytics events. Publication proves serving
bytes, not provider receipt or live advertising attribution. A failed deployment
requires inspecting its retained evidence before a new dispatch; no automatic
deploy retry or rollback is provided. Production measurement and ad launch
remain separately held. Run `node tool/run.mjs check ci:host-measurement-preview`
for the offline release-boundary tests.
