---
doc_id: release_operations
version: 3.2.0
updated: 2026-11-01
owner: recursive_audit_loop
status: active
---

# Release Operations

## Local Firebase Safety

The checked `.firebaserc` default points to `catchdates-dev` as a local safety
net. Remote commands must still select `dev`, `staging`, or `prod` explicitly:

```sh
./tool/firebase_with_env.sh dev projects:list
npm --prefix functions run deploy -- staging
npm --prefix functions run logs -- prod --limit 50
```

Do not use bare `firebase deploy` or `firebase functions:log`. The Functions
package scripts route through the checked wrapper and reject a missing or
unknown environment. Hosting targets are intentionally mapped only for the
production project. A development or staging `hosting:<target>` deployment
therefore fails until that target is explicitly created and mapped; do not
work around that failure by falling back to production.

Flutter, Node, Java, Firebase CLI, CocoaPods, the GitHub-hosted Apple runner,
and the minimum Xcode version are owned together in `tool/ci/toolchain.env`.
GitHub Actions reads that contract;
`bash tool/ci/check_toolchain_consistency.sh` fails when a required pin, the
Functions Node engine, or an Apple-native workflow runner drifts. Keep the
Apple runner major aligned with the minimum Xcode major. The repository enforces
Xcode 26.2.0 or newer for the locked Firebase Apple SDK 12.19.0. Although
`connectivity_plus` 7.x requires only Xcode 26.1.1 or newer, Firebase sets the
higher repository minimum. Native build, release, and hosted visual-smoke
workflows use `macos-26`.

## Deployment Image Retention and Cost Alerts

`tool/firebase/artifact_registry_cleanup_policy.json` owns the seven-day
Artifact Registry policy for `gcf-artifacts` in `asia-south1` and `us-central1`
for dev, staging, and production. Apply the same checked policy explicitly to
each repository and read it back:

```sh
gcloud artifacts repositories set-cleanup-policies gcf-artifacts \
  --project <project-id> --location <region> \
  --policy tool/firebase/artifact_registry_cleanup_policy.json --no-dry-run
gcloud artifacts repositories describe gcf-artifacts \
  --project <project-id> --location <region> --format=json
```

The policy expires tagged and untagged build images after seven days. There is
no keep-count exception that can retain old images indefinitely. Firebase keeps
the deployed runtime separately; these build images are not user uploads or
application data. Artifact Registry executes cleanup asynchronously, and storage
reclamation can lag version deletion. The immutable source-bound GitHub delivery
packages retain their separate 90-day recovery window.

The combined `Catch pre-launch` billing budget is ₹400 per calendar month,
scoped to the three Catch projects, with actual-spend alerts at 50%, 80%, and
100% plus a forecast alert at 100%. Budgets send alerts; they do not cap spending.
Keep unrelated project budgets separate. Attribute changes by project and SKU
before removing resources or claiming savings from the invoice.

## Firebase Environment Readiness

The Deploy backend workflow installs its pinned source parser without lifecycle
scripts and verifies affected targets before cloud authentication. Its deploy
job builds Functions, replans just before deploying, authenticates, installs the cloud
CLIs and materializes parameters. The target-aware metadata preflight then
runs before any backend mutation.
Hosting and explicit Remote Config/Extensions operations have separate owners:

```sh
node tool/firebase/check_environment_readiness.mjs --manifest-only
node tool/firebase/check_environment_readiness.mjs \
  --env dev \
  --targets firestore:indexes,functions,firestore:rules,storage
```

`tool/firebase/environment_readiness.json` owns required secret bindings, direct
readers and Firestore TTL policies. Offline checks reconcile source declarations,
consumers and binding intent. The command above inspects deployed state; `Deploy backend`
runs it before each deploy. Projects resolve only through `.firebaserc`. Metadata commands
describe projects and exact secret versions, project allowlisted Function fields,
and read secret IAM/TTL policies; identity-specific checks also read IAM metadata.
There is no apply mode or secret-payload access. See
[Credential readiness and deployment provenance](#credential-readiness-and-deployment-provenance)
for evidence limits and recovery.

Confirmed missing state exits `1`; authentication, authorization, unavailable
tooling, or malformed metadata exits `2`; invalid invocation exits `64`. All
non-zero results block deployment. Add a requirement in the same change that
introduces a new `defineSecret`, TTL-dependent capability, or deploy-time
project prerequisite. A missing or indeterminate prerequisite must fail before
deployment; do not move this gate into Firebase predeploy hooks.

## Firebase Functions Deployment Parity

Repository checks prove the authored Functions package, not what a Firebase
project currently exposes. After every Functions deployment, the safe deploy
wrapper compares the live inventory with the exact deployment-eligible target
set resolved by its planner and confirms that every literal `defineSecret()`
name exists in the selected project. A broad `functions` plan resolves every
eligible export, so it retains full parity; an exact selective plan does not
require unrelated exports:

```sh
node tool/firebase/check_deploy_parity.mjs --env staging
node tool/firebase/check_deploy_parity.mjs --env prod --json
node tool/firebase/check_deploy_parity.mjs --env prod \
  --targets functions:firstCallable,functions:secondCallable
```

Without `--targets`, the command remains a strict full-parity check. Missing
selected exports (or any deployment-eligible export in full mode) and missing
declared secret names fail the deployment. Selectors not eligible in the exact
source fail closed. Environment-only Functions are counted but ignored because
installed Firebase Extensions legitimately own exports that are absent from
this repository. The check uses only `firebase functions:list` and Secret
Manager resource-name metadata; it never requests a secret version or payload.
Authentication, authorization, tooling, and malformed-metadata failures fail
closed.

### Dormant scheduled Functions

Catch's bounded deployment policy in
`tool/firebase/list_firebase_function_targets.mjs` keeps the following recurring
Functions implemented and testable but excludes them from logical and exact
Function deployment plans:

- `dispatchPendingOrganizerFollowerUpdates`
- `dispatchScheduledOrganizerCampaigns`
- `expireCrossPathsInvitations`
- `expireCrossPathsPairHolds`
- `expireEventRehearsals`
- `expireEventWaitlistOffers`
- `reconcileRazorpayOrders`
- `sendEventReminders`

They were undeployed from dev, staging, and production on 2026-09-02 after live
queries found no pending campaigns, delivery operations, rehearsal sessions,
payment reconciliation, waitlist offers, invitations, pair holds, or future
active events. Re-enabling one is a deliberate source-policy change: prove the
corresponding live workload, define its environment scope and monthly budget,
run its focused Functions tests, deploy dev then staging then production, and
verify both the Function and Scheduler job after each environment. Do not use a
bare Firebase CLI deployment to bypass this gate.

## Firebase Rules Deployment Drift

Emulator tests prove the checked-out Firestore and Storage rules, not the rules
currently enforced by a Firebase project. Compare the active releases with an
explicit environment or project:

```sh
node tool/run.mjs check firebase:rules-deployment-drift
node tool/firebase/check_rules_deployment_drift.mjs --env staging
node tool/firebase/check_rules_deployment_drift.mjs --env prod
```

The check lists active Rules releases, fetches their immutable ruleset source,
and compares `firestore.rules` plus every active bucket release using a
normalized SHA-256. Normalization removes a UTF-8 BOM, line-ending differences,
trailing horizontal whitespace, and extra final blank lines. It deliberately
does not discard comments or parse and rewrite the Rules language: a transparent
content comparison is deterministic, while a home-grown semantic parser could
hide a meaningful source change.

Authentication uses `FIREBASE_RULES_ACCESS_TOKEN`,
`GOOGLE_OAUTH_ACCESS_TOKEN`, or an authenticated `gcloud` session. A machine
with no credentials prints a clear skip and exits zero so untrusted CI remains
usable. A Claude Code cloud session counts as having none: its `gcloud` token
comes from `CLOUDSDK_AUTH_ACCESS_TOKEN`, which belongs to the session's egress
proxy and cannot read Catch's projects, so the check skips without sending it.
An explicit token still runs the comparison there. Once credentials exist,
API/authorization errors, missing releases, and content drift fail. The
authenticated backend promotion runs the same check against the exact
CI-approved source after its ordered deploy stages, with a bounded retry window
for Rules release propagation.

## Storage Rules Cross-Service Readiness

Storage rules that use `firestore.get()` or `firestore.exists()` need one
project-level dependency outside the ruleset: the Firebase Storage service
agent must hold `roles/firebaserules.firestoreServiceAgent`. The required
member is derived from each checked Firebase project number:

```text
service-{projectNumber}@gcp-sa-firebasestorage.iam.gserviceaccount.com
```

Check all environments before a Storage deploy. Check mode is read-only and
fails if any binding is absent:

```sh
node tool/firebase/storage_rules_firestore_iam.mjs --all
```

Provision only missing bindings after reviewing the output. Production apply
is intentionally double-guarded:

```sh
node tool/firebase/storage_rules_firestore_iam.mjs \
  --all --apply --allow-prod
```

`tool/deploy_firebase_targets.sh` runs the single-environment check before its
Storage phase, so a ruleset cannot deploy while its cross-service dependency is
known missing. The deploy identity needs `resourcemanager.projects.getIamPolicy`
for that preflight; it does not need permission to change IAM. Owner-operated
apply preserves the policy etag, conditions, unrelated roles, and members.

Emulator rules tests do not prove deployed IAM, App Check, or production
cross-service access-call limits. After rules or this binding changes, run the
authenticated upload/delete canary with an existing active participant and
match. App Check is enforced, so provide a registered environment-owned debug
token without placing it on the command line:

```sh
export FIREBASE_STORAGE_CANARY_APPCHECK_DEBUG_TOKEN='...'
node tool/firebase/probe_chat_storage_rules.mjs \
  --env dev --uid <uid> --match-id <active-match> --apply
node tool/firebase/probe_chat_storage_rules.mjs \
  --env prod --uid <uid> --match-id <active-match> --apply --allow-prod
```

The probe uploads one fixed 1x1 PNG through Firebase Auth and App Check, then
deletes it through the same client rules. It never prints credentials. Chat
image rules use the canonical match document for participant/status checks so
one evaluation stays under Storage Rules' Firestore document-access limit;
blocking projects that match to `status: blocked`. Creates require immutable
`uploaderUid` custom metadata, updates are denied, and only that uploader may
perform compensating deletion. Do not replace this with a blanket signed-in
write rule.

This is the durable owner for CI gates, Firebase deployment ordering, and
release-readiness evidence. It replaces dated one-off runbooks and should stay
short enough to be read before a deploy.

## Native Splash Assets

The Consumer native splash is generated from the `flutter_native_splash:` block
in `apps/consumer/pubspec.yaml`; edit that config and run
`dart run flutter_native_splash:create` from `apps/consumer` instead of
hand-editing platform drawables/storyboards. Host splash assets come only from
the brand generator below. Before regenerating,
verify the configured splash image is a transparent mark that composites cleanly
on both `#F4F4F1` and `#0F0E10`; a baked app-icon tile is not an acceptable
native splash image. The native splash mark is generated as transparent output
by `tool/branding/generate_catch_icon.swift` and is a separate asset from the
opaque launcher icon; edit the generator and `apps/consumer/pubspec.yaml`, then
re-run the
Swift generator and `flutter_native_splash:create`. Finally run
`dart run tool/branding/generate_native_brand_assets.dart`: it reapplies the
Consumer-only iOS responsive launch constraints that align `Catch_` with the
Welcome reel and reapplies the Host-specific centered `Catch Host` launch
storyboard/assets on the installable Host target. Never hand-edit those
generated storyboards or platform drawables. The Host static mark uses Archivo
at explicit `wght: 600` / `wdth: 78`, then hands directly to Host auth/home
routing without a Welcome reel.

## Required PR Checks

Configure GitHub branch protection for `main` to require the single stable
`CI / Required CI` result. That aggregate always exists for pull requests,
pushes, and merge queues. It fails when planning fails or any selected lane
fails; unaffected lanes are explicit skips, so path scoping never leaves a
required check permanently pending. Required CI has no mandatory human backend
source-review job. The merge queue reruns it on the exact combined source of
each group before `main` moves, so a pull request result never needs to stay
current with `main`. A `main` push whose exact commit already passed a
successful merge-queue run re-runs no validation lane, source preflight
included: it only plans and records the reused run ID in its summary.
Marketing Website reads the queue run's Marketing and capture evidence,
validating its own source when the queue run selected neither. App builds then
run in nightly validation, and signed store builds come from
[Mobile releases](#mobile-releases). Without a successful queue run of the same
commit, `main` runs every selected lane.

`.github/workflows/ci.yml` is the orchestration owner. Its planner reads
`tool/harness/component_graph.json`, fails closed for an unmapped or ambiguous
path, and invokes reusable validation workflows only for affected targets.
Pull requests, merge queues, main pushes, and nightly full validation use the
explicit `pr`, `merge_group`, `main`, and `nightly` graph modes respectively.
Changes to the shared Harness control plane intentionally run every declared
target. The graph explicitly owns the `Deploy backend` workflows and the
backend package verifier: those changes run Functions,
contracts, rules, policy and the affected Tools check closure without compiling
unrelated clients. Files PR validation never executes run only their own Tools
checks and policy: harness and CI tests, release, deploy and operations
workflows, and `tool/ci` release scripts no PR workflow invokes
(`harness-scoped-control`). Selector controls, including the planner, graph and
`tool/tools_manifest.json`, still run every target. A harness test proves that
no workflow PR CI runs, and no `tool/ci` module it invokes or imports, is ever
narrowed. The tool planner honors the graph's terminal classifications
and includes every declared check plus its transitive dependencies; it does not
reapply a broader workflow glob or drop graph-required checks. Shared CI
orchestration, toolchains, the cross-product delivery core,
unknown files and actual app changes retain their broader validation. A nightly
scheduled full run catches drift hidden by ordinary impact routing.
Dedicated validation-workflow edits run their own lane plus policy validation.
The policy lane runs the existing `agent:harness-v2` wiring suite when Tools is
absent, with the pinned Node version and only root npm dependencies. When Tools
is selected alongside a workflow change, its check closure owns that suite;
ordinary prose keeps its lightweight document checks.
The graph selects validation only. No plan authorizes a Firebase deployment or
a mobile release: `Deploy backend` plans from its own `deploy:backend` deployment record, and
mobile builds run in `Mobile Beta` and `Mobile Production`.

The packaged callable IAM helper is deployment tooling, not compiled Functions
runtime. Its exact script and test paths select backend validation without
redeploying runtime exports. After a Functions deployment, the executor passes
only that phase's verified exact targets to scope-aware packages. Discovery
must find every selected target active before any IAM request; non-callable
HTTP handlers need no callable permission update. Unrelated services are not
read or changed. Older immutable packages retain their original scan through
an explicit capability check; an unknown capability version fails. Existing
conditional bindings and policy etags are preserved when adding the intended
unconditional public invoker binding.

Main pushes plan from the push's `before` commit. Harness, Tools
preflight/execution and Flutter test selection use the union of every path
touched in that committed history, including reversions, merge-parent changes
and transient removed files. Current unowned paths still fail; unowned
transient history broadens validation to the existing nightly/full mode. A
cancelled older main run leaves no gap to cover: the merge queue already
validated each of its commits. Pull requests and nightly runs retain their
existing validation flow.

Root Flutter unit/widget tests are selected by
`tool/harness/lib/flutter_test_selection.dart` from the exact base and head Git
objects. Dart's parser follows imports, exports, conditional imports and parts
in both snapshots, so deleted or moved dependencies remain covered. Every
ancestor `flutter_test_config.dart` counts as an import of the tests beneath it.
Tests that inspect files through `dart:io` are filesystem probes and are always
selected. Dart files anywhere in the repository are covered by the import graph.
Paths outside the root package (backend, web, design, docs, tooling, CI,
golden and integration suites, other packages' apps, firebase configuration and
Markdown outside test or asset directories) are probe-only. A root test can only
read them from disk, so the probes cover them without broadening the selection.
These inputs keep the full suite: package manifests and the lockfile, analyzer,
runner, build and localization configuration, `.arb` sources, the Flutter SDK
pin and the Flutter CI job, and any path that either snapshot's `flutter:`
manifest section could bundle as an asset. The same goes for test fixtures,
assets, native folders, unknown roots, and any changed `lib/`, `test/` or package
source with no provable dependent test, even when another changed source has
proven coverage.
Scheduled and manual CI resolve their base revision to an exact commit before
binding any lane inputs or artifacts. Nightly and explicit full runs
also execute every test. Native, package, golden, integration, analyzer and
contract checks retain their separate owners.

### Selected Check Contracts

The graph selects obligations; selection is not execution evidence. Selector-control
edits compare the actual Git base and head graph/engine snapshots on identical
changed paths and require the union of their full validation targets. Main
comparison includes transient and reverted paths in the committed window.
Comparison artifacts record selected IDs, differences, source and selector-input
hashes; they are not executed-test evidence or a cross-SHA reuse permission.
Missing snapshot dependencies and incomplete selection fail closed.

Orchestration job guards use `!cancelled()` so cancellation can terminate the
planner and aggregate instead of leaving an `always()` job running. Failed runs
still execute the rejecting aggregate; every selected target requires a
successful owning job. Drafts skip planning and publish no Required CI context
until they are marked ready. A cancelled workflow has no
successful validation authority. Reusable Flutter and Tools aggregates use the same cancellation guard. See [GitHub cancellation semantics](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-cancellation).

The required source preflight runs before validation fanout from a full checkout
with pinned Node/Flutter and selected generator dependencies. It checks the
structural and generation obligations in `verify_local.mjs`, collects failures,
and refuses unavailable checks. Sparse planning explicitly allows deferral;
that preliminary result cannot satisfy the required complete preflight job.

Preserve these contracts when narrowing work:

| Invariant and owner | Inputs and trigger | Environment and evidence | Failure action |
|---|---|---|---|
| Backend permissions and transaction behavior; backend platform | Functions source/tests/package inputs, Rules, and generated backend contracts conservatively select backend integration | Pinned Node/Java/Firebase CLI, Firestore and Storage emulators; strict runner rejects missing emulators, zero executed tests, failures, skips and TODOs. Seven-day artifact records selected/executed tests, summaries, source SHA, Node version and input hashes | Repair the failing assertion or missing execution; do not replace an emulator run with ordinary Functions discovery |
| Root Flutter behavior; app platform | Every changed Dart source needs a base/head import-path proof; unproven mixed paths retain full selection | Pinned Flutter; existing selected-file/shard artifacts and actual test results | Repair coverage or retain full fallback; filesystem probes do not establish coverage for unrelated files |
| App journeys and rendering; app platform | App source changes select visual/integration obligations | Independent Ubuntu headless journeys; macOS goldens, repeated Widgetbook rendering and native smoke remain separate required jobs | Fix the earliest behavior/render assertion; native dependency retry never retries a product assertion |
| Generated schema freshness; backend platform | Generated schema bindings and backend package inputs select Contracts, including output-only edits | Contracts installs Functions generator dependencies and executes checked-source freshness commands | Run the named generator, inspect the diff and rerun freshness; a plan's codegen ID alone proves nothing |
| Component/route/design source integrity; design system | Existing semantic checks and seeded dedupe probes remain blocking | Design parity retains component, route, screen, feature and preview contracts; focused similarity tests exercise reporting code | Repair the named source invariant; metadata checks do not establish live Figma or pixel parity |
| Capture provenance and website image copies; marketing website | Conservative Flutter source/test/asset/package and capture-tool inputs select capture freshness; website/shared React inputs still select full React validation | Pinned macOS canonical producer renders or validates exact-source captures; Linux consumers verify immutable artifact identity and import before checks/builds; selected lane must succeed in finalization and Required CI | Repair the source or producer failure; never replace missing artifact proof with stale tracked images or restamped PNGs |
| Authored design decisions; design system | Todo decision edits select scoped index validation; counts/gaps derive from source registries | `check_comprehensive_todo_summary.mjs --summary` prints current counts without editing Markdown; P1 decision coverage remains checked | Add or repair the authored decision row; do not copy regenerated counts into prose |

Whole-product widget similarity is advisory and has no product acceptance
threshold. Request it explicitly with `check_design_parity.mjs --check --reports`
or run its registered report command. Its extractor/clustering probes and focused
generator regressions remain blocking. Scoped snapshot/export checks prove only their documented source/metadata
invariants; the explicit handoff command checks all of them together.

Use GitHub run/job timestamps and execution artifacts to measure time to first
actionable failure, ready-to-merge latency, completed job-seconds by runner,
reruns, selector misses, unexpected skips and regeneration-conflict effort.
Record source/toolchain identity and deduplicate retained job IDs across retry
attempts. These observations are not money saved or proof permitting cross-SHA
result reuse. Keep run measurements in task/CI evidence, not tracked ledgers.

The same planner follows the lint engine's seeded and generated probe imports.
The expensive Catch UI plugin smoke check runs when its engine, configuration,
corpus or transitive probe APIs change, and on full runs. When the actual Tools
plan already selects that registered check, Flutter consumes the same CI run's
required Tools result and omits its duplicate invocation. Standalone Flutter
runs retain their own engine check. The engine stages its existing fixture
libraries together and supplies every exact file to one analyzer process.
Positive and negative assertions remain per-file; plugin failure, missing
fixtures or malformed diagnostics fail the run. The application analyzer and zero-diagnostic
gate still run on every selected Flutter lane. The workspace analyzer saves its
root diagnostics once; the lint gate and report reuse that output instead of
launching a second root analysis.
Selector safety tests run before any selective job can proceed; planner failure
fails the aggregate. The selected inventory and reasons are CI artifacts, not
a tracked registry.

Each selected test shard collects line coverage during its single test run.
The coverage job requires all planned shard artifacts and merges their observed
lines without rerunning tests or counting shared source files twice. Coverage
is visibility-only; compare nightly reports for full-suite trends. A shard
containing only repository probes can legitimately observe no product lines.
The matrix contains at most four nonempty shards and the required aggregate
rejects missing planner, test or coverage results.

The orchestrator also owns cancellation. Reusable fanout workflows must not
derive a concurrency group from `github.workflow`: inside a called workflow
that value is the caller name, so sibling lanes would share one key and cancel
one another. Standalone/manual workflow dispatches may add a distinct
workflow-specific key, but normal CI fanout inherits the orchestrator boundary.

Local `node tool/harness/verify_local.mjs --base origin/main --list` resolves
Tools checks through the same affected-tool planner and registered runner as CI,
including full fallback. Literal package working directories are preserved;
commands with unresolved environment or Actions context remain explicit gaps.
Each Tools category bucket uses one runner invocation, so identical registered
commands execute once across its categories in their declared order. Repeated
`--category` arguments retain that behavior locally; every category must exist
before any check executes. Local checks
stop on shell pipeline failures and incomplete ownership cannot report success.

When the actual CI plan selects Marketing, Tools reuses that same run's required
React marketing accessibility and screenshot comparisons. It omits only the
two exact registered browser commands; syntax, configuration and scanner
self-tests still execute. The required aggregate owns both lanes, so a failed
or cancelled React check still blocks CI. Reusable and standalone Tools runs
default to executing their own browser checks. No result crosses source commits
or CI attempts, and altered commands lose the omission until their equivalence
is verified again.

On a Marketing main push, `ci.yml` owns React validation and its canonical
native capture producer. `marketing-website.yml` waits up to 90 minutes for the
exact source/workflow/run/attempt. It verifies executed-job timestamps against
the attempt start and selects only the exact attempt's capture artifact by name,
ID and digest. Rehydrated old job results cannot authorize a new attempt. The
consumer independently verifies the artifact and its bytes again before import.
Missing, failed, cancelled or ambiguous evidence blocks packaging.

An explicitly skipped Marketing lane requires standalone React validation. If
that same CI attempt produced captures for a native-only change, its exact bundle
is reused; otherwise standalone validation requests the existing producer once.
Manual validation uses the same path. Native source, fixture, package/font and
capture helper changes trigger Marketing Website so refreshed media can reach
its existing main release path. No source or attempt crosses this boundary.

Production packaging still materializes read-only live organizer listings,
validates production environment inputs and builds exact production bytes. It
compares the built image and manifest bytes with the verified capture bundle
before the existing Hosting package inventory and promotion checks. Recovery
promotes an existing package without regeneration. A PR bundle never supplies
production bytes. The contracts remain `ci:main-marketing-validation` and
`ci:web-hosting-delivery-workflow`.


Flutter reuses design parity and handoff checks only when the actual required
Tools plan owns their complete registered checks. Standalone Flutter runs default
to executing them. Otherwise its handoff step selects Figma/Claude/context checks
from the exact committed input window; full runs and control changes retain all
handoff checks. Ordinary unrelated app logic no longer regenerates the context
pack. Failure or cancellation of the owning Tools lane still fails Required CI.

Design parity source checks are explicit commands in `tool/tools_manifest.json`,
shared by the local umbrella and the tool runner. Identical scanner commands run
once within the Marketing/design tool bucket. Figma/Claude snapshot checks and
portable context exports select from their recorded inputs; local handoff work
can request `check_design_parity.mjs --check --handoff`. Whole-product similarity
and advisory migration reports remain explicit `--reports` output. These prove
source contracts or export freshness, never live visual parity. Missing snapshot
metadata still fails its selected check; generated reports do not replace UI
journeys, renderer tests or ownership checks.

Route inventory version 5 records semantic presentation identities, not physical
line positions or a hash of the entire router file. Its router fingerprint includes
the configuration and reachable local callable signatures/bodies; route deletion,
retargeting and composition changes still invalidate it. Imperative identities hash
the normalized builder and fullscreen-dialog expressions, with an occurrence
counter for identical presentations. The resolved Dart checker independently
reconstructs those identities and verifies each typed presentation owner. Use
`node tool/ui_capture/check_route_inventory.mjs --locations` for current diagnostic
lines and `--update` to regenerate after a semantic route change. Review the
resulting route/capture obligations rather than editing hashes by hand.

The complete impact plan is written to `build/ci/impact-plan.json` and rendered
from that file. Only bounded booleans and role arrays cross the GitHub step/job
output boundary, alongside bounded test-shard descriptors. Do not expand the
per-file plan into an environment variable:
large pull requests can exceed the operating system argument limit before the
summary shell even starts.

Generated Dart bindings under `lib/platform/schema_contracts/generated/**` are
validation inputs, not mobile-release authorization. They run the Flutter
analysis/test lane but do not select iOS, Android, web artifact builds, or a
Consumer/Host internal release on their own. A mobile release requires an
owning runtime-source, native-platform, asset/dependency, or mobile-build-control
change. This keeps backend/admin contract generation from producing signed app
artifacts while still detecting stale or invalid Dart bindings.

Backend validation and backend deployment are also separate decisions.
CI-control changes intentionally validate Functions, contracts, and rules, but
they do not authorize a Firebase mutation. Only directly owned Functions,
rules, index, or Storage-rules sources may emit their bounded deploy group;
contract and Firebase configuration changes alone never grant mutation. After
every selected validation lane passes, CI packages those explicit groups once,
but no workflow promotes that package: `Deploy backend` deploys the exact
`main` commit instead (see Deploy Backend).

The app package-graph gate must also work in a clean checkout before
`flutter pub get`. It validates governed native-package declarations directly
from each app package and enriches the report with Flutter-generated plugin
metadata when available. Release receipt checks remain the authoritative proof
that forbidden native frameworks are absent from the compiled Host payload.

The current workflows are:

| Workflow | Purpose |
|---|---|
| `.github/workflows/ci.yml` | Always-running impact planner, reusable-workflow fanout, scheduled full matrix, and stable required aggregate. |
| `.github/workflows/flutter-ci.yml` | Reusable design parity, exhaustive root-and-nested-package analysis, fail-closed unit/widget test selection, and UI lint smoke checks. |
| `.github/workflows/functions-ci.yml` | Functions lint/test plus Firestore contract check on Node 24. |
| `.github/workflows/firestore-rules-ci.yml` | Firestore contract check plus emulator-backed rules tests. |
| `.github/workflows/contracts-ci.yml` | Validates the `contracts/` schema source of truth: source validity, generated-output freshness, schema/type boundaries, path literals, and rules semantics. |
| `.github/workflows/operations-ci.yml` | Reusable Operations platform contracts, tests, boundaries, and CLI smoke lane, selected independently from general repository tooling. |
| `.github/workflows/app-build-matrix.yml` | Reusable role/platform-selective dev web, Android debug APK, and parallel per-role iOS simulator build gates. Cheap app-structure ratchets run before any expensive compile. |
| `.github/workflows/backend-deploy.yml` | The one backend path: dev on every backend-relevant merge, prod automatically after dev succeeds, staging monthly. See Deploy Backend. |
| `.github/workflows/_backend-deploy.yml` | Reusable per-environment job: credential-free plan from the newest `deploy:backend` deployment, readiness check, index `READY` wait, `deploy_firebase_targets.sh`, rules drift check, then a new deployment records the commit. |
| `.github/workflows/data-validation.yml` | Read-only Firestore data validation, nightly and manual. |
| `.github/workflows/_web-hosting-build.yml` | Builds one production Admin or Marketing Vite bundle or standalone Host Flutter web bundle, packages one lifecycle-hook-free Hosting target, and publishes workflow/run/source-bound bytes with an exact file inventory. |
| `.github/workflows/_web-hosting-promote.yml` | Downloads one Hosting artifact by immutable id, installs the pinned Firebase CLI before credentials, verifies the GitHub digest and every packaged byte, then promotes without installing source dependencies, rebuilding frontend bytes, or rematerializing organizer data. |
| `.github/workflows/marketing-website.yml` | Validates marketing source and Storybook accessibility, calls the exact build/promote adapters on matching `main` pushes, then requires production 404 and launch-route postconditions. |
| `.github/workflows/admin-website.yml` | Validates Admin source and live callable dependencies, then calls the exact build/promote adapters for the production `admin` target. |
| `.github/workflows/host-website.yml` | Validates the Host target, standalone roster tests, and Host-owned Flutter surfaces, then builds and promotes the independent production `host` target. |
| `.github/workflows/release-readiness.yml` | Manual staging/prod release gate. |
| `.github/workflows/mobile-beta.yml` | Nightly (when app sources changed) and on-demand fastlane test builds: builds, verifies and uploads each app to TestFlight internal testers or the Play internal track in one job, with build provenance. See Mobile releases. |
| `.github/workflows/mobile-production.yml` | Reviewer-gated fastlane promotion of a build testers already have: App Store review submission or a Play staged rollout, with no rebuild. See Mobile releases. |
| `.github/workflows/observability-evidence.yml` | Manual Crashlytics and Analytics evidence capture. |
| `.github/workflows/website-production-observability.yml` | Best-effort quarter-hour and manual production probes, offset from busy cron boundaries with a sparse checkout of the standalone probe. GitHub scheduling is not a latency SLA. |
| `.github/workflows/branch-hygiene.yml` | Daily semantic branch audit, supervised integrated-ref candidates, and an issue plus failed run for stale code outside `main` without an open PR. |

The Host Website push filter follows its production byte closure explicitly:
Host/runtime source, declared assets and fixtures, production Host Firebase
configuration, the app-target resolver, and the environment wrappers. It must
not use `tool/platform/**`; validator-only and external-store-status changes
belong to CI and must not rebuild or deploy production Hosting.
No production Hosting caller may list `*.test.mjs` in its push filter. Test
changes are validated by CI; they do not alter deployable bytes and therefore
cannot authorize an Admin, Marketing, or Host production promotion.

### Shared iOS dependency policy

Edit `tool/platform/ios/Podfile.template` and
`tool/platform/ios/CatchBuildSettings.xcconfig.template`, then run
`node tool/platform/sync_ios_pod_policy.mjs --write` before native builds. The
Consumer and Host Podfiles and Runner settings are generated verbatim;
their separate Pod lockfiles, plugin graphs and app targets remain independent.
`platform:ios-pod-policy` checks freshness in every selected iOS-native lane,
and the existing compile-codegen catalog selects the same check before commit.
A checkout with current generated files needs no extra generation step.
Generator or template edits retain both iOS validation builds and freshness
checks. The nightly `Mobile Beta` path gate builds new TestFlight builds only
when files under `apps/` or the other app inputs change.

Each generated Podfile contains the complete policy. Do not replace it with a
runtime Ruby import: Flutter's warm-checkout pod-install decision and
CocoaPods' checksum observe the Podfile itself. The generator writes only
changed outputs and never updates dependency locks or installation receipts,
so no-op generation avoids extra installs and failed installs remain pending.
The app's explicit-module setting and the Podfile's pod-target setting apply
to different build targets; both remain required while CocoaPods is in use.

### Dependency maintenance

GitHub-native Dependabot is the sole routine dependency-update service. It
checks npm, Pub, and GitHub Actions each Wednesday, groups compatible minor and
patch updates into at most one open pull request per ecosystem, and keeps
security updates grouped separately. Functions npm updates come on the first of
each month instead, because a merged Functions lockfile change redeploys every
Function that loads a changed package; security updates still open
immediately. Major versions are deliberately excluded:
each major upgrade needs its own impact review and full selected CI evidence.

Dependabot pull requests merge without a click.
`.github/workflows/dependabot-auto-merge.yml` turns on auto-merge for every
Dependabot pull request that is not a major version, so it joins the merge
queue once Required CI passes. It acts as the repository's auto-merge GitHub
App, not the built-in Actions token: GitHub starts no workflows for events
that token causes, and a dependency merge must start `main`'s workflows like
any other. The App has read-and-write Contents, Pull requests and Workflows
permissions (Dependabot also updates workflow files) and is installed on this
repository only; its ID and private key are the Dependabot secrets
`AUTOMERGE_APP_ID` and `AUTOMERGE_APP_PRIVATE_KEY`, because a workflow
Dependabot triggers can read only Dependabot secrets. Without them the
workflow leaves each update for a manual merge.

The 2026-08-10 Pub baseline upgraded every release resolvable under the current
constraints: 74 packages (33 in the Firebase family and 41 in the remaining
Flutter/tooling family). `flutter pub outdated --json` then reported zero
upgradeable packages, zero advisory-affected packages, zero discontinued
packages, and 38 packages blocked by coordinated constraints or major-version
boundaries. Do not describe the `flutter pub get` summary as 38 independent
patches.

iOS remains on CocoaPods. A Consumer simulator experiment with Flutter 3.44.9
resolved and linked Firebase Apple SDK 12.18.0 through SwiftPM with the locked
Maps/Razorpay CocoaPods fallback, but failed permission-policy parity:
`geolocator_apple` 2.3.14 loses the Podfile's
`BYPASS_PERMISSION_LOCATION_ALWAYS=1` define and compiles Always-location code
back into the app. Both architectures reproduced the difference against newly
compiled CocoaPods objects. That Flutter version has no supported per-plugin
opt-out. Revisit when a supported package or fallback preserves this policy;
the upstream [permission-policy issue](https://github.com/Baseflow/flutter-geolocator/issues/1763)
and [proposed fix](https://github.com/Baseflow/flutter-geolocator/pull/1788)
describe the missing support. Before enabling SwiftPM, prove the compiled
permission selector is absent, Firebase has one verified binary distribution
owner, Maps/Razorpay versions and role/flavor settings are preserved, and
Consumer plus Host release builds pass. Keep existing explicit-module settings
until their removal has native proof.

`tool/app_targets.json#appleNativeDependencies` binds the checked-in
`firebase_core` and `cloud_firestore` Flutter versions to the Firebase Apple SDK
used by all four iOS/macOS Podfiles and lockfiles. The app-target structural
gate fails before native compilation when a compatible Pub update changes one
side without regenerating the CocoaPods graphs.

## Git Branch Hygiene

Treat PR branches as single-use. After a PR branch is merged into `main`, do
not keep committing to that same branch for the next slice of work. GitHub adds
a merge commit to `main`, and a reused branch can look locally ahead while still
missing the new `origin/main` merge commit. That produces repeat PR conflicts
and huge compare diffs.

Before staging or opening a PR:

1. Run `git fetch origin main`.
2. Check `git rev-list --left-right --count origin/main...HEAD`.
3. If the first number is not `0`, the current branch is behind `origin/main`;
   start a fresh `codex/<task>` branch from `origin/main` or rebase before new
   work.
4. If the branch already has a merged or conflicted PR, prefer a fresh branch
   from `origin/main` and cherry-pick only the still-needed commits.

Do not trust stale local `main` for this check. Use `origin/main` as the source
of truth, and close any superseded conflicted PR after the replacement branch is
published.

Push a new branch as soon as it is created; local-only branches and stashes are
not preservation. Before a rebase, reset, amend, or conflict-heavy merge, create
and push a dated `backup/` ref. Do not rewrite a branch with a shared upstream.
For reconciliation merges touching more than 50 paths, run
`node tool/git/audit_merge_drops.mjs` with the base, both sides, and merged result
and require explicit discard receipts. After a squash merge is verified on
`origin/main`, delete the single-use branch and prune tracking refs.

### Daily orphan-branch detection

GitHub's repository-level delete-after-merge setting is enabled, but it only
removes the exact PR head. `.github/workflows/branch-hygiene.yml` evaluates the
remaining gap every day. It fetches all refs, reads current PR state, and uses
`git:branch-hygiene` to report strong semantic proofs: the tip is an ancestor of
`main`, its exact tree exists in `main` history, its exact tip belongs to a
merged PR whose merge is in `main`, or every path changed by the branch has the
same final Git identity in `main`. Open-PR branches and unique-looking branches
never become cleanup candidates.

A branch gets seven days to acquire a PR or integration proof. After that, the
workflow updates one GitHub issue, uploads the complete audit as an expiring
artifact, and fails. The workflow has read-only repository contents permission;
candidate deletion remains a supervised operation. This is the deployment-loss
alarm: routine CI proves code on `main`, while branch hygiene proves that old
code is not silently living only on a forgotten ref.

```sh
node tool/git/branch_hygiene.mjs --base origin/main --remote origin --json
node tool/git/branch_hygiene.mjs --base origin/main --local --json
```

## GitHub Environments And Auth

Firebase deploy and data-validation workflows use GitHub OIDC rather than
long-lived service-account JSON secrets. Use GitHub Environments named `dev`,
`staging`, `prod-hosting`, `prod-mobile`, `backend-review`, `prod-backend`, and `prod`. `prod-hosting` is
approval-free and limited to the automatic web Hosting workflows and the
main-only `Next Website Preview` and `Next Website Promotion` workflows. The preview builds a commit
of main (its `source_sha` input, or main's head) that is not older than live and
has its own successful CI and exact-source captures. It builds without cloud credentials,
and verifies the tested container archive before OIDC deployment to the fixed
preview service/channel. Its scale-to-zero runtime has a one-instance cap and
uses only the existing Firestore read-only web identity; it cannot publish the
live Hosting channel. The separate promotion workflow accepts only a successful
preview, releases that preview's own source, verifies the tested image and Hosting
bytes before OIDC, preserves the prior live version, tests an expiring production
channel and clones that exact Hosting version to live. It shares the marketing
Hosting lock; the legacy promoter checks actual live runtime ownership and
skips static mutation after Next takes over. See `docs/web_surface_architecture.md`
for the preview, production limits, rollback and acceptance contracts, and
[Website rollback to the static Vite build](#website-rollback-to-the-static-vite-build)
for the operator steps. `prod-mobile` is approval-free and `main`-only; it contains
only mobile signing, Maps, App Store Connect, and Play-publisher credentials, and
`Mobile Beta` checks the ref again before building. `prod-mobile-release` holds
the same store credentials for `Mobile Production` and requires a reviewer's
approval; see [Mobile releases](#mobile-releases). `prod-backend` served only the
retired Delivery workflow and is now unused; `Deploy backend` deploys prod
through `prod`. The `prod-backend` OIDC provider binds the immutable repository and owner IDs, ref,
environment, caller workflow, reusable workflow, and automatic event type; both
workflow paths are compared with the token's own repository name, never a
hardcoded one. It reuses the existing deployment identity; it does not add
project permissions. That identity's federation grant is restricted to the
`attribute.repository_environment` values `1170579691:prod`,
`1170579691:prod-hosting`, and `1170579691:prod-backend`. The older production
provider accepts only main jobs in `prod`, `prod-hosting`, or `prod-mobile` from
repository `1170579691`. Every provider and grant uses immutable IDs, so renaming
or transferring the repository or its owner cannot break deployment sign-in
(CAT-210).

Shared `prod` has no required reviewers. The owner removed them on 30 Oct 2026,
before launch, while all production data is synthetic: the approval only
delayed deploys. `Deploy backend` prod runs and `Website Release` promotions
now proceed automatically, as do manual dispatches that use `prod`. CI, the
merge queue, dev deploying first and the readiness preflight remain the
checks. To restore a human gate (for example at launch), add a required
reviewer to `prod` in the repository's environment settings; both workflows
then wait for approval again with no code change. `Mobile Production` keeps
its own reviewer on `prod-mobile-release`.

Functions pull requests complete Required CI after the selected automated
validation; CI no longer creates or requires the credential-free
`backend-review` job. That environment no longer has required reviewers; its
identity, `refs/pull/*/merge` branch policy and prohibition on administrator
bypass remain.

Dev and prod run independently, one deploy per environment at a time.

Reviewer-protected `prod` may still hold duplicate mobile secrets from the
GitHub iOS cutover. No mobile workflow reads them; the owner may delete them.

Each Firebase deployment environment must define these variables:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT_EMAIL`

The corresponding Google Cloud service accounts are:

- `github-actions-deploy@catchdates-dev.iam.gserviceaccount.com`
- `github-actions-deploy@catchdates-staging.iam.gserviceaccount.com`
- `github-actions-deploy@catch-dating-app-64e51.iam.gserviceaccount.com`

Do not add `FIREBASE_SERVICE_ACCOUNT_*` JSON secrets unless the OIDC setup is
intentionally retired.

### Dedicated form upload identity

`createOrganizerFormAssetIntent` runs as `catch-form-upload@` using Firebase's
project-relative service-account shorthand. Provision this account separately
in dev, staging, and prod before deploying the function. `getOrganizerFormResponseDetail` runs as the separate `catch-form-review@`
identity to sign private photo viewing links. Other functions retain their
existing identities. Never fix form signing by granting the shared Compute
runtime identity permission to sign as itself.

The dedicated account has `roles/datastore.user` to validate draft/version
records and transactionally record upload intents/rate limits; Firestore IAM
cannot scope this to individual collections. Existing callable authorization,
App Check, draft-token, question-type, size and MIME validation remain enforced.
Its Storage permission is only `roles/storage.objectCreator` on that environment's
default bucket: it cannot list, read, delete or overwrite existing objects.
The separate review identity gets `roles/storage.objectViewer` on that bucket
and `roles/datastore.user` for response ownership checks and rate-limit writes.
It can read/list objects but cannot create, overwrite or delete them; private
links are issued only after organizer-manager and asset ownership validation.
Each signed POST policy fixes the server-selected `organizerForms/` object key,
MIME type, size bound, metadata, and 15-minute expiry. The IAM create grant is
bucket-scoped, not folder-scoped: existing buckets use fine-grained ACLs, so this
repair does not enable uniform bucket access or change their existing policies.

Custom role `catchFormUploadSigner` contains only `iam.serviceAccounts.signBlob`
and is bound on each dedicated account only to itself. Signing can also produce tokens
as that same narrowly privileged account. The existing `github-actions-deploy`
identity gets `roles/iam.serviceAccountUser` on this account for deployment.
Custom role `catchFormUploadIamInspector` gives that deploy identity only
`iam.roles.get` and `iam.serviceAccounts.getIamPolicy` at project scope so the
readiness gate can verify the IAM setup. It grants metadata reads, not signing,
IAM mutation, secret access, or application-data access.
No keys or secrets are created, and no Editor/Owner/Token Creator grant is added.

The same prerequisite checks IAM Credentials API enablement and browser POST
CORS. Provisioning preserves unrelated CORS rules and adds only POST for
`https://catchdates.com` and `https://www.catchdates.com` in production, or the
selected project's `web.app` and `firebaseapp.com` origins in dev/staging.
No wildcard or localhost origin is added. CORS permits the browser to read the
upload response; it does not replace the signed policy or make objects public.

```sh
node tool/firebase/form_upload_identity.mjs --env dev
node tool/firebase/form_upload_identity.mjs --env dev --apply
node tool/firebase/form_upload_identity.mjs --env dev --purpose review --apply
node tool/firebase/form_upload_identity.mjs --env prod
node tool/firebase/form_upload_identity.mjs --env prod --apply --allow-prod
node tool/firebase/form_upload_identity.mjs --env prod --purpose review --apply --allow-prod
```

Default mode reads metadata and prints exact missing grants. Apply mode adds
only those grants and verifies the result; unexpected extra roles or delegation
fail closed without removal. Provisioning requires explicit IAM authorization.
The existing environment-readiness gate checks this identity before deploying
`createOrganizerFormAssetIntent` and `getOrganizerFormResponseDetail`
(including full Functions deployments), so a
missing account, signing grant, bucket access, database access, deployment
attachment permission, or unreadable policy blocks deployment. Provisioning
runs under an authorized operator; CI checks metadata and does not change IAM.

Rollback the function through the normal source delivery path before removing
its dedicated account grants. Removing the self-signing binding disables new
signed uploads; previously issued upload policies can remain valid until expiry.

### Read-only Marketing snapshot identity

Marketing production packaging reads two bounded organizer-listing JSON inputs
from production Firestore before the Vite build. That read is intentionally
separate from both the uncredentialed build job and the Hosting deploy identity.
Target state: the `prod-hosting` environment must define:

- `GCP_WEB_HOSTING_READONLY_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_WEB_HOSTING_READONLY_SERVICE_ACCOUNT_EMAIL`

The production values are the existing provider
`projects/574779808785/locations/global/workloadIdentityPools/github-actions/providers/catch-dating-app`
and the dedicated service account
`github-actions-web-reader@catch-dating-app-64e51.iam.gserviceaccount.com`.
The service account's only project role must be `roles/datastore.viewer`; do not
grant it Hosting, Functions, Rules, Storage, Secret Manager, or Firestore write
authority. Its impersonation policy must be narrower than the shared provider:
only `principalSet://iam.googleapis.com/projects/574779808785/locations/global/workloadIdentityPools/github-actions/attribute.repository_environment/1170579691:prod-hosting`
(the immutable repository ID plus the `prod-hosting` environment) may use it.

Live state verified on 2026-08-08: the dedicated service account has only
`roles/datastore.viewer` and no user-managed keys. CAT-210 (2026-10-22) added
the ID-based `prod-hosting` binding above and retires the earlier name-based
subject after the organization transfer. Both GitHub
Environment variables are present with the expected provider and service
account values. The first main proof completed successfully in Marketing run
`31254427583`: the environment-scoped job authenticated, materialized the two
bounded Firestore listing inputs, removed its credentials, and handed only the
snapshot artifact to the uncredentialed build job.

Provision and reproduce that boundary with:

```sh
gcloud iam service-accounts create github-actions-web-reader \
  --project=catch-dating-app-64e51 \
  --display-name='GitHub Actions Web Hosting Read-Only Snapshot' \
  --description='Read-only Firestore materialization for prod-hosting web builds'

gcloud projects add-iam-policy-binding catch-dating-app-64e51 \
  --member='serviceAccount:github-actions-web-reader@catch-dating-app-64e51.iam.gserviceaccount.com' \
  --role='roles/datastore.viewer' \
  --condition=None

gcloud iam service-accounts add-iam-policy-binding \
  github-actions-web-reader@catch-dating-app-64e51.iam.gserviceaccount.com \
  --project=catch-dating-app-64e51 \
  --role='roles/iam.workloadIdentityUser' \
  --member='principalSet://iam.googleapis.com/projects/574779808785/locations/global/workloadIdentityPools/github-actions/attribute.repository_environment/1170579691:prod-hosting'

gh variable set GCP_WEB_HOSTING_READONLY_WORKLOAD_IDENTITY_PROVIDER \
  --env prod-hosting \
  --body 'projects/574779808785/locations/global/workloadIdentityPools/github-actions/providers/catch-dating-app'

gh variable set GCP_WEB_HOSTING_READONLY_SERVICE_ACCOUNT_EMAIL \
  --env prod-hosting \
  --body 'github-actions-web-reader@catch-dating-app-64e51.iam.gserviceaccount.com'
```

Before merging a workflow that requires this identity, verify the service
account's project roles, its exact impersonation principal, and both GitHub
environment variables. A repository-wide principal is not an acceptable
substitute for the environment-scoped attribute.

## Cloudflare edge for catchdates.com

catchdates.com's DNS already lives on Cloudflare (`byron`/`carioca.ns.cloudflare.com`), with the apex A record and `www` CNAME set to DNS-only. Proxying them puts the Cloudflare free plan in front of the site:

- Bot Fight Mode;
- Cloudflare's AI-crawler block;
- a managed challenge for scripted clients (curl, Python, headless Chrome and similar) on organizer, event and explore pages;
- one rate-limit rule: 40 requests per 10 seconds per IP on organizer, event and preview-card paths.

Verified search engines and link-preview fetchers pass. robots.txt stays ours (`website/app/robots.ts`), not Cloudflare's managed one.

`tool/cloudflare/edge_policy.json` is the desired state, and `tool/cloudflare/apply_edge_policy.mjs` applies it. A run without `--apply` only reads and prints the plan. Rules whose description lacks the `catch-edge: ` prefix are kept exactly as they are.

Token, created by the zone owner in the Cloudflare dashboard:
- **Scope:** zone `catchdates.com` only.
- **Permissions:** Zone Settings Edit, DNS Edit, Zone WAF Edit, Bot Management Edit, and Zone Read.

```sh
CLOUDFLARE_API_TOKEN=... node tool/cloudflare/apply_edge_policy.mjs           # plan
CLOUDFLARE_API_TOKEN=... node tool/cloudflare/apply_edge_policy.mjs --apply   # make it so
CLOUDFLARE_API_TOKEN=... node tool/cloudflare/apply_edge_policy.mjs           # expect 0 changes
```

TLS goes to Full (strict) before any record is proxied. Firebase Hosting already holds a certificate for both names, and it renews through the HTTP challenge, which still reaches Firebase through the proxy.

After applying, verify:
1. `curl -sI https://catchdates.com` shows a `cf-ray` header and a 200.
2. A shared organizer link still previews in WhatsApp, Instagram, X and LinkedIn.
3. Google Search Console's URL inspection fetches an organizer page.
4. `curl -s -o /dev/null -w '%{http_code}' https://catchdates.com/organizers/` returns a challenge (403), while a browser loads the page.
5. Sign-in, checkout and the forms still work.

The production Firebase hosts (`catch-dating-app-64e51.web.app` and `.firebaseapp.com`) would otherwise bypass Cloudflare. The production website therefore answers them with a 301 to catchdates.com, except Firebase's `/__/` Auth handlers and `/api/`. Preview channels are not redirected.

**Rollback:** set the two records back to DNS-only in the dashboard (or `PATCH` `proxied: false`). The site then serves directly from Firebase Hosting again. The Bot Fight Mode and rule settings can stay; they only act on proxied traffic.

### Release and monitoring checks behind the edge

Bot Fight Mode answers GitHub-hosted runners with 403 on every catchdates.com path. Runners run on data-centre addresses, and on the free plan no WAF rule can let a request past Bot Fight Mode ([#1272](https://github.com/torana-labs/catch-dating-app/issues/1272)). Real visitors are not affected. So the automated checks don't read pages through the public domain. `website/scripts/next/liveOriginCheck.mjs` checks each leg of a visitor's path on its own:

- **Origin:** `https://catch-dating-app-64e51.web.app/api/public-catalog` must answer 200, uncached, with the expected `x-catch-release`. That host skips its canonical redirect only for `/api/` and `/__/`, so this reads what live Hosting serves without passing through Cloudflare.
- **Redirect:** every page on the Firebase host must still answer 301 to catchdates.com, so the host never becomes a way round Cloudflare.
- **Edge:** catchdates.com must answer through Cloudflare (`server: cloudflare` and a `cf-ray`). A 200 must carry the same release; a Cloudflare 403 counts as "edge up".

`Next Website Promotion` runs this check after cloning to live, with up to 18 attempts for the new release to reach the origin. It runs main's copy of the script, not the release's. The pages themselves are proven before that, on the `next-release` channel with the same Hosting version. `Website Production Observability` runs the same check every 15 minutes, accepting any release.

These checks don't prove that a visitor at catchdates.com sees correct page content. Cloudflare passes HTML through uncached (`cf-cache-status: DYNAMIC`), so the origin and the edge serve the same pages, but nothing automated checks that end to end. To check it by hand, from a machine Cloudflare lets through, run `node website/scripts/probeProduction.mjs --json`.

**Long-term fix: Cloudflare Pro.** Pro's Super Bot Fight Mode, unlike the free Bot Fight Mode, can be skipped by a WAF custom rule. A rule that skips it for requests carrying a secret probe header, with the secret held in GitHub, would let promotion and monitoring check the real public pages again while the bot protection stays on for everyone else.

## Custom form domain onboarding

The trusted operator command is `node tool/firebase/form_domain_operator.mjs`.
It defaults to status and read-only plans. A future client supplies a dedicated
subdomain and controls its DNS; no client domain is required to ship this tooling.
Source/CI acceptance does not establish a deployed website, provider readiness or
successful browser submission for a particular client.

Before onboarding, deploy the reviewed Functions and marketing website through
the normal release process. The selected environment must have exactly one
`.firebaserc` marketing Hosting target and matching Firebase web configuration.
There is no fallback to the production site when dev/staging are unmapped.
Set the non-secret GitHub environment variable `FORM_DOMAIN_CNAME_TARGET` to
that site's `<site-id>.web.app` in every environment that promotes its backend
(`prod` for production). The promotion provenance and deploy
copy both receive this value; blank keeps manager-callable reservations disabled.
This command does not change GitHub variables or deploy anything.

Use operator Application Default Credentials with the selected project's
Firestore access, project/Hosting metadata and domain provisioning permissions,
Identity Platform configuration, App Check configuration read, Enterprise key
read/update, and upload-bucket CORS read/update permissions. Do not use a browser
session or place credentials in arguments. Build the Functions modules from the
reviewed checkout before running the CLI:

```sh
bash tool/git/bootstrap_worktree.sh --target functions
npm --prefix functions run build
node tool/firebase/form_domain_operator.mjs \
  --env prod --hostname forms.client.example
```

`forms.client.example` is a placeholder, not an activation target. Use the
client's exact lowercase ASCII subdomain. The command rejects reserved Catch and
provider domains. It verifies the configured live project number and marketing
site; inspect the deployed website release and its public Enterprise site key
separately. The key must match that web app's App Check binding. Never substitute
a debug token for `--site-key`.

Run each action as a read-only plan first. Every mutation needs `--apply`, and
production also needs `--allow-prod`. All actions except status require exact
`--organizer-id`, `--form-id`, and `--requested-by-manager` UID. This UID is the
current manager on whose behalf the operator acts; it does not authenticate the
operator. ADC authenticates the operator independently. Keep one operator and
console writer at a time for shared Auth/Enterprise configuration; those APIs
provide no compare-and-swap protection. Bucket CORS updates use metageneration.

1. `--action reserve` requires an owned, published form. On apply, record the
   returned generation, TXT challenge and expected CNAME. Configure those DNS
   records through the client's DNS owner. Preserve the TXT proof after activation.
2. `--action verify --generation <generation>` reads public DNS itself. The
   pending reservation expires after 48 hours; expired or revoked reservations
   need a new reservation/challenge, never reuse an old generation.
3. `--action provision --generation <generation>` creates only the exact missing
   Hosting custom domain. Existing domains are never repointed or deleted. Follow
   Hosting's `requiredDnsUpdates` from status, then rerun status until ownership,
   Hosting and the unexpired certificate are active. Operation completion alone
   does not prove TLS readiness. Catch's TXT and exact CNAME must also remain valid.
4. `--action prepare-origins --generation <generation> --site-key <public-key>`
   adds only this hostname to Auth and the bound Enterprise key, and its HTTPS
   origin to upload CORS. It preserves unrelated entries and refuses allow-all
   Enterprise keys. Capacity exhaustion requires a separate key/site decision.
5. `--action activate --generation <generation> --site-key <public-key>` rereads
   Hosting, DNS and origin configuration. One Firestore transaction checks the
   unchanged reservation, current manager and published form before enabling
   routing. A read-only plan does not claim activation.
6. Complete browser acceptance on the actual hostname: TLS, correct published
   tenant/form, anonymous Auth/App Check, file upload if configured, successful
   submission and expected confirmation. Check that an unrelated hostname and a
   revoked binding cannot resolve this tenant. This is a separate live check;
   local transport fixtures cannot establish it.

On a timeout or unknown provider response, read status before retrying; a failed
command may have changed one provider field. The adapters re-read and converge
on exact existing entries rather than clearing shared configuration. Never infer
success from a previous plan or a Hosting operation handle.

Rollback uses `--action revoke --generation <generation>` first, then
`--action remove-origins --generation <generation> --site-key <public-key>`.
Both retain the exact organizer/form and manager arguments and apply guards.
Revocation immediately disables registry routing even if the form is unpublished.
The CLI first verifies live project/Hosting metadata. If that API is unavailable,
a currently authorized manager can use the deployed App Check-protected
`manageOrganizerFormDomain` callable with `{action: "revoke", hostname,
organizerId}`; it checks current manager authority and writes Firestore without
Hosting API access. Confirm the callable result and registry state before
resuming provider cleanup. Do not bypass authentication/App Check or claim a
failed CLI command revoked routing.
Origin removal preserves unrelated entries and reports inherited parent-domain,
wildcard CORS and other same-host origins that can retain provider trust. Do not
claim all provider trust is removed when `providerTrustRemoved` is false. Hosting
resource deletion and client DNS removal are separate explicit operator actions;
this command never deletes the Hosting domain. Reassignment requires a fresh
reservation and DNS proof after coordinating remaining provider/DNS ownership.

## Public Provider IDs and Server-Side Search Secrets

`ALGOLIA_APPLICATION_ID` and `RAZORPAY_PUBLIC_KEY_ID` identify the provider
account; they are plain Firebase `defineString` parameters. Store them as
GitHub environment variables for `dev`, `staging` and `prod`. `Deploy backend` writes
validated values into the disposable Functions `.env.<project-id>` before
Firebase discovers its parameters. Missing or invalid IDs fail deployment.

The deploy materializer also writes `EVENT_ASSISTANCE_RCS_ENABLED`,
`EVENT_ASSISTANCE_RCS_WEBHOOK_ENABLED`, and
`EVENT_ASSISTANCE_SMS_REPORTS_ENABLED` from the selected GitHub environment's
variables, defaulting each to `false`. Source `default: false` declarations do
not satisfy non-interactive Firebase parameter discovery. These values neither
activate dormant exports nor establish messaging consent, sender authority, or
provider readiness. Enabling a channel remains a separate reviewed operation.

`firebase:params-coverage` parses every authored non-secret Functions parameter
and rejects declarations missing from the materializer. Functions CI runs this
check and its regression tests. Promotion additionally checks the exact approved
source against the generated deploy-copy dotenv file before the first ordered
mutation, including when draining historical immutable packages. SecretParams
remain in Secret Manager. Missing parameter or secret errors stop immediately;
only other Function batch failures retain the bounded retry policy.

The parameter names deliberately differ from the older `ALGOLIA_APP_ID` and
`RAZORPAY_KEY_ID` SecretParams, allowing historical immutable packages to run
without an environment-variable/secret-name collision. Keep those legacy
Secret Manager versions until the historical queue and replacement runtime
verification are complete; switching source declarations alone does not retire
live secret versions or their charges.

For an explicit local deployment, provide the same environment's public IDs
to `tool/firebase/prepare_functions_params_for_deploy.mjs --functions-dir
functions --project <project-id>`, then use the environment wrapper. Its output
file is ignored and permission-restricted. Never put a search, write, payment,
or webhook credential in this file.

Explore search keeps `ALGOLIA_SEARCH_API_KEY` and `ALGOLIA_WRITE_API_KEY` in
Firebase Secret Manager. Use one Algolia application per Firebase environment
so data, analytics, write keys, and emergency rotations stay isolated:

| Firebase project | Algolia app |
|---|---|
| `catchdates-dev` | `Catch Dev` |
| `catchdates-staging` | `Catch Staging` |
| `catch-dating-app-64e51` | `Catch Prod` |

Use a search-only key for runtime search and a write-capable key for index
triggers and backfills. Rotate one environment at a time, selecting that
project's matching keys. Do not loop over all projects with one account's key
material:

```sh
search_project=catchdates-dev
printf "Algolia search-only API key: "
stty -echo
IFS= read -r ALGOLIA_SEARCH_API_KEY
stty echo
printf "\nAlgolia write API key: "
stty -echo
IFS= read -r ALGOLIA_WRITE_API_KEY
stty echo
printf "\n"
printf "%s" "$ALGOLIA_SEARCH_API_KEY" |
  firebase functions:secrets:set ALGOLIA_SEARCH_API_KEY \
    --project "$search_project" --data-file -
printf "%s" "$ALGOLIA_WRITE_API_KEY" |
  firebase functions:secrets:set ALGOLIA_WRITE_API_KEY \
    --project "$search_project" --data-file -
unset ALGOLIA_SEARCH_API_KEY ALGOLIA_WRITE_API_KEY
firebase functions:secrets:get ALGOLIA_SEARCH_API_KEY --project "$search_project"
firebase functions:secrets:get ALGOLIA_WRITE_API_KEY --project "$search_project"
```

Index names default to `organizers` and `events`. Only override them with
`ALGOLIA_ORGANIZERS_INDEX` or `ALGOLIA_EVENTS_INDEX` if an environment needs
different index names. `ALGOLIA_ORGANIZERS_INDEX` is a temporary compatibility
fallback and must not be used in new environment configuration. These are not
secrets.

Backfill after first setup or after changing searchable data shape:

```sh
ALGOLIA_APP_ID="<env app id>" \
ALGOLIA_WRITE_API_KEY="<env write key>" \
node tool/data/backfill_algolia_explore_search.mjs \
  --env prod \
  --apply \
  --allow-prod
```

For dev or staging, change `--env` and omit `--allow-prod`.

Algolia index settings must allow the function filters:

- Organizers index: make `location` filterable/facetable.
- Events index: make `discoveryCityName` filterable/facetable and store
  `startTimeEpoch` as a numeric attribute.

## Cross Paths Suggestion Signing And Expiry

The server-owned `getCrossPathsSuggestions` callable binds one environment-
specific Firebase Secret Manager value:

- `CROSS_PATHS_SUGGESTION_SIGNING_KEY`

Use at least 32 random bytes, encoded as a secret string, and use different
material in dev, staging, and prod. Rotating it intentionally invalidates every
outstanding ten-minute suggestion token. Never place the value in Remote
Config, a client build, repository files, or CI logs. Verify secret metadata
without printing the value before deploying the callable. The source-intended
runtime service account must hold `roles/secretmanager.secretAccessor` on the
individual secret. Readiness verifies the selected numeric version and that
explicit secret-level grant before deployment, then compares the observed runtime
identity/binding. It does not assume the default compute identity or prove
absence of inherited access.

Configure a Firestore TTL policy on
`crossPathsSuggestionExposures.expiresAt` in every environment. The callable
writes a 30-day expiry, but the field does not delete
documents by itself until that environment policy exists. Account deletion
independently deletes exposure receipts involving the member.

### Mumbai selected-event pilot

Cross Paths is a shipped client capability. Its temporary Remote Config
rollout switches were retired after the production QA activation on
2026-08-10 so an environment fetch failure or forgotten template cannot hide
the feature. Every real event must have Admin-owned
`crossPathsDiscoveryEnabled: true`, and the backend accepts
that switch only for an active event at least six hours away in canonical
market `in-mh-mumbai`. At most three upcoming events may be selected. Pair
inventory additionally requires an organizer-authored admission policy and
server-owned capacity validation.

Use this rollout order:

1. Keep the published privacy policy and per-event consent copy aligned with
   the exact product behavior; obtain independent legal review before selecting
   the first real-member event.
2. Select 2–3 eligible upcoming Mumbai events in Admin with an audit note.
3. Onboard 20–50 real members through the normal user-controlled global and
   per-event consent actions; never seed or backfill affirmative consent.
4. Curate the Mumbai showcase queue through the score-free human checklist.
5. Prove eligible-supply, exposure, invitation-abuse, cancellation, safety,
   and support monitoring.
6. Monitor the live client surfaces and enable real discovery only by
   selecting an eligible event after consent/supply evidence is sufficient.
7. Enable pair inventory per event only when that organizer deliberately
   reserves capacity and the event remains eligible.

Rollback is additive and fail-closed: disable selected event switches if
necessary. Turning off an event switch
invalidates pending invitations but preserves an explicitly accepted plan.
Consent controls remain available so members and support can revoke or inspect
consent; never use rollback to rewrite consent history.

Production QA was activated on 2026-08-10 with one hidden, synthetic Mumbai
event, one fictional test-phone viewer, two synthetic opted-in showcase
profiles, and exact read-back of all eleven fixture documents. No real event
or real member was opted in or exposed. The client surfaces are live; real
discovery remains empty until Admin selects an eligible real Mumbai event and
real members make both consent choices themselves.

## Event Venue Session Signing And Expiry

The live Host check-in QR binds one environment-specific Firebase Secret
Manager value:

- `EVENT_VENUE_SESSION_SIGNING_KEY`

Use at least 32 random bytes and different material in dev, staging, and prod.
Rotation intentionally invalidates every outstanding live QR. Never expose the
value to Remote Config, clients, repository files, or CI logs. The Functions
runtime service account needs `roles/secretmanager.secretAccessor` on this
individual secret.

The reviewed defaults are a 90-second lifetime and refresh after 60 seconds.
Deployments may set `EVENT_VENUE_SESSION_TTL_SECONDS` from 30 through 300 and
`EVENT_VENUE_SESSION_REFRESH_SECONDS` from 10 through 240; refresh must remain
strictly less than lifetime or both values fall back to the reviewed defaults.
Firestore TTL must be enabled on `expiresAt` for `eventVenueSessions` and
`eventVenueSessionRedemptions`.

## Required Secrets

Build workflows need environment-specific Google Maps SDK secrets. Do not rely
on a generic fallback secret, because that can silently mix project keys across
flavors:

- `GOOGLE_MAPS_ANDROID_API_KEY_DEV`
- `GOOGLE_MAPS_ANDROID_API_KEY_STAGING`
- `GOOGLE_MAPS_ANDROID_API_KEY_PROD`
- `GOOGLE_MAPS_IOS_API_KEY_DEV`
- `GOOGLE_MAPS_IOS_API_KEY_STAGING`
- `GOOGLE_MAPS_IOS_API_KEY_PROD`

`Mobile Beta` needs these `prod-mobile` environment secrets for iOS (`Mobile
Production` needs only the three App Store Connect secrets):

- `APP_STORE_CONNECT_API_KEY_ID`
- `APP_STORE_CONNECT_API_ISSUER_ID`
- `APP_STORE_CONNECT_API_KEY_BASE64`
- `IOS_CI_DEVELOPMENT_CERTIFICATE_P12_BASE64`
- `IOS_CI_DEVELOPMENT_CERTIFICATE_PASSWORD`
- `GOOGLE_MAPS_IOS_API_KEY_PROD`

`APP_STORE_CONNECT_API_KEY_BASE64` is the base64-encoded contents of the
downloaded `AuthKey_<key-id>.p8` file. Keep the raw `.p8` out of git; it is
ignored by `.gitignore` and should live only in secure local storage and GitHub
Actions secrets.

The reusable iOS archive identity is a dedicated Apple Development certificate,
not a personal signing identity. Store its encrypted PKCS#12 payload and
password in the two `IOS_CI_DEVELOPMENT_CERTIFICATE_*` secrets. No workflow
reads the older `IOS_CI_DEVELOPMENT_CERTIFICATE_ID`, `_SHA256` and `_EXPIRES_AT`
variables any more.

The iOS beta lane imports that identity into fastlane's temporary CI keychain
(`setup_ci` and `import_certificate`) and deletes the decoded PKCS#12 and the
materialized App Store Connect key when the lane ends. Keep Xcode archive
signing automatic and keep `-allowProvisioningUpdates`; the persistent private
key prevents a clean runner from asking Apple to create another development
certificate, while Xcode can still create or repair role-specific profiles.
fastlane does not check the certificate's expiry, so track it in the Apple
Developer portal.

Rotate the CI identity before it expires by creating one replacement
certificate/private-key pair, importing the replacement PKCS#12 locally to
prove it is a usable code-signing identity, updating both secrets, and running
`Mobile Beta` for iOS for both apps. Re-query Apple certificates and
profile relationships after the run. Revoke the old CI certificate only after
both roles process successfully with the replacement and no new certificate id
appears. Never auto-revoke the active CI certificate at job teardown.

The `Mobile Beta` Android job requires these `prod-mobile` environment secrets:

- `ANDROID_UPLOAD_KEYSTORE_BASE64`
- `ANDROID_UPLOAD_STORE_PASSWORD`
- `ANDROID_UPLOAD_KEY_ALIAS`
- `ANDROID_UPLOAD_KEY_PASSWORD`
- `GOOGLE_MAPS_ANDROID_API_KEY_PROD`

Play publishing in `Mobile Beta` and `Mobile Production` uses the existing
GitHub OIDC provider plus the environment variables
`GCP_WORKLOAD_IDENTITY_PROVIDER` and `GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL`;
`google-github-actions/auth` writes the short-lived credentials file fastlane
`supply` reads. Play App Signing enrollment remains an owner-controlled Play
Console prerequisite because the Publisher API cannot prove it before the first
bundle exists. Do not add a long-lived Google Play JSON key.

As of 2026-07-11, `androidpublisher.googleapis.com` is enabled and
`github-actions-play-publisher@catch-dating-app-64e51.iam.gserviceaccount.com`
exists with zero project roles. Its only IAM binding is
`roles/iam.workloadIdentityUser` for
`principalSet://iam.googleapis.com/projects/574779808785/locations/global/workloadIdentityPools/github-actions/attribute.repository_environment/1170579691:prod-mobile`
(CAT-210 replaced the earlier name-based subject). On 2026-10-29 a second
member was added for the `prod-mobile-release` environment that
`Mobile Production` uses; see [Mobile releases](#mobile-releases). Play Console must
still invite that identity separately, scoped to the two app records and only
read-app plus testing-track release permissions.

Testers for each app belong on its Play `internal` track. The retired `qa`
closed-testing track is no longer used.

## Deploy Backend

`Deploy backend` (`.github/workflows/backend-deploy.yml`) is the one path from
`main` to each environment's Firebase backend: Firestore indexes, Functions,
Firestore rules and Storage rules. Hosting and app releases stay separate.

How a run works:

- Each environment records the commit it last received as a successful GitHub
  deployment with task `deploy:backend`. To see the newest, run
  `gh api 'repos/torana-labs/catch-dating-app/deployments?environment=prod&task=deploy:backend&per_page=1' -q '.[0].sha'`.
  A run whose commit doesn't contain the recorded one deploys nothing, so a
  re-run of an older commit never replaces a newer one. A failed run leaves the
  record unchanged.
- A run deploys its own exact commit. The job builds Functions, materializes
  non-secret parameters from the environment's GitHub variables, and packages
  Functions as Firebase codebases with
  `functions/scripts/build-deploy-codebases.cjs`. It splits the exports of
  `functions/src/index.ts` by top-level source folder into the codebases listed
  in `functions/deploy-codebases.json`. Each codebase holds:
  - the setup statements of `index.ts` (global options, Admin SDK start-up);
  - an entry whose exports each load their module on first read, so a cold
    instance loads only the Function Cloud Run calls;
  - only the compiled files its Functions load, traced by esbuild, plus the
    Operations runtime when one of them reads files beside itself;
  - `package.json` and `package-lock.json` cut down to the packages that code
    imports and their dependencies;
  - only the `.env` lines whose keys that code names.

  Every exported folder must belong to exactly one codebase; the script fails
  on a new or stale folder, or on code that reads `process.env[...]` by a
  computed name. Dormant Functions are left out.
- The Firebase CLI hashes each codebase's files, its parameters and each
  Function's secret versions, stores the hash on the Function, and skips every
  Function whose hash matches. So a change redeploys only the codebases whose
  files changed. A change to shared code redeploys every codebase that loads
  it. A dependency bump redeploys the codebases that import the package. A
  changed variable redeploys the codebases that read it. The CLI runs up to 40
  updates at once and retries Google's rate limits itself.
- Order: readiness check, Firestore indexes (then wait until `READY`),
  Functions, callable-invoker sync and the parity check
  (`tool/deploy_firebase_targets.sh --functions-postconditions-only`),
  Firestore and Storage rules, then the rules drift check. Indexes and rules
  deploy every run; the CLI leaves them unchanged when they match.
- If the Functions deploy fails, the job retries once with plain `functions`.
  Everything that deployed the first time now matches its hash and is skipped,
  so only the failed Functions rebuild.
- Firebase predeploy test hooks are skipped because required CI already ran
  them on that commit.

When it runs:

- **Dev:** every merge to `main` that touches backend inputs deploys to dev
  automatically.
- **Prod:** deploys the same commit automatically once dev succeeds.
- **Staging:** refreshes on the first of each month at 02:17 UTC.
- **One deploy per environment at a time.** Newer runs wait, and GitHub keeps
  only the newest waiting run. Skipping intermediate commits loses nothing,
  because the CLI compares against what is live.
- **Manual runs:** use Actions → Deploy backend → Run workflow for `prod`, `dev`
  or `staging`. Tick `full` to redeploy every Function even when unchanged, for
  example after a manual deploy you are unsure about. It names every codebase,
  which turns off the CLI's skip.
- **Configuration changes:** a changed GitHub variable reaches the codebases
  that read it on the next run. To apply it now without deploying the rest of
  the commit, run the workflow with `functions` set to the comma-separated
  Functions that read the parameter (`grep` its `define*` name and the exports
  that import it). Only those deploy, each from the run's commit, with the
  environment's current variables. Indexes and rules are skipped and the
  record does not move, so the next normal run still deploys everything changed
  since the recorded commit.

Secrets:

- Rotating a secret a Function declares with `defineSecret` takes effect at the
  next deploy: the CLI reads the newest version and rebuilds only the Functions
  that declare it.
- Secrets a Function reads itself at runtime, such as the Razorpay partner
  config, need no deploy.

When the CLI refuses:

- **A Function removed from source.** The deploy stops and prints a
  `firebase functions:delete` command for each Function it would delete.
  Delete them, or redeploy the commit after restoring the export, then re-run.
- **A Function that newly retries on failure.** Firebase deploys it only with
  `--force`, and refuses a broad deploy before changing anything, listing
  those Functions. The run then deploys exactly them with `--force` and
  retries the rest, so no one has to act. A broad selector never takes
  `--force`, because that would also delete Functions missing from source.
- **A new Functions folder.** Packaging fails until the folder is added to a
  codebase in `functions/deploy-codebases.json`. Keep codebases grouped by
  shared code: a codebase redeploys whenever any file it loads changes.

A manual `./tool/deploy_firebase_targets.sh` deploy leaves the record
unchanged. Recovery is fix-forward: merge the fix or re-run the workflow.
Rollback follows the target-specific steps in this document; the job never
reverses remote state.

Index deploys never receive `--force`, so live composite indexes that are not in
`firestore.indexes.json` are never deleted. Prod keeps 28 such earlier indexes.
Out-of-band drift is repaired with a manual `full` run, not assumed fixed by an
incremental one.

`Deploy backend` replaced several older paths, which were deleted on
2026-10-24 after its first successful prod run (`deployed/prod` at `bd52e13cd`):
- the artifact-cursor `Delivery` pipeline;
- `Backend Rebaseline`;
- `Backend Staging Refresh`;
- the one-off backend release workflows: selective release, Host acquisition,
  Host deletion and its indexes, Host store rules, wedding phone import, website
  review index, and the CAT151 receipt release.

Their source and runbook sections remain in Git history before that deletion.

## CD Policy

Backend promotion follows [Deploy Backend](#deploy-backend). Store, Hosting
and app releases keep their own owners and workflows.

### WhatsApp provider activation

The disabled discovery profile is not a staging or production readiness
receipt. Organizer WhatsApp may be enabled in an environment only after an
operator verifies the following against the live target rather than a checked-in
description:

- `META_WHATSAPP_ENABLED=true` is an intentional environment approval, and the
  Meta app id, Embedded Signup configuration id and supported Graph version are
  non-placeholder values for that same app;
- the app secret and organizer access-token vault secrets exist in Secret
  Manager, the Functions runtime has only the required access, and no token or
  secret is stored in Firestore, logs, CI artifacts or client configuration;
- the public webhook challenge and raw-body signature path are reachable, the
  correct WABA is subscribed, and duplicate/out-of-order status and inbound
  webhook tests pass;
- one organizer-owned number completes onboarding, identity/quality inspection,
  template sync, test delivery and status receipt in the target environment;
- exact organizer-scoped WhatsApp permission, STOP/admin suppression, frequency
  caps, service-window rules, retention, cost/quality monitoring and support
  escalation have named owners; and
- the released Host clients expose provider unavailability and setup blockers
  rather than enabling a campaign composer optimistically.

Catch-owned WhatsApp is a separate activation. It requires a separate Catch
WABA/number, credentials, templates, consent/suppression ledger, webhook/thread
authority, retention policy and support owner. Enabling organizer WhatsApp must
not make the Catch route active. Personal `wa.me` handoff requires no backend
provider activation and generates no Catch delivery receipt.

### Instagram claim verification activation

Organisers prove a claim by sending a code from the listing's Instagram
account to @catch_dates. `instagramClaimWebhook` uses the Instagram API with
Instagram Login (`graph.instagram.com`) and deploys everywhere. Only prod
names Catch's account, so only prod answers Meta. Dev and staging return 503.
A Meta app has one callback URL, so @catch_dates's messages go to prod.

Fixed values:

- Meta app: Catch, `1596668525274018`, in the Torana business portfolio
  (`290587228549920`).
- Instagram account: @catch_dates, id `17841476918450741`. This is the
  `entry.id` in webhooks. The "Catch-IG" id `1404389366089349` is the
  Instagram app id, not the account id.
- GitHub variables in `prod` and `prod-backend`:
  `CATCH_INSTAGRAM_ACCOUNT_ID=17841476918450741` and
  `CATCH_INSTAGRAM_HANDLE=catch_dates`. Leave them unset in dev and staging.
  `CATCH_INSTAGRAM_GRAPH_VERSION` is optional; the default is `v26.0`.

Secrets in prod Secret Manager (`catch-dating-app-64e51`). Dev and staging
keep their existing versions so readiness passes; those values are unused.

- `CATCH_INSTAGRAM_ACCESS_TOKEN`: in the Meta app, Instagram, API setup with
  Instagram login, Generate access tokens, Generate token on the @catch_dates
  row. It is long-lived and lasts 60 days; `refreshInstagramAccessToken` renews
  it without a deploy (Instagram access token renewal, below).
- `CATCH_INSTAGRAM_APP_SECRET`: on the same page, Set up Instagram business
  login, Business login settings, Instagram app secret.
- `CATCH_INSTAGRAM_WEBHOOK_VERIFY_TOKEN`: `openssl rand -hex 32`.

After a prod deploy that includes the webhook:

1. In the Meta app, Instagram, API setup with Instagram login, Configure
   webhooks: callback URL
   `https://asia-south1-catch-dating-app-64e51.cloudfunctions.net/instagramClaimWebhook`
   and the verify token, then Verify and save.
2. Subscribe the `messages` field.
3. On the @catch_dates row, turn on Webhook subscription.
4. In the Instagram app as @catch_dates: Settings and activity, Messages and
   story replies, Message controls, Connected tools, Allow access to messages.
5. From an Instagram account with a role on the Meta app, send a message to
   @catch_dates. The webhook acknowledges it and logs nothing on success.
6. Set `CATCH_INSTAGRAM_CLAIMS_ENABLED=true` in `prod` and `prod-backend`,
   then run Deploy backend for `prod` with `functions` set to
   `instagramClaimWebhook,getOrganizerClaimVerificationOptions,startOrganizerClaimVerification,confirmOrganizerClaimVerification`.

Access level. Meta's App Review table says an app serving only a business you
own needs Standard Access. Its webhook setup page lists Advanced Access for
Instagram Login webhooks, and its messaging guide says testers need a role on
the app. Test a message from an account without a role. If no webhook
arrives, submit App Review for `instagram_business_basic` and
`instagram_business_manage_messages` from Complete app review on the same
page.

With the method switched off, the webhook still answers the handshake and
acknowledges signed deliveries.

#### Instagram access token renewal

A token from Generate token lasts 60 days. Meta's
[refresh endpoint](https://developers.facebook.com/docs/instagram-platform/reference/refresh_access_token)
extends a valid token that is at least 24 hours old. A token nobody refreshes
expires for good, and the webhook can no longer read usernames or reply.

`refreshInstagramAccessToken` renews it. It runs daily at 05:30 IST:

1. It reads `instagramAccessTokens/<account id>`. With more than 30 days
   left it stops.
2. It refreshes the recorded token, or the version pinned at deploy when
   there is no record or Meta rejects the recorded one.
3. It checks with `/me?fields=user_id` that the new token still acts for
   `CATCH_INSTAGRAM_ACCOUNT_ID`.
4. It adds the token as a new version of `CATCH_INSTAGRAM_ACCESS_TOKEN` and
   records that exact version and its expiry. The token never enters
   Firestore or logs.

The webhook reads the recorded version, cached for five minutes, while it has
more than an hour left. Otherwise it uses the version pinned at deploy, so no
redeploy is needed after a renewal. The next deploy pins the newest version
anyway.

A failed run records `lastErrorCode` and tries again the next day, so a
renewal has 30 daily attempts before the token lapses. Once two weeks or less
remain, a failure logs the error `Instagram access token renewal failed`.
Codes:

- `refreshFailed`: Meta or the network failed. It retries.
- `refreshRejected`: Meta says the token is invalid or expired. If the
  recorded token was rejected, the record is cleared and the webhook falls
  back to the pinned version. Replace the token by hand (below).
- `accountMismatch`: the token acts for another account. Replace it by hand
  with a token generated on the @catch_dates row.
- `secretWriteFailed`: the runtime service account cannot add secret
  versions. Grant Secret Version Adder (below).

Dev and staging set no account id, so the function does nothing there.

Permissions. The function runs as the default Functions runtime account. It
needs `secretmanager.versions.add` on `CATCH_INSTAGRAM_ACCESS_TOKEN`. In prod
that account has project Editor today, which includes it. So that renewal
does not depend on Editor, grant the narrow role once:

1. Open
   [CATCH_INSTAGRAM_ACCESS_TOKEN in prod Secret Manager](https://console.cloud.google.com/security/secret-manager/secret/CATCH_INSTAGRAM_ACCESS_TOKEN/versions?project=catch-dating-app-64e51).
2. Open the Permissions tab and click Grant access.
3. New principals: `574779808785-compute@developer.gserviceaccount.com`.
4. Role: Secret Manager Secret Version Adder. Save.

Readiness checks this secret's accessor grant before deploys. It does not
check the adder grant, and it does not flag it.

Check a renewal:

1. The first run needs a token at least 24 hours old. After the prod deploy
   that adds the function, open
   [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler?project=catch-dating-app-64e51),
   find `firebase-schedule-refreshInstagramAccessToken-asia-south1` and click
   Force run.
2. Open
   [the record](https://console.firebase.google.com/project/catch-dating-app-64e51/firestore/databases/-default-/data/~2FinstagramAccessTokens~2F17841476918450741).
   `expiresAt` should be about 60 days away and `lastErrorCode` null.
3. If not, read
   [the function's logs](https://console.cloud.google.com/run/detail/asia-south1/refreshinstagramaccesstoken/logs?project=catch-dating-app-64e51)
   and the record's `lastErrorCode`.

Replace the token by hand only after `refreshRejected` or `accountMismatch`,
or after a password change on @catch_dates:

1. Generate a token on the @catch_dates row, as when the webhook was set up.
2. Add it as a new version of `CATCH_INSTAGRAM_ACCESS_TOKEN` in prod.
3. Approve a prod `Deploy backend` run, which pins the new version.
4. Wait a day, then Force run the job. It refreshes the pinned token and
   records it.

### Protected Catch WhatsApp operator CLI

The CLI composes the merged operator planner, protected sources, Firestore
journal and existing authority store. It is not exported from Functions or
invoked by deployment. Source publication and backend deployment do not approve
operator execution, Auth grants, history publication, provider activation or
sending. Before a separately authorized production bootstrap, review the exact
plan/source/executable artifact, fixed identity/sender, current guards and the
concrete external Auth race. This source task uses synthetic tests only.

The executable sequence after authorization is:

```sh
npm --prefix functions run build
node functions/scripts/operations/setup-catch-whatsapp-reply.cjs fingerprint
node functions/scripts/operations/setup-catch-whatsapp-reply.cjs plan
node functions/scripts/operations/setup-catch-whatsapp-reply.cjs apply --plan-id <id>
node functions/scripts/operations/setup-catch-whatsapp-reply.cjs reconcile --plan-id <id>
```

`fingerprint` is offline and requires clean tracked source at the reviewed Git
HEAD. Other commands require `CATCH_WHATSAPP_OPERATOR_HOME` to select a private
non-symlink directory outside the checkout, owned by the explicitly delegated
policy/configuration writer with mode 0700. Regular bounded files must be
owner-only mode 0600, single-link, opened with `O_NOFOLLOW` and checked after open.
JSON records use compact `JSON.stringify` encoding; duplicate keys and ambiguous
encodings are rejected. Private subdirectories are also mode 0700. This POSIX
trust root does not certify independent human review or protect against a hostile
same-UID process. Do not create it from public request facts, commit it, or publish
its contents. Existing ADC and existing IAM are reused; no executor credentials,
users, secrets or IAM grants are created by this runner.

Required private inputs:

- `profile.json`: exact keys `schemaVersion` (1), `scope` (existing
  `OperatorSetupScope`), `sourceSha`, `executionSha256`,
  `credentialVersionName`, `runtimePrincipal`. The credential is the existing
  numeric `CATCH_WHATSAPP_ACCESS_TOKEN` version in the scope's project;
  `scope.credentialVersionSha256` is SHA-256 of its UTF-8 resource name. The
  principal is the existing deployed runtime service account, not CLI ADC.
  Source/execution fields match `fingerprint`; never update an approved digest
  automatically after changing source or compiled files.
- `actor-id-token.txt`: the existing Google actor's current Firebase ID token,
  provided through the protected session path, never argv, logs or token-valued
  environment variables. Current signature, project and revocation are verified.

Planning reads current state and creates only `pending-plans/<id>.json`
(`plan`, `executionSha256`) and `requests/<id>.json` (existing strict request with
a stable private replay key). It never creates approval. The separately
authorized policy writer reviews that envelope and the account consequences,
then writes only the plan to `reviewed-plans/<id>.json`, and writes
`approvals/<id>.json` with exact keys `schemaVersion` (1), `action`
(`bootstrap-apply`), `planSha256`, `scopeSha256`, `sourceSha`, `executionSha256`,
`replaySha256`, `expiresAtMillis`. Scope, plan and replay hashes use `setupHash`;
the execution hash comes from `fingerprint`. Approval cannot outlive the plan's
15-minute expiry. There is no `--yes`, approval command, Remote Config approval
or automatic promotion. Missing/mismatched approval fails before SDK/ADC access;
policy is checked again at each mutation admission, including after OAuth header
waits immediately before the single Auth request. A runtime instance retains one
exact plan/request binding; concurrent different-plan apply cannot replace it.
Preserve the exact request.

**Account consequence:** bootstrap adds project-wide `adminOwner=true` and the
canonical `adminRoleAssignments` projection to the existing Google UID,
preserving other claims. This grants broad existing Admin access, including role
management; it is not a WhatsApp-only role. Separately, Catch root revision 2 has
only `review`/`reply`, and the pinned recipient gets only endpoint-bound `receive`.
The operator must accept the broader Admin grant before live approval. Readiness
revoke does not remove that Admin claim or undo a send. There is no second user,
Google identity, new IAM role or global Auth mutex.

The existing recipient's exact `{admin: true}` claim may be preserved by the
reviewed plan. Its exact UID and full claim hash remain bound to source and
approval and are rechecked before bootstrap mutations and during reconciliation. The CLI never writes recipient
claims or strips existing general Admin access; that legacy claim supplies no
Catch review/reply authority. Receive still requires its separate endpoint-bound
Catch authority. Any claim drift or broader privileged recipient shape fails
closed. The Google actor's broad `adminOwner` grant remains part of the exact reviewed
bootstrap approval.

A consolidated Google-and-phone Admin may be both actor and recipient. Use that
single verified UID in both profile fields; do not create another account for
testing. This mode requires exact existing `{admin: true}` claims and an active,
enabled `admin`-only role assignment. Planning binds the entire assignment hash;
concurrent changes reject dispatch or seed. Bootstrap preserves profile/history
and assignment metadata, adds `adminOwner` alongside `admin`, and creates one
endpoint-bound authority with `review`, `reply`, and `receive`. The broader role
consequence still applies. A fresh Google sign-in after seed is required. The
normal readiness/history/publication and send approvals remain mandatory; a
consolidated profile or successful login does not activate production messaging.

After the seed receipt, `fresh-sign-in-required` means a new Google sign-in after
the seed's next-second cutoff; refreshing the old token is insufficient. Replace
only the private session token through the existing protected path and resume the
same approved `apply` request before expiry. The guarded claim setter uses a
single authenticated REST request; the Admin SDK's automatic mutation retry is
not used. Connection reset, lost committed response and 503 remain unknown
without another dispatch. Unknown effects use read-only `reconcile`; it never
dispatches another setter, advances a phase, resumes revoke or renews readiness.
Expired plans remain readable. Never reset/delete the
permanent project slot or change the replay key to retry. Unsupported
inherited/group/conditional Secret Manager access is unproven by the direct-IAM
adapter, not evidence of missing IAM or a request to expand it.

`complete` establishes bootstrap only. Readiness uses the same immutable plan,
request and permanent project slot, with separate short-lived stage approvals.
It can follow bootstrap plan expiry without modifying that expiry. It cannot
reactivate or renew existing readiness.

Before readiness planning, the separately authorized audit custodian supplies
these fixed private files keyed by the original plan's `createReviewRef` (`ref`).
They must contain actual owner-audited sources. A JSON shape, digest, file mode or
source publication does not establish provenance or delegate live authority.

| Private input | Required binding |
|---|---|
| `readiness-audit-delegation.json` | Schema 1, `authorityRef`, `delegationRef`, `ingressOwnerRef`, `historyOwnerRef`; the separately authorized custody delegation, with no default owner. |
| `audit-admissions/<ref>.json` | Custodian/delegation, full original operator scope, `ingressAuditSha256`, `historyAuditSha256`, `archiveSha256`, bounded `admittedAtMillis`/`expiresAtMillis`. Record hashes use `setupHash`; archive hash uses exact raw bytes. |
| `ingress-audits/<ref>.json` | Schema 1, full scope, canonical active ingress `document`, actual authenticated deployment `sourceAudit`; sender, revision, cutover, verified time and document evidence hash must agree. |
| `history-audits/<ref>.json` | Schema 1, full scope, existing `trustedPin`, actual authenticated `sourceAudit` for archive path/generation/bytes, epoch-to-exact-cutover coverage and independent source authenticity, retention, normalization and late-arrival audit bodies. |
| `archives/<ref>.json` | Exact authorized custody copy of the audited generation, at most 512 KiB. Nonempty supported untruncated text, complete epoch-to-cutover segments and STOP absence remain enforced by the existing verifier; no retained-receipt query substitutes for it. |

The executable stage sequence after those inputs and separate execution
authorization is:

```sh
node functions/scripts/operations/setup-catch-whatsapp-reply.cjs readiness-plan --plan-id <id>
# Custodian reviews the private pending candidate and writes exact review/action approval.
node functions/scripts/operations/setup-catch-whatsapp-reply.cjs readiness-ingress --plan-id <id>
node functions/scripts/operations/setup-catch-whatsapp-reply.cjs readiness-publish --plan-id <id>
node functions/scripts/operations/setup-catch-whatsapp-reply.cjs readiness-review --plan-id <id>
# Independent publication admission and exact readiness-apply approval are required.
node functions/scripts/operations/setup-catch-whatsapp-reply.cjs readiness-apply --plan-id <id>
node functions/scripts/operations/setup-catch-whatsapp-reply.cjs reconcile --plan-id <id>
```

`readiness-plan` reads live current authority and derives a receipt-backed Google
review session. It creates only `authentication-audits/<ref>.json` and
`pending-readiness/<ref>.json`. The receipt binds actual verified Auth/session,
roles, decision and authority observations without retaining a token. The pending
candidate is **not approved**. The authorized custodian independently reviews it
and writes the exact candidate to `reviewed-readiness/<ref>.json`. No command
copies, approves or refreshes it automatically; approval lifetime is at most ten
minutes and is bounded by the current token and evidence admission.

For each mutating stage, the policy writer supplies
`approvals/<id>.<action>.json`, where action is `readiness-ingress`,
`readiness-publish` or `readiness-apply`. It has the bootstrap approval's exact
keys and original plan/scope/source/execution/replay bindings, its own bounded
expiry, plus `readinessSha256` (hash of the reviewed candidate) and
`auditBindingSha256` (hash of the exact delegation/admission/ingress/history
bundle). Apply also requires `publicationAuditSha256`. All action approvals fail
before SDK/ADC initialization when missing or mismatched. Each invocation pins
its first admitted full approval/evidence binding and rereads it before commit;
changes during Auth waits fail closed.

Only the bootstrap-complete phase admits ingress. It creates the exact audited
canonical record or observes that same record; a conflicting or revoked record is never reset. Publication
uses the existing publisher and permanent phase receipts. Its actual transaction
captures `pending-publications/<ref>.json` before the create, binding the exact
publication digest including `authorityFenceSha256`. A lost response is reconciled
against the committed publication without republishing. A witness alone cannot
approve apply, even if it was created before a transaction failed.

`readiness-review` uses a read-only current-authority transaction to verify the
actual publication, full archive, pin and witness at a published-or-later phase.
It returns `approved=false` and opaque publication/witness hashes. The independent
custodian then supplies `publication-audits/<ref>.json`: schema 1, custodian and
delegation refs, approval ID, original plan/scope/source/execution bindings,
publication/witness hashes and fresh bounded review/expiry times. This audit must
come from a separately authorized independent review; the CLI never authors it.
The exact audit hash is bound by the readiness-apply action approval. Existing
provisioning then rechecks current authority, recipient, transactional STOP,
preferences, deletion and active ingress before create-only readiness. The CLI
has no revoke command; the merged root-only revoke model remains unchanged.

Read-only reconciliation never dispatches effects. It reports
`readinessVerified=true` only after proving a current unexpired, unsuppressed
ready record, consumed approval/audit, actual publication and current authorities.
Historical publication inspection can outlive stage or bootstrap expiry; it cannot
approve or renew anything. Unknown outcomes retain the exact slot and request.

The production Admin overview reuses its existing human inbound/reply review and
one-shot send flow. Google sign-in is added to existing Firebase Auth so the
configured Google operator can meet the required post-seed sign-in cutoff; phone
sign-in remains available. Normal existing Admin roles, App Check and backend
Catch capabilities still authorize access. This source adds no role writer or
auth framework. Standard Firebase Google sign-in may create an unclaimed account
for a previously unknown identity; that account receives no Admin grant here.
Use the existing configured operator for authorized setup.

The panel uses the initialized Firebase project's regional callable endpoint
(`asia-south1`) for `adminReviewCatchWhatsappInbound` and
`adminSendCatchWhatsappReply`. There is no DEV prerequisite or trial build flag.
Availability requires successful remote-origin `true` for the canonical
`catch_whatsapp_support_enabled` Remote Config key, plus live Auth, App Check and
current session in the initialized project. The client and checked-in Remote
Config template declare `false` defaults; no build-time key-name input is required.
Absent, local/default or remote-false values, failed fetch or retired session
keep it closed.
This source declaration does not prove the live parameter exists, create it or
enable it. Availability cannot approve bootstrap or a reply; exact human
confirmation, pre-resolved one-use
tokens, synchronous final dispatch guard and no automatic send retry remain.

Live custody delegation, actual audited history/cutover/publication, private
profile/session/approvals, live canonical Remote Config availability and deployed
atomic ingress must be supplied or verified by their authorized owners before
live execution. Missing input is not evidence of missing IAM or grounds to
recreate the existing token. Source/tests/PR publication do not authorize live
execution, provider activation, flags, deployment or sends. See
[First Catch WhatsApp operator source boundary](data_contracts.md#first-catch-whatsapp-operator-source-boundary).

Backend webhook, receipt, reply and atomic-ingress switches remain Firebase
Functions `defineBoolean` deployment parameters. This Admin availability contract
does not migrate their activation mechanism; any backend switch migration or
live activation requires its own authorized source and release work.

Mobile builds stay separate from backend deployment. `Mobile Beta` builds,
verifies and uploads each selected app and platform in one job, so the signed
bytes never leave the runner that built them before upload; `Mobile
Production` promotes a build already in the store and rebuilds nothing. See
[Mobile releases](#mobile-releases).

The mobile package receipt intentionally reports two repository-controlled
measurements: compressed bytes in the signed IPA/AAB and the sum of raw archive
member lengths. `tool/platform/mobile_package_policy.json` records the signed
integration baseline for each role/platform and permits at most 20% budget
headroom. Reports also expose remaining bytes and the remaining fraction of
each budget, including negative values on overruns. App Store Connect and Play report processed download/install
estimates; those values are not compared to either archive metric. Similar
store-displayed sizes do not imply identical applications: the release gate
also requires different compiled binaries and entry sets, and rejects Health
or Razorpay native payloads in Host.

Marketing and admin Hosting deploys require explicit Vite Firebase/App Check
environment variables. The exact Hosting build job runs
`tool/env/check_web_hosting_env.mjs` before producing the bundle, so packaging
fails if the site would fall back to dev Firebase config, sample admin mode, or
missing App Check. The packaged Firebase config contains one production target,
binds the known production Firebase project and surface-specific Hosting site,
points at the packaged site bytes, and has no `predeploy` or `postdeploy`
lifecycle hook. Marketing
production builds also require an
explicit store-link contract. `VITE_STORE_LINKS_MODE=prelaunch` requires both
store URLs to remain empty and preserves the honest coming-soon/waitlist CTA;
`live` requires validated HTTPS `VITE_APP_STORE_URL` and
`VITE_PLAY_STORE_URL` product links on `apps.apple.com` and `play.google.com`.
The automatic workflow defaults an unset mode to `prelaunch`, so the website
can deploy before the mobile listings exist without publishing fake links.

All three Hosting workflows use the approval-free `prod-hosting` GitHub
Environment and deploy automatically after their validation job succeeds on a
matching `main` push. Each deployable output is built once: React source
validation skips its redundant production bundle, while the Host workflow
validates without building; `_web-hosting-build.yml` then produces and packages
the exact production bytes, and `_web-hosting-promote.yml` downloads that
artifact by id and digest without rebuilding it. Keep only Hosting/OIDC
variables in that environment; App Store
Connect and mobile signing secrets are owned by `prod-mobile`; backend
production deploys through `prod`.
Temporary mobile
rollback duplicates in `prod` follow the cutover cleanup above.

The production admin Hosting target has its own `Admin Website` workflow. It
validates Admin source, checks live prod Vite Firebase/App Check env, builds the
production bundle once, probes every callable declared in
`contracts/admin/admin_live_data_sources.json`, then deploys only
`hosting:admin` after matching changes land on `main`. A missing production
callable therefore blocks Hosting before a frontend can ship a dead Admin
route.
The same validation runs the admin unit suite, including the phone-only
guard in `admin/src/app/App.test.tsx` and
`admin/src/shared/api/firebase.test.ts`; a refactor that removes phone OTP or
reintroduces Google sign-in must fail before Hosting deploys.

That local environment check cannot prove Firebase console state. After admin
Auth, Hosting-domain, provider, reCAPTCHA-key, or App Check changes, record live
evidence that `admin.catchdates.com` and `catchdates-admin.web.app` are
authorized Auth domains, the Phone provider is enabled, the Google provider is
disabled, the deployed web app's reCAPTCHA v3 key has a matching Firebase App
Check server secret, and the live page completes App Check token exchange
before sign-in.

The standalone Host target is the Firebase Hosting site `catchdates-host`
(`https://catchdates-host.web.app`) and is mapped as `hosting:host` in
`.firebaserc`. Before making `hosts.catchdates.com` the advertised entrypoint,
attach that custom domain to the site, complete the Firebase DNS verification,
add both domains to Firebase Auth's authorized domains, and verify phone OTP and
App Check in the deployed Host Flutter shell. Public OTP registration on
`catchdates.com` uses the same production Firebase project but a separate
event-scoped registration callable; verify its reCAPTCHA/App Check exchange and
phone-provider state independently. Creating the Hosting site does not prove
any of these console or DNS gates.

`Deploy backend` never deploys Hosting or forwards Vite variables. The
marketing, Host, and admin workflows own their production Hosting builds and the
`prod-hosting` environment described above. `VITE_GTM_ID` remains optional
until the production GTM container exists; paid-acquisition readiness still
requires setting it and validating consent-aware tags. For marketing Hosting,
an absent environment-level `VITE_STORE_LINKS_MODE` defaults to `prelaunch`;
cut over by setting it to `live` only after setting both official product URLs
in the same GitHub Environment.

Hosting retry is resume, not generic rollback. An empty manual dispatch remains
validation-only. Exact recovery requires the failed producing run id/attempt,
source SHA, artifact id, GitHub digest, and a non-empty operator reason; only a
terminal non-success attempt is eligible. Both automatic promotion and recovery
recheck same-surface freshness immediately before Firebase mutation. Recovery
also requires its source SHA to remain the current `main` head and rejects an
older package attempt at the same SHA, so a historical artifact cannot overwrite
newer Hosting bytes. Packages retain for 90 days.

If a `main` CI attempt reuses successful jobs from an older attempt, Required CI
fails unless that exact current attempt owns its planner artifact and, when
applicable, backend package. Use **Re-run all jobs** so the successful attempt
publishes a complete immutable artifact set.

If a `Deploy backend` run fails, fix forward: merge the fix or re-run the
workflow. The `deploy:backend` record only moves after success, so the next run
redeploys everything since the last successful deploy.

### Website release train

`Website Release` (`.github/workflows/website-release.yml`, driven by
`website/scripts/next/releaseTrain.mjs`) releases main to `catchdates.com`
after main CI completes, with an hourly fallback. It plans main's head. When
that head has no website validation of its own, it first runs full CI on it
(about an hour). It then previews the planned commit, passes the `prod` gate
and promotes that exact preview. Trains queue and never cancel each other.
`docs/web_surface_architecture.md` ("Release train") describes each step.

The train releases the commit it planned, even when main has moved on since.
It passes that commit to `Next Website Preview` as `source_sha`. The preview
runs main's release scripts and gates, but builds, smoke-tests and deploys a
detached worktree of the source. Everything it names — artifact, image tag,
runtime label and `CATCH_RELEASE_SHA` — carries the source commit. Promotion
reads the source from the preview's artifact name. Before 1 Nov 2026 only
main's current head could be previewed, so a train whose validation main moved
past released nothing. With the merge queue busy, no train released for hours.

These gates stay. The preview and the promotion each require the source's
own successful CI with Marketing validation and captures. The source must be
on main and not older than the live release (`deployed/prod-website`). Both
recheck this right before they sign in, and promotion rechecks it before
every production step. A train's commit that a newer release has overtaken is
refused, so live only moves forward.

Recovery:

- **A train failed in validation.** Later trains skip that head
  (`website_validation_failed`) until main moves on or someone re-runs that CI
  run.
- **A preview or promotion failed.** Fix forward. The next train plans main's
  head again. To release a specific commit by hand, dispatch
  `Next Website Preview` with `source_sha`. Then dispatch
  `Next Website Promotion` with that preview's run id.
- **Hold releases.** Add a required reviewer to the `prod` environment. Trains
  then wait at the gate.

### Website rollback to the static Vite build

`catchdates.com` has served the Next runtime since 20 October 2026. Fix forward
through the release train when you can. Roll back to the static Vite build only
when the Next runtime is failing and a fix cannot be released quickly. The owner
decides; it changes production traffic. Run it from a shell signed in to
`firebase` and `gcloud` with production Hosting rights.

1. Find the newest static version that live Hosting has served. This lists
   only finalized versions without the `catch-website-next` catch-all; on
   25 October 2026 it was `95ea758d07cb4ac2`, released 20 October:

   ```sh
   curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     -H "x-goog-user-project: catch-dating-app-64e51" \
     "https://firebasehosting.googleapis.com/v1beta1/sites/catch-dating-app-64e51/channels/live/releases?pageSize=100" |
     jq -r '[.releases[] | select(.version.status == "FINALIZED" and all(.version.config.rewrites[]?; .run.serviceId != "catch-website-next"))][0] | "\(.version.name | split("/") | last) \(.releaseTime)"'
   ```

   That version carries its own build-time organiser and event snapshot. A
   listing withdrawn after its release date reappears on the static pages, so
   check withdrawals since then before choosing it.
2. Clone it to live:
   `firebase hosting:clone catch-dating-app-64e51@<version> catch-dating-app-64e51:live --project catch-dating-app-64e51`.
3. Verify: `curl -sI https://catchdates.com/` has no `x-catch-release` header,
   the page source has no `/_next/static/`, and
   `node website/scripts/probeProduction.mjs --json` passes when run from your
   own machine. `Website Production Observability` fails while the site is
   rolled back, because the static site carries no release header.
4. Hold the train. Add a required reviewer to the `prod` environment and
   reject `Website Release` approvals while rolled back, because a promotion
   moves live back to Next.
5. Refresh the static build. The `Marketing Website` promoter only skips
   while Next owns live, so the next website-relevant merge deploys a current
   Vite build. It needs a green package build; check the latest run first.
6. Stop paying for the idle warm instance:
   `gcloud run services update catch-website-next --project catch-dating-app-64e51 --region asia-south1 --min default`.
   The next promotion sets it back to one.

To return to Next, remove that reviewer (or approve the next `Website Release`
train) once the fix is on main. To roll back to the previous Next release instead, clone the version in
that promotion run's `rollback.json` artifact the same way (step 2). The warm
instance stays with the newest Cloud Run revision, not the older pinned one.

## Exact-Artifact Promotion And Resume

Validation and deployment are separate trust decisions. A green CI run proves
the source and checks that ran in that job; it does not prove that bytes rebuilt
later by a deployment job are identical. Delivery paths should therefore build
once and promote the producing run's verified artifact whenever the target
supports artifact promotion.

The reusable delivery contract binds:

- the full 40-character source commit SHA;
- the producing CI run identifier and attempt;
- artifact basename, byte length, and SHA-256 digest; and
- the ordered stages permitted for that artifact.

Before using deployment credentials or mutating remote state, a consuming job
must receive the expected source SHA, run id, and run attempt from trusted queue
selection or explicit recovery input, download the artifact plus provenance
manifest, and verify every binding. A source mismatch, run mismatch, attempt
mismatch, changed size, or digest mismatch fails closed. A successful upstream
run by itself is not artifact identity.

Multi-stage delivery uses an ephemeral checkpoint bound to the provenance
manifest digest, source SHA, source run and attempt, artifact digest, and an
immutable target scope, which includes the environment, so a dev checkpoint
cannot authorize staging or production. Checkpoints form an
ordered prefix of the manifest's stages. A stage is complete only after its
documented remote postcondition passes. On retry, the consumer verifies the
same artifact and checkpoint binding, identifies the first incomplete stage,
and resumes there. It cannot skip ahead; replay of an already-passed stage is
idempotent and does not rewrite prior proof.

Provenance, checkpoints and recovery authorizations are CI or bounded recovery
artifacts, not tracked repository state. Writes must be atomic so interruption
cannot publish partial proof.

Resume is not rollback. Resume continues promotion of the same verified bytes.
Rollback follows the target-specific instructions in this runbook and may use
a prior verified artifact, a compensating configuration change, or a
roll-forward. Partial remote state must be reported explicitly; no generic
delivery helper may claim it reversed a deployment merely because a command
failed.

The shared delivery primitive verifies identity, integrity, order, and resume
state. Each release owner still supplies environment readiness, credentials,
approval, concurrency, stage postconditions, smoke tests, and mutation policy.
Production permission is never inferred from a valid digest. The Firebase
backend no longer uses this contract: `Deploy backend` deploys an exact
commit (see Deploy Backend). Admin and Marketing Hosting consume it through
`_web-hosting-build.yml` and `_web-hosting-promote.yml`. Mobile releases do not
use it either: `Mobile Beta` builds and uploads in one job and records a GitHub
build attestation (see [Mobile releases](#mobile-releases)).

## Release Setup Evidence Snapshot

Current setup/build/signing/distribution verdict: local builds and the native
signing contract are healthy. On 2026-07-15 ephemeral runners without a
reusable development private key had accumulated one unusable API-created
Apple certificate per run; nineteen verified-unused development certificates
were revoked, the three working human Development/Distribution/Developer ID
identities were preserved, and dedicated CI certificate `7P698XNLRP` was
installed in `prod-mobile`. `Mobile Beta` imports that identity: run
`40975670519` uploaded both iOS apps to TestFlight, and run `40943509998`
uploaded Host Android to Play internal. Mobile store distribution still needs
external product-release evidence: install proof for both roles, the Consumer
Play app record, and Play signing-fingerprint, install, and launch proof.

Verified setup state:

- Web builds, Android signed APK/AAB creation, iOS App Store IPA export, and
  macOS release builds have passed in the current release setup evidence.
- Android upload-key SHA-1/SHA-256 fingerprints are registered on Firebase for
  the currently verified consumer and host upload artifacts.
- Firebase App Check provider configs and enforcement are verified for the
  consumer Android, iOS/macOS, and web registrations plus the 2026-06-10 host
  Android, iOS, and web registrations. Host Android uses Play Integrity, host
  iOS uses App Attest, and host web uses reCAPTCHA Enterprise across dev,
  staging, and prod.
- Apple Developer App ID `Catch Host` / `com.catchdates.host` is registered
  under team `2HQBK4UMUT` with App Attest, Associated Domains, HealthKit, and
  Push Notifications enabled. App Store Connect app `Catch Host` exists as app
  id `6778927317`, SKU `catch-host-ios`, primary language English (U.S.), iOS
  platform, and Full Access user access. The native Host product deliberately
  signs without HealthKit and Associated Domains even if those capabilities
  remain enabled on the Developer portal record.
- Direct macOS distribution is Developer ID signed, timestamped, notarized,
  stapled, and Gatekeeper accepted.
- Consumer TestFlight upload/install/launch and iOS Maps behavior have legacy
  Xcode Cloud proof. `Mobile Beta` now uploads both roles; install/launch proof
  of those builds remains pending for each role.

Still outside this setup verdict:

- Android real-device smoke testing remains hardware-gated until an authorized
  Android phone is connected.
- macOS phone-auth runtime behavior is intentionally deferred because Firebase
  Auth `verifyPhoneNumber()` is unavailable on macOS.
- Play internal testing, store metadata, privacy/data-safety forms,
  screenshots, legal/support URLs, and production Crashlytics/Analytics
  dashboard validation remain release-management/product tasks.
- App Store Connect currently displays an updated Apple Developer Program
  License Agreement notice. The Account Holder should accept it before treating
  host TestFlight uploads or store submissions as release-ready if Apple blocks
  either action.
- Play app-signing certificate fingerprints still need to be added to Firebase
  after Play Console enrollment. Local upload-key fingerprints are already
  registered.
- Mac App Store distribution has not been validated. Direct Developer ID
  distribution is validated.

## App Version And Force-Update Gate

Every store release candidate that may be enforced through Remote Config must
increment the `pubspec.yaml` build number. The marketing version can stay stable
when the release is compatibility or migration focused, but the build number
must still move so Firebase Remote Config can target old binaries precisely.

Current release candidate:

```text
version: 1.0.1+3
```

Flutter maps this to:

- Android `versionCode`: `3`
- iOS `CFBundleVersion`: `3`
- macOS `CFBundleVersion`: `3`

After the compatible binary is available to users, raise only the platform keys
for platforms included in that release:

```text
min_build_ios = 2
min_build_android = 2
min_build_macos = 2
```

Keep `min_version` broad unless the release intentionally changes the public
marketing version. Use the platform build gates for schema/API compatibility
work because they are less ambiguous than semantic version strings.

For storage/API migrations:

1. Deploy backend support that can tolerate both old and new clients.
2. Ship the client release with dual-read/dual-write support.
3. Wait until the released build is actually available through the relevant
   store or distribution channel.
4. Raise the Remote Config `min_build_*` value for released platforms.
5. Rerun the migration-specific parity gate and record the prod evidence before
   cleanup.
6. Cut over backend triggers or remove legacy write support only after the
   parity gate passes with the force-update gate in place.

Remote Config shortens the compatibility window, but it does not eliminate it
at release time. A client can start offline, fetch can fail, and store rollout
timing can lag. Keep legacy-compatible reads/writes until the explicit parity
and force-update cutover step is complete.

The `swipes` to `profileDecisions` migration is already complete: dev, staging,
and prod cleanup finished on 2026-05-26, and the one-time migration tools were
retired on 2026-06-02.

The checked-in baseline template is `firebase/remote_config.template.json`.
Its default values are deliberately non-blocking. Use it to seed a project or
recover missing parameters, then raise `min_build_*` only as a deliberate
release action after the compatible binary is available.

### Retired Host release gates: live hold

Current Host builds no longer read `host_private_event_setup_enabled`,
`host_progressive_event_defaults_enabled` or `host_wedding_phone_import_enabled`.
Host builds released before their removal, including Host 1.0.1 (build
202610200000357901), still read them with a bundled default of `false`.

- Prod's live Remote Config keeps all three at `true` until every Catch Host
  build that predates the removal is retired: no longer distributed and blocked
  by the `host_min_build_*` force-update floors.
- Until then, nobody deletes these keys by hand or publishes the checked-in
  template to prod. A template publish replaces the whole live template, so it
  would remove them and switch the features off for those installs. It would
  also reset any raised `min_build_*` floors.
- `tool/firebase/environment_difference_policy.json` records the hold.
  `node tool/firebase/report_environment_parity.mjs --surfaces remote-config`
  lists the keys as retired gates still live for old builds and reports
  `RETIRED-HOLD-BROKEN` if one is changed or removed.
- The server-only `CATCH_*_READY` keys need no client hold: no app build reads
  them. Delete them only after the Functions build that stopped reading them is
  live in prod.

Production release builds throttle Remote Config fetches to a one-hour minimum
interval. Debug builds, emulator builds, and non-production environments keep a
zero interval so config changes are easy to validate during QA.

## Pre-Deploy Checklist

- Review `git diff --stat` and confirm the dirty tree is the intended release
  candidate.
- Run code generation if generated Dart or Firestore TS types are stale.
- Run `./tool/check_data_contract.sh`.
- Run focused Flutter analysis/tests for touched surfaces.
- Run `npm --prefix functions run lint`.
- Run `npm --prefix functions test`.
- Run Firestore rules tests through the emulator:
  `firebase emulators:exec --project demo-catch-rules --only firestore,storage "npm --prefix functions run test:rules"`.
- Make the beta data strategy explicit: reset demo data or validate migration
  tooling before production users depend on the new schema.
- Confirm Remote Config force-update values are planned but not raised until a
  compatible app build is available.

## One-Time Environment Setup

Before rules or Functions depend on them, each Firebase/GCP environment needs:

- Cloud Vision API enabled for photo moderation.
- `config/cities` Firestore document with `cityNames` and full city objects.
- Firestore TTL policies on `rateLimits.expiresAt` and, before enabling Cross
  Paths, `crossPathsSuggestionExposures.expiresAt`.
- Firebase Functions secrets for payment, maps/places, and any other
  environment-owned provider keys.
- Google Maps SDK/Places APIs enabled and key restrictions configured as
  described in `docs/location_stack_plan.md`.
- Firestore BigQuery export extensions installed where marketplace/event-success
  metrics should be queryable.
- Firebase Analytics linked to the intended Google Analytics property, web
  measurement IDs refreshed, GA4 BigQuery export enabled where needed, and
  DebugView evidence captured for the target app id.

### Payment Provider Setup TODO

Do not treat international paid events as launch-ready until these items are
complete for each target environment (`dev`, `staging`, and `prod`):

- [ ] Create environment-owned Stripe platform credentials. Keep test and live
  mode keys separate, and do not reuse another environment's secret key.
- [ ] Set the Stripe Functions secrets in each Firebase project:
  `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
  As of 2026-05-28, `dev`, `staging`, and `prod` have non-real placeholder
  values for both secrets so unrelated Functions deploys are not blocked by
  missing Stripe bindings. Replace those Secret Manager values with
  environment-owned Stripe credentials before enabling Stripe onboarding,
  checkout, or webhooks.
- [ ] Configure Stripe webhook endpoints per environment for the exported
  `stripeWebhook` HTTPS Function. Subscribe at minimum to Checkout Session
  completion and expiration events used by the backend booking flow, then copy
  the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`.
- [ ] Confirm the Stripe Connect platform responsibilities before enabling
  host onboarding. The current backend creates Accounts v2 connected accounts,
  requests merchant card-payment capability, and uses destination Checkout
  Sessions with `transfer_data.destination` and `on_behalf_of`.
- [ ] Decide and configure the platform fee policy through
  `STRIPE_APPLICATION_FEE_BPS` per environment. Leave it at `0` only when
  Catch is intentionally not taking an application fee.
- [ ] Set production-safe redirect URLs for Stripe onboarding and checkout:
  `STRIPE_CONNECT_RETURN_URL`, `STRIPE_CONNECT_REFRESH_URL`,
  `STRIPE_CHECKOUT_SUCCESS_URL`, and `STRIPE_CHECKOUT_CANCEL_URL`. The checked-in
  code defaults point at `catchdates.com` and exist only so noninteractive
  Functions deploys keep working before Stripe launch. Review and override them
  before staging/prod payment rollout.
- [ ] Create environment-owned Razorpay credentials before live INR payments.
  Current non-prod/prod state has reused test-mode Razorpay secrets; replace
  them with the intended `RAZORPAY_PUBLIC_KEY_ID` parameter and
  `RAZORPAY_KEY_SECRET` secret per
  Firebase project.
- [ ] Verify paid INR bookings, on the website and in the Consumer app, go
  through `managePublicEventCheckout` on the organizer's own connected
  Razorpay account when `eventAdmission` is `razorpayOAuth`. The checkout key
  is that connection's OAuth public token, never a Catch key. The Consumer app
  no longer calls `createRazorpayOrder`, which refuses new orders and keeps
  only existing-order verification and refunds. `RAZORPAY_KEY_SECRET` remains
  server-only and must never enter a client contract or artifact.
- [ ] Verify an organizer with no ready connection sees paid booking refused
  with the organizer-payments-not-ready message, and that Host Payouts shows
  Reconnect for a connection that cannot take payments.
- [ ] Only where a routing policy selects `razorpayRoute`: enable Razorpay Route
  for each target account and verify linked-account, stakeholder, Route
  product, bank settlement, and activation-status APIs with that
  environment's credentials. Host Payouts shows the Route payout form only
  then. A deployed callable and enabled secrets do not prove Route account
  approval.
- [ ] Smoke test India host setup with an organizer owner: verify Razorpay is
  recommended while Stripe remains available, KYC and bank fields are absent
  from Firestore, a failed retry continues the same linked account/product, and
  refresh moves pending/clarification/activated states into the matching Host UI.
- [ ] Replace the temporary `RAZORPAY_WEBHOOK_SECRET` values before enabling
  real Razorpay webhooks. As of 2026-06-26, `dev`, `staging`, and `prod` each
  have an enabled placeholder Secret Manager version so unrelated Functions
  deploys are not blocked while Razorpay account approval is pending.
- [ ] Merge the backend change and let `Deploy backend` deploy it, approving
  the prod run; do not use a local deploy for the normal rollout.
- [ ] Confirm packaged indexes reached `READY`, then confirm the Functions phase
  and its automatic callable-invoker sync passed before Firestore or Storage
  rules advanced.
- [ ] Smoke test the full paid-event matrix in the target environment:
  free booking, INR Razorpay checkout success/cancel/refund, non-INR Stripe host
  onboarding, non-INR Stripe checkout success/cancel/expiration webhook, payment
  history, booking count projections, waitlist/race-loss refund behavior, and
  host cancellation refund behavior.
- [ ] Record the smoke evidence in the release notes before enabling production
  host-created international paid events.

## Firebase Backend Delivery Order

For backend/schema-affecting releases, deploy in this order per environment:

1. Firestore indexes, followed by an explicit wait until every packaged index is
   `READY`.
2. Functions, including callable-invoker synchronization.
3. Firestore rules.
4. Storage rules.

The impact plan may omit unaffected stages but cannot reorder the stages it
selects. Hosting and app releases are separate workflows, not a fifth backend
stage. Keep Functions ahead of tighter rules when a release moves writes behind
new callables, and keep indexes ahead of Functions that may immediately depend
on new queries. Do not use Remote Config as a schema migration tool; use it only
to block older app builds after the compatible build is available.

Wedding phone import remains held in production by
`canImportWeddingPhoneContacts`: both the work-page entry and direct route
access use this gate. Dev and staging retain the native review flow for
validation. Remove the production hold only in a reviewed follow-on after:

1. `Deploy backend` proves the merged membership, guest-source authority and
   manifest-import Functions and Firestore rules in dev and production.
2. A synthetic wedding proves current work access, native-selected contact
   preview and request-bound commit/replay against the deployed contract,
   including the new source revision/hash fields and revoked-grant rejection.
3. The release owner accepts that exact backend compatibility evidence before
   enabling phone import in a production Host binary.

Production full backend deploys, data migrations or resets, provider
activation, and real contact/message operations require their own approval;
merging the held client does not authorize those actions. Callable reachability
alone does not prove the manifest-import wire contract is compatible.

The 2026-07-10 event-scoped Host inquiry change is a concrete two-phase case:
deploy the updated `startOrganizerHostConversation` Function and generated payload
contract before distributing the new client. The client contains a narrow
compatibility retry that removes `eventId` only when the older callable returns
the exact `eventId ... additional properties` validation diagnostic. That
fallback prevents a premature TestFlight build from breaking Message Host, but
it creates a General inquiry and therefore is rollout safety—not event-provenance
closure. Wrong-club and other new-backend validation failures are never retried.

Host event broadcasts completed their backend-first rollout in August 2026:

1. Merge and deploy `sendEventBroadcast`, its receipt schema, TTL field policy,
   indexes/rules, and callable IAM while
   the Host client affordance was still hidden.
2. Exercise dev, staging, and then production callable reachability. Confirm a
   missing-auth request reaches the Firebase callable adapter and returns a
   callable JSON rejection rather than 404, redirect, HTML/GFE, IAM denial, or
   5xx.
3. After that proof passed in production, the temporary client flag was
   removed. The Host beta lane in `fastlane/Fastfile` still runs the
manifest-driven live dependency check before Flutter/Xcode work and refuses
to build if the callable is not reachable. Broadcast visibility is now a
product capability, not a rollout flag.

Organizer follower-update delivery uses the same backend-first boundary, but
its durable retry scheduler is new and must be proved explicitly:

1. Deploy the follower-delivery schemas, TTL policy, index, Firestore rules,
   `createOrganizerPost`, `listOrganizerCampaigns`, and
   `dispatchPendingOrganizerFollowerUpdates` before releasing the matching Host
   client.
2. In dev, then staging, then production, confirm the callable is reachable and
   the scheduler is `ACTIVE`; create one request-id-bound update against a test
   organizer with more than one follower page and prove the operation reaches a
   terminal state without duplicate Activity or push attempts.
3. Release the Host client only after the production callable and scheduler
   postconditions pass. The request id is intentionally required; there is no
   legacy-client fallback or duplicate compatibility path.

`./tool/deploy_firebase_targets.sh` deploys indexes and rules for
`Deploy backend` and runs its Functions postconditions; `Deploy backend`
deploys Functions itself, as codebases. For Functions the script is an
operator-only recovery helper. It plans selected targets in the
same index → Functions → Firestore-rules → Storage-rules order regardless of
the caller's CSV order. The logical `functions` target expands
deployment-eligible exports from `functions/src/index.ts` into explicit
`functions:<name>` targets. The executor promotes those exact targets in
sequential batches of ten with a short cooldown because Firebase CLI otherwise
fans out up to forty mutations,
which can exceed regional Cloud Functions mutation and temporary Cloud Run CPU
quotas for this repository's large function inventory. This
keeps legacy live Functions, such as old run/run-club callables, deployed until
a deliberate cleanup plan removes them. Exact `functions:<name>` requests use
the same Functions phase. Planner errors and empty or malformed target sets fail
before any deploy begins. After the Functions phase, packaged callable-invoker
helpers advertising scope protocol 1 receive the exact selected Function targets
via `--targets`. They filter the live v2 Function inventory to those targets and
synchronize `roles/run.invoker` only on their callable Cloud Run services before
continuing to rules. Historical packages without that protocol retain their
original full callable reconciliation; invoking the callable-invoker helper
directly without `--targets` also retains full reconciliation. The deploy
identity therefore needs permission to list Cloud Functions and get/set Cloud
Run IAM policies. `Deploy backend` additionally owns the deployed-commit
tag and the index-`READY` wait; invoking this helper directly is not normal
promotion.
Do not use a broad `firebase deploy --only functions --force` unless deleting
legacy Functions is the intended release action.
The helper passes extra Firebase arguments to every phase except `--force`
(or `-f`), which reaches only the exact `functions:<name>` batches. Firebase
needs it there when a target newly enables retry on failure; on
`firestore:indexes` the same flag would delete every live index missing from
`firestore.indexes.json`, so index, rules and Storage phases always deploy
without it. With `--force`, a non-exact Function batch is refused before any
mutation. When a batch fails because it lacks that acknowledgement, the helper
stops after the first attempt and asks for a re-run with `--force` instead of
spending its retries.

Typical commands:

```bash
./tool/deploy_firebase_targets.sh dev firestore:indexes,functions,firestore:rules,storage
./tool/deploy_firebase_targets.sh staging firestore:indexes,functions,firestore:rules,storage
./tool/deploy_firebase_targets.sh prod firestore:indexes,functions,firestore:rules,storage
```

Remote Config is intentionally separate from the standard backend deploy. Do
not publish to prod while the retired Host release gates are on hold; see
[Retired Host release gates: live hold](#retired-host-release-gates-live-hold).

```bash
./tool/firebase_with_env.sh dev deploy --only remoteconfig
./tool/firebase_with_env.sh staging deploy --only remoteconfig
./tool/firebase_with_env.sh prod deploy --only remoteconfig
```

Firebase Extensions (`firestore-bigquery-export` instances in `firebase.json`)
are separate from standard backend delivery. A source merge does not update an
installed instance. Review and apply only the intended instance's configuration;
then compare live parameters and version against the reviewed source. A blanket
Extensions deployment is not the organizer analytics migration procedure.

Firebase's [Extensions deprecation guidance](https://firebase.google.com/docs/extensions/faq-and-troubleshooting)
sets March 31, 2027 as the end of managed installation, reconfiguration,
upgrades and removal. Existing resources continue running, subject to their
underlying runtime support. The September 1, 2026 guidance still describes
installed-user migration tools as forthcoming. Keep active exports and their
history in place; assess the official self-managed replacement when its
installed-instance migration procedure is available. Before switching ownership,
verify trigger delivery, historical/latest-row parity, parameters, IAM and
rollback against the existing instances. Publisher SDK instructions alone do
not establish a safe migration for Catch's installed exports.

Host analytics uses BigQuery as its reporting source. Run the existing source
check before deployment or refresh:

```bash
node tool/run.mjs check analytics:check-host-bigquery
```

`analytics/sql/README.md` owns installation, refresh, explicit import and the
organizer column migration. Run the migration in each environment right after
the Deploy backend run that ships it, in the README's order: each deploy helper
with `--skip-refresh`, dry run first; then `--refresh-only --create-schedule`
so the existing schedule runs the organizer SQL; then install
`bq-host-organizers` before uninstalling `bq-host-clubs`. A view's existence
alone does not prove backfill. Preserve the existing schedule identities.
Deleting retired export tables or views is the owner's to run.

Use `--dry-run` when checking the deploy helpers. Their `--create-schedule`
option updates one existing display-name match, creates a schedule when no match
exists, and fails on duplicates. The migration instead requires updating the
known existing resource; an unexpected missing schedule needs investigation.

Verify current runtime state with:

```bash
node tool/analytics/host_analytics_live_status.mjs --env prod
```

This compares required tables/views, exact extension configuration, reviewed
scheduled SQL and callable Functions. Checked-in configuration and historical
installation notes cannot establish current runtime completion.

The required IAM is not optional. The Functions runtime service account needs
`roles/bigquery.jobUser` at project scope plus access to `catch_analytics`
because the public analytics callable inserts into
`catch_analytics.host_analytics_events` and the host/admin callables read
`catch_analytics.mart_host_event_daily` and `catch_analytics.mart_host_link_daily`.
The deployer or scheduled-query
identity needs `roles/bigquery.jobUser`, write access to `catch_analytics`, and
read access to `catch_marketplace_metrics` for Event Success scorecard joins.
The `bq-host-*` extension service accounts must retain write access to their
own export tables. `EXCLUDE_OLD_DATA=no` permits the export schema to retain
old record data; it does not backfill documents that existed before installation.
Use the explicit official importer after the relevant trigger and table family
are ready, then compare the latest export with fresh Firestore source. Follow
`analytics/sql/README.md` for the organizer column migration; it deploys only
`extensions:bq-host-organizers`, not every extension.

The standard deploy helper performs this sync automatically. Use the direct
command only for IAM recovery or auditing a previously deployed environment:

```bash
npm --prefix functions run sync:callable-invokers -- \
  catchdates-dev catchdates-staging catch-dating-app-64e51
```

### Explore Event Discovery Rollout

When a release depends on direct event discovery, do the safe checks before any
write:

```bash
node tool/data/backfill_event_discovery_fields.mjs --env dev --summary-only
node tool/data/backfill_event_discovery_fields.mjs --env staging --summary-only
node tool/data/backfill_event_discovery_fields.mjs --env prod --summary-only
firebase firestore:indexes --project catchdates-dev --pretty
firebase firestore:indexes --project catchdates-staging --pretty
firebase firestore:indexes --project catch-dating-app-64e51 --pretty
```

Read-only index listings on 2026-05-26 showed dev, staging, and prod still had
only the legacy `events` indexes (`status/startTime` and `organizerId/startTime`).
Deploy `firestore:indexes` and wait for every discovery index to become
`READY` before enabling an app build that relies on the direct event query.

Let `Deploy backend` deploy indexes and then Functions before applying any
backfill. Apply the backfill only after the index stage reports `READY`, the
Functions stage passes, and the dry-run counts for that environment are
reviewed. The direct helper below is for bounded operator recovery only:

```bash
./tool/deploy_firebase_targets.sh dev firestore:indexes,functions
node tool/data/backfill_event_discovery_fields.mjs --env dev --apply
```

Repeat for staging, then prod. Production backfill requires `--allow-prod`.
After each environment, smoke test Explore with city, time, activity, distance,
map pin, saved-event, signed-up-event, hosted-event, and club-metadata cases.
In a release-like build with observability enabled, verify
`explore_event_opened` and `explore_map_event_selected` in Analytics DebugView.

When the admin Organizers and Events canonical directories depend on
token-backed search, dry-run and then apply the admin-search projection repairs
after Functions have been built from the matching code:

```bash
npm --prefix functions run build
node tool/data/backfill_organizer_admin_search.mjs --env dev --summary-only
node tool/data/backfill_organizer_admin_search.mjs --env staging --summary-only
node tool/data/backfill_organizer_admin_search.mjs --env prod --summary-only
node tool/data/backfill_organizer_admin_search.mjs --env dev --apply
node tool/data/backfill_event_admin_search.mjs --env dev --summary-only
node tool/data/backfill_event_admin_search.mjs --env staging --summary-only
node tool/data/backfill_event_admin_search.mjs --env prod --summary-only
node tool/data/backfill_event_admin_search.mjs --env dev --apply
```

Repeat for staging, then prod. Production apply requires `--allow-prod`.

Organizer supply capabilities are a callable-owned product-policy projection.
Its one-off legacy repair ran in production on 2026-07-27 and is retired;
wipe-and-reseed makes it moot. Deploy matching Functions before relying on the
projection. External-event publication/takedown must be smoke-tested through
the Admin dry-run-then-apply actions so the immutable receipt, organizer
ceiling, and outbound-only behavior are verified together.

## Smoke Tests

After a backend deploy, smoke test:

- Phone sign-in and onboarding continuation.
- Profile edit and public profile projection.
- Create/join/leave club.
- Create event, join free event, paid booking where enabled, waitlist, cancellation.
- Self check-in and host attendance.
- Swipe, match, chat message, unread count, block/report.
- Payment history, review prompt, notifications.
- Demo-data validation for the affected environment when demo tooling changed.

## Verifying Analytics, Crashlytics, And BigQuery

Observability collection is gated, so a normal debug `flutter run` deliberately
sends **nothing** — this is expected, not a bug.

### When collection is on

`AppConfig.shouldCollectObservability` (in `lib/platform/app_config.dart`) controls
both Firebase Analytics and Crashlytics. It is true only when:

- the build is release mode **and** the environment is `prod`; or
- a release/profile build passes `--dart-define=ENABLE_OBSERVABILITY_COLLECTION=true`.

In a debug build it is always false: `AppAnalytics.initialize()` calls
`setAnalyticsCollectionEnabled(false)`, so even Firebase **DebugView shows
nothing** (DebugView requires collection to be enabled).

Do not use `GoogleService-Info.plist`'s legacy `IS_ANALYTICS_ENABLED` value as
standalone proof that collection is on or off, and do not hand-edit generated
Firebase config files to change it. The runtime gate above plus live DebugView
and release evidence are authoritative. Regenerate the environment/role plist
from Firebase only when the registered app configuration changes.

The Runner Crashlytics symbol-upload phase intentionally evaluates every
non-Debug build and declares no fake output artifact: release dSYM uploads must
not be skipped because Xcode cached a prior script result. The resulting
dependency-analysis warning is accepted build noise, not an open release
defect.

### How to verify Analytics events reach Firebase

1. Run with collection forced on (the env wrapper forwards the flag as a
   dart-define):

   ```bash
   ENABLE_OBSERVABILITY_COLLECTION=true ./tool/flutter_with_env.sh dev run
   ```

2. For iOS DebugView also add the launch argument `-FIRDebugEnabled`
   (Xcode scheme → Run → Arguments), or `adb shell setprop debug.firebase.analytics.app <applicationId>` on Android.
3. Exercise flows that call `AppAnalytics.logEvent` (auth, club view, booking,
   swipe, chat).
4. Confirm the events in Firebase Console → Analytics → **DebugView** for the
   matching environment's project.
5. Record the proof through the `observability-evidence.yml` workflow.

A smoke build can also emit a single canary event with
`--dart-define=EMIT_OBSERVABILITY_SMOKE_EVENT=true` (event name
`observability_smoke`).

### BigQuery — two separate exports, do not conflate them

- **Firestore → BigQuery**: configured in-repo. `firebase.json` declares the
  Event Success, participant metric, and host analytics operational export
  instances. Existing `bq-event-success-*` and `bq-participant-*` instances are
  installed in all three projects; newly declared `bq-host-*` instances must be
  deployed explicitly before host analytics marts can refresh from live data.
  Extension parameter changes are **not** part of the normal
  `deploy_firebase_targets.sh` target set — push them with an explicit
  `firebase deploy --only extensions` when changed.
- **GA4 → BigQuery**: a Google Analytics Admin product link, not repo config.
  Production is linked as of 2026-05-23: GA4 property `catch-dating-app-64e51`
  (`p526484083`) exports daily event data to BigQuery project
  `catch-dating-app-64e51` (`catch-dating-app`, project number
  `574779808785`) in `Mumbai (asia-south1)`. The expected dataset is
  `analytics_526484083`. All 6 streams are included, no events are excluded,
  and streaming export, mobile advertising identifiers, and daily user-data
  export are disabled. GA4→BigQuery only exports from the day it is enabled.
  Capture the dataset link/table proof in the `ga4_bigquery_evidence` input of
  `observability-evidence.yml` after the first daily table lands.
- **Host analytics marts**: source-controlled DDL and refresh SQL live under
  `analytics/sql/**`. `getHostAnalytics` and `adminGetHostAnalytics` read
  `catch_analytics.mart_host_event_daily`, and the owner link roll-up reads
  `catch_analytics.mart_host_link_daily`; `recordOrganizerAnalyticsEvent`
  writes aggregate-safe discovery events, including owner `linkClick`s, to
  `catch_analytics.host_analytics_events`. Apply the DDL before deploying
  Functions that read the link mart; until then the roll-up reports a missing
  `owner-link-clicks` data-quality row instead of failing. The mart also reads
  `analytics_526484083.events_*` for `organizer_<eventName>` GA4 exports when
  the dataset/tables exist, using the larger direct-vs-GA4 daily count per
  organizer/event/event-name key to avoid double-counting mirrored browser events.
  Apply the warehouse layer with
  `tool/analytics/deploy_host_analytics_bigquery.sh <env>` after deploying the
  `bq-host-*` extension instances.

## Automated Integration Test Backlog

Feature-flow integration tests should cover the same user journeys as the
manual smoke checklist, with Firebase, payment, notification, location, and
image-picker side effects replaced unless the test is explicitly device or
emulator backed.

- Auth and onboarding: phone entry, OTP continuation, profile-step resume,
  required-field validation, photo/running preference completion, and redirect
  to the authenticated shell.
- Routing and app shell: unauthenticated redirects, authenticated redirects,
  five-tab navigation, top-level route back behavior, FCM/deep-link chat routes,
  and inactive-tab stream gating.
- Dashboard: empty state, booked-event state, activity tab, next-event CTA,
  swipe-window CTA, and recommended-event navigation.
- Clubs: city selection, search, joined/discover partitioning, club detail,
  create club, edit club, join, leave, and host-only affordances.
- Events: create event, event detail, free booking, paid booking handoff, waitlist,
  cancellation, self check-in, host attendance, map view, and location picker.
- Catches and swipes: eligible attended-event list, swipe deck, empty candidate
  states, like/pass decisions, match creation result, and event recap.
- Chats: matches list, search, chat route hydration, message send, unread reset,
  block/report, and push/FCM route handling.
- Payments and reviews: payment confirmation, payment history, review prompt,
  create/update/delete review, and post-event review visibility.
- Profile and settings: inline profile edits, photo upload replacement,
  public-profile projection, notification preferences, sign out, and account
  deletion/anonymization entry points.
- Platform/device flows: App Check, real phone auth, push permission/token
  registration, image upload, real map rendering, Razorpay checkout, analytics
  DebugView, and Crashlytics visibility.

### Current Pending Integration Tests

Last updated: 2026-06-04.

The deterministic app-shell integration architecture is folded into this
release runbook. Run the split local suite with:

```bash
node tool/run.mjs run test:app-shell-integration
```

Pull requests that touch Flutter integration or golden surfaces select
`.github/workflows/visual-integration-ci.yml`. Its three independent jobs run
Ubuntu headless journeys, macOS desktop/Widgetbook goldens (including the second
determinism pass), and native macOS app-shell smoke. Goldens and native smoke
use separate pinned macOS runners at the same workflow source; neither job
waits for or substitutes for the other. Committed generated-source freshness
remains required in the golden job. The smoke retains bounded infrastructure
retries, and every selected job must pass. Golden pixel comparisons are report
only: the job summary lists goldens beyond the 0.30% hosted-macOS raster
tolerance (0.60% for the Widgetbook corpus) or without a baseline, and their
images are retained as artifacts, while the comparator's known-good/known-bad
tests keep that tolerance honest.

Use `bash tool/test_app_shell_integration.sh <device> smoke` for the bounded
native lane and `bash tool/test_app_shell_integration.sh <device> all` for every
native suite. The main Flutter workflow separately analyzes and builds
`widgetbook/` for web, runs the unit/widget suite with LCOV, publishes the raw
LCOV plus a handwritten feature-level Markdown summary, and deliberately does
not impose a global coverage percentage threshold. These are repository
integration gates; the live service/device evidence below remains separately
required for affected releases.

The split suite covers app-shell launch/routing plus focused club, event,
dashboard, Catches, chat, settings, review, and regression flows with service
side effects faked at repository/provider boundaries. Keep the pending
live-service tests below out of the default local suite unless they are made
emulator-backed or gated behind an explicit device/live-service test target.

| Area | Local code-side coverage now present | Pending test/evidence | Required environment |
| --- | --- | --- | --- |
| App Check | Backend errors map App Check failures; app bootstrap activates App Check in `main.dart`. | Prove enforced App Check accepts the app's token and rejects missing/invalid tokens for Auth, Firestore, Storage, and callable Functions. | Firebase dev/staging project with App Check enforcement enabled plus registered debug token or release attestation. |
| Real phone auth | App-shell integration covers phone entry, OTP continuation, and repository calls with a fake auth repository. | Complete a real OTP send and sign-in against Firebase Auth. | Physical iOS/Android device or Firebase Auth emulator; use a Firebase test phone number for repeatability. |
| Push permission and token registration | App-shell integration verifies authenticated shell invokes FCM initialization; routing tests cover FCM chat route handling; backend notification producers are covered separately. | Grant/deny notification permission, save a real FCM token to `users/{uid}.fcmToken`, receive a push, and tap it into the intended route. | iOS/Android device or simulator with push support and Firebase Messaging configured for the target app id. |
| Image picker and Storage upload | App-shell integration covers picking a club cover through the full routed UI and passing uploaded URL into create-club submission with a fake upload repository. | Pick media through the native picker and upload to Firebase Storage under enforced Storage/App Check rules. | iOS/Android simulator/device with photo-library permission and Firebase Storage in dev/staging. |
| Real map rendering | Create-event integration opens the map picker and selects a map coordinate through the `GoogleMap` widget callback. TestFlight iOS Maps behavior is verified through App Store Connect/Xcode Cloud TestFlight proof as of 2026-05-21. | Repeat real map tile/marker proof when Maps key injection, bundle IDs, or store distribution settings change; verify Android separately before Play release. | iOS/Android simulator/device with configured Google Maps/Places keys and network access. |
| Razorpay checkout UI | App-shell integration covers paid booking handoff and confirmation with a fake payment repository; payment repository tests cover typed Razorpay success/error callbacks and callable verification contract. | Open the native Razorpay checkout sheet, complete/cancel a test payment, and verify post-payment booking state. | iOS/Android device or simulator supported by `razorpay_flutter`, with Razorpay test keys and callable Functions. |
| Analytics DebugView | App-shell integration verifies route screen views reach `AppAnalytics`; unit tests cover event sanitization and collection gating. Dev/staging/prod Firebase projects are linked to GA4 properties under Analytics account `365970973`. Prod GA4 BigQuery export is linked to `catch-dating-app-64e51` in `asia-south1` with expected dataset `analytics_526484083`. | See expected auth/routing/booking/review events in Firebase Analytics DebugView for a real build, then record first BigQuery `events_YYYYMMDD` table proof once the daily export lands. | Debug or release-like app build connected to Firebase Analytics DebugView for the target app id. |
| Crashlytics visibility | App-shell integration verifies the authenticated uid is attached to the crash reporter on cold launch; unit tests cover fatal/error reporting paths. | Trigger a non-production test crash/non-fatal error and confirm it appears with expected custom keys and symbolication. | Release-like iOS/Android build with Crashlytics collection enabled for dev/staging and dSYM/mapping upload configured. |

Do not make these live-service tests block every PR until they have stable
fixtures, reset/cleanup steps, and documented credentials. Prefer a separate
manual or scheduled workflow that records release evidence.

For observability smoke proof, use a profile or release-like non-production
build with collection explicitly enabled:

```bash
ENABLE_OBSERVABILITY_COLLECTION=true \
EMIT_OBSERVABILITY_SMOKE_EVENT=true \
./tool/flutter_with_env.sh staging run --profile -d <device-id>
```

The smoke define emits one nonfatal Crashlytics event with reason
`Observability smoke event` and one Analytics event named
`observability_smoke`. Use it only for dev/staging evidence or a deliberate
prod release smoke. After the dashboard rows appear, run the manual
`Observability Evidence` workflow and record the app build, Crashlytics proof,
Analytics proof, and GA4 BigQuery export status.

## Mobile releases

Test builds and store releases for the Consumer and Host apps run through
fastlane (`fastlane/Fastfile`, pinned in `Gemfile.lock`). Two workflows call it,
both from `main` only:

- `Mobile Beta` (`.github/workflows/mobile-beta.yml`) builds, verifies and
  uploads test builds to TestFlight internal testers and the Play internal
  track. It runs nightly at 03:07 IST when app sources changed since its last
  successful run, and on demand for any app and platform. It uses the
  approval-free `prod-mobile` environment.
- `Mobile Production` (`.github/workflows/mobile-production.yml`) ships a
  build testers already have. On iOS it submits that TestFlight build for App
  Store review as a phased release, which is released by hand after approval.
  On Android it promotes that internal-track version code to production as a
  staged rollout. It rebuilds nothing. It uses the `prod-mobile-release`
  environment, which requires a reviewer's approval.

Both environments deploy only from `main` and hold the same credentials: the
`catch-github-mobile-prod` App Store Connect API key in the three
`APP_STORE_CONNECT_API_*` secrets, and the `GCP_WORKLOAD_IDENTITY_PROVIDER` and
`GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL` variables. The Play publisher service
account's `roles/iam.workloadIdentityUser` binding names exactly the two
environment principals,
`attribute.repository_environment/1170579691:prod-mobile` and
`attribute.repository_environment/1170579691:prod-mobile-release`
(added 2026-10-29).

Each beta build runs the same checks as before upload: the IPA identity, the
Google Maps configuration, the Android bundle identity and signing certificate,
the package size and payload policy, and the live callable dependency check
for the app's role. Android builds run only for the apps listed in the
workflow's `PLAY_ROLES` (Consumer and Host since 2026-10-30). Google Play's API cannot create an app,
so a new app's record and its first bundle are made by hand in Play Console
before the app is added there. For that first bundle, run `Mobile Beta` for the
app with `android_upload` off: it builds, verifies and signs the bundle without
uploading and keeps it in the run's `android-<app>-…` artifact. iOS build numbers come from the latest TestFlight build
plus one. Android version codes come from the highest code on any Play track
plus one, and never go below 100000. Each run attests its IPA or AAB with
GitHub build provenance and keeps the file and its verification records as a
30-day workflow artifact.

Run a lane locally with `bundle exec fastlane ios beta role:host` or
`bundle exec fastlane android beta role:consumer`, given the same environment
variables the workflow passes. `bundle exec fastlane lanes` lists every lane.

`tool/app_targets.json` records this contract in `releasePolicy`: fastlane
lanes, the two workflows and their environments, TestFlight automatic internal
distribution, the Play `internal` beta track, and the Android upload
certificate the bundle verifier checks. `platform:app-targets` checks the
workflows and the Fastfile against it: beta runs on a schedule and on dispatch
in `prod-mobile` and never reaches production; production runs only on
dispatch in `prod-mobile-release`, from `main`, and never rebuilds. Run the
mobile release gates with:

```sh
node tool/run.mjs check \
  platform:app-targets \
  platform:mobile-package-policy \
  platform:verify-ios-release-identity \
  platform:verify-android-release-identity
```

### What the beta lanes verify

The lanes check `tool/firebase/client_callable_dependencies.json` before
building. A disabled production feature reports `disabled` and skips the live
probe. An enabled Host callable dependency must return an expected Firebase
callable JSON rejection to an unauthenticated probe; 404, redirect, HTML/GFE,
IAM denial, unexpected success, and 5xx all stop the build before upload.

`verify_ios_release_identity.mjs` checks the exported IPA for the target
marker, compiled Flutter entrypoint, bundle/display identity, version/build,
embedded Firebase bundle/app/project identity, Firebase OAuth URL scheme, and
role-specific signed entitlements. Consumer requires HealthKit and Associated
Domains. Host intentionally has neither; both roles require their Push/App
Attest contract. Production entitlement values and an explicit
`get-task-allow=false` are required. Archives stay on Xcode automatic signing
with the reusable Apple Development identity; Apple's cloud signing re-signs
the App Store export through the API key and
`apps/<role>/ios/ExportOptions.prod.plist`. The lane then validates the built
prod Maps key and writes the identity receipt beside the IPA.

`verify_android_release_bundle.mjs` uses checksum-pinned bundletool `1.18.3`,
verifies JAR integrity and the checked upload-certificate SHA-256, and reads
the compiled package, target/role, Firebase app/project, Maps, debuggable,
version-name, and version-code identity before any Play upload.

### Build wrapper retries

Every GitHub Actions `flutter build ios` entrypoint routes through
`tool/flutter_with_env.sh`. On CI only, that wrapper retries at most three times
when the failed output contains the exact GitHub HTTPS CocoaPods signature
`SSL certificate problem: self signed certificate`. It does not retry Dart,
Xcode, signing, configuration, or any other dependency error, and it never
disables TLS verification. Local builds remain single-attempt unless they are
running under the CI environment contract.

The same wrapper applies a separate CI-only retry to Android `apk` and
`appbundle` builds when the output contains both a transient Java socket
failure and the Gradle wrapper download stack. The ordinary wrapper default is
three attempts; the Mobile Beta Android job allows five attempts with a
20-second delay. Consumer and Host use the same smaller binary-only Gradle
distribution from Gradle's immutable GitHub release and pin its published
SHA-256. The wrapper does not retry Gradle compilation, signing, Android
configuration, or unrelated network-looking errors.

### iOS Maps key and toolchain pins

GitHub Actions iOS jobs write each app's
`apps/<role>/ios/Flutter/GoogleMapsKeys.xcconfig` through
`tool/write_ios_maps_key_xcconfig.sh <env> <output>`. The simulator build matrix
uses `dev`; TestFlight builds use `prod`. Keep Maps-key validation in that
helper instead of duplicating secret preflight logic in each CI surface.
`apps/<role>/ios/Flutter/GoogleMapsKeys.xcconfig` is gitignored, so it is never
present in a fresh clone. Without the key the archived `GoogleMapsApiKey` is
empty, `GMSServices.provideAPIKey` is skipped in `AppDelegate`, and every map
screen crashes at runtime.

GitHub Actions read `tool/ci/toolchain.env` through local actions under
`.github/actions`. Update that file instead of editing workflow YAML when
changing public tool versions such as Flutter, Node, Java, or Firebase CLI.
`tool/ci/check_toolchain_consistency.sh` requires every Apple-native workflow,
including Mobile Beta and Mobile Production, to run on the pinned
`APPLE_CI_RUNNER`.

### History

The custom `Mobile Internal Release`, `Mobile Internal Promote` and
`_mobile-platform-authority` workflows, their package and promotion scripts,
and the `main` CI delivery authority they consumed were deleted on 2026-10-30,
after `Mobile Beta` run `40975670519` uploaded both iOS apps to TestFlight, run
`40943509998` uploaded Host Android to Play internal (version code 457902) and
run `40959763441` built the signed Consumer Android bundle. Their run history
stays in GitHub Actions and App Store Connect. The migration plan,
[plans/mobile_release_fastlane_migration.md](plans/mobile_release_fastlane_migration.md),
records what the old pipeline did and each regression the fastlane path
accepts. The legacy Xcode Cloud `Default` workflows of both apps stay disabled
in App Store Connect; do not reactivate them.

## Optional Flight Provider Configuration

Airport coordination and manual arrival updates deploy without a flight-provider
account. Credential storage is separate from rollout. Keep
`FLIGHT_PROVIDER_CONFIG_VERSION` and `FLIGHT_PROVIDER_POLICY` blank while
inactive. Even a populated numeric credential reference cannot enable enrichment
without a valid policy. Deployment materialization forces the policy blank and
rejects all nonblank overrides. The inactive scheduler returns before reading
Firestore or calling a provider, manual provider refresh fails closed, and the
webhook rejects requests. No placeholder API key or webhook secret is provisioned.

The credential envelope remains a Secret Manager JSON object with exactly
`schema: "catch.flight-provider/v1"`, `apiKey`, and `webhookSecret`; the webhook
secret must contain at least 32 non-whitespace characters. Any future runtime
reference must pin a numeric version in the same Firebase project, never
`latest`. The deploy parameter preflight rejects cross-project or unpinned
references. Secret access and parsing failures fail closed without logging
credential contents. `FLIGHT_WEBHOOK_BASE_URL` is only an explicit HTTPS override;
otherwise the function derives its project-owned endpoint.

Storing credentials authorizes no provider activity. A later reviewed source
and rollout change must admit the bounded polling pilot only after plan-specific
observation retention, subscription cleanup, and runtime-identity acceptance.
Alerts and webhook ingestion remain disabled. See the
[flight preparation guide](../functions/src/transport/README.md) for secure
user-only credential entry, exact controls, and activation blockers.

## Host App Icons

Host builds use generated `AppIcon-host-dev`, `AppIcon-host-staging`, and
`AppIcon-host-prod` catalogs on iOS/macOS, plus Android `hostDev`,
`hostStaging`, and `hostProd` launcher resources. The two-line icon and
centered light/dark splash read `Catch Host` in the same explicit Archivo
`wght: 600` / `wdth: 78` voice as Consumer; there is no system font fallback and
no plural `Hosts` product mark. Regenerate the Swift masters and then run
`dart run tool/branding/generate_native_brand_assets.dart` after native
brand-token, icon, or splash changes.

## Human Release Evidence

Store uploads, processing and build numbers are visible in each `Mobile Beta`
job summary, in App Store Connect and in Play Console. These still require
human confirmation outside repository checks:

- Install and launch of the current Consumer and Host TestFlight builds with
  App Check, Maps, phone auth, push, and role-specific entrypoint proof
  (issue `#218`).
- Host Play internal-testing install and launch evidence. Consumer has it: its
  Play record exists, its first bundle `1.0.2 (100000)` was uploaded by hand on
  2026-10-30, Mobile Beta run `41024235942` uploaded `100001`, and the owner
  installed it and signed in by phone OTP after the Play app-signing
  fingerprints were registered in Firebase.
- Crashlytics visibility and symbolication evidence.
- Analytics DebugView event evidence.
- Store metadata, screenshots, privacy forms, support URL, privacy policy, and
  terms URL.

Run `Release Readiness` before store submission and `Observability Evidence`
after generating Crashlytics/Analytics proof.

## Store Product Backlog

The old production-release checklist was consolidated into this section on
2026-05-21. Keep store/account/product release tasks here instead of creating
another Codex audit checklist.

| Area | Remaining decision or proof |
|---|---|
| In-app reviews | Add `in_app_review`, choose high-satisfaction trigger moments, throttle prompts, and add a settings fallback after store IDs exist. |
| Legal and support links | Confirm public privacy, terms, support/contact, and account-deletion URLs; expose them from the settings surface and store metadata. |
| Accessibility | Run a large-text, VoiceOver/TalkBack, contrast, hit-target, and semantics pass across auth, onboarding, dashboard, clubs, events, catches, chat, and profile/settings. |
| Store metadata | Finalize listing name, screenshots, privacy forms, export-compliance answers, support URL, privacy policy, terms URL, and review notes. |
| Play internal testing | Produce Android internal-testing install/launch/maps evidence before Play release. |
| Observability | Capture Crashlytics visibility/symbolication and Analytics DebugView proof with a release-like dev/staging build. |
| Feature toggles and A/B testing | Defer until there is a concrete rollout problem; do not introduce a toggle framework as release ceremony. |
| Shorebird/code push | Defer for first release. Reconsider only after app-store release operations are stable and rollback policy is explicit. |

## Credential readiness and deployment provenance

`tool/firebase/environment_readiness.json` is the credential contract. Its
literal Firebase secret bindings and direct-reader entries record owners,
consumers, credential class, exact-reference requirements, runtime identity,
activation policy, and rotation compatibility. Keep names and references here;
never add values, private keys, passwords, signing material, or raw environment
dumps to Git, reports, or CI logs.

Readiness has two distinct phases. Candidate preflight parses the approved
Functions source without executing it, validates names-only parameter provenance,
and checks the intended runtime identity. For SDK `SecretParam` bindings,
Firebase CLI 15.34 resolves `latest` and deploys that numeric version; the SDK has
no supported numeric version option. Preflight uses the same metadata-only
resolution. Direct-reader contracts still require same-project positive numeric
references and reject aliases. A disabled selected version fails even when some
other version is enabled. After deployment, the same receipt must match observed
function identity, numeric bindings, and activation state. A new version created
between preflight and deployment can change SDK resolution: fail the comparison
and resolve the discrepancy before any revocation. A variable or version change
alone does not redeploy a Function.

The mode-0600 names/reference receipt records source SHA, parameter names and
resolution sources, selected references, activation booleans, and a digest of the
canonical generated non-secret parameters before the digest marker is appended.
Materialization must reproduce that receipt before writing the deploy copy and
alone emits the reserved `CATCH_DEPLOY_CONFIG_SHA256` marker. The final metadata
comparison checks that marker and source-intended identity for every selected
Function, including secret-free Functions and restored already-completed stages.
Missing/malformed markers and stale digests fail; environment input cannot
supply the reserved marker. The existing Functions deployment checkpoint
binds the actual generated file digest, package/source provenance, build and
serving revision; recovery must still validate that proof. Neither receipt is
permission to deploy a different source or to bypass normal main CI authority.
GitHub OIDC federation remains the deployment authentication path; do not add
service-account JSON keys.

Metadata readiness proves neither provider usability nor effective IAM isolation.
A missing explicit secret-level grant is unproven access, not proof of effective
denial: inherited and conditional policies require a separate effective-access
review. Record-bound and retained historical references are reported as
unverified, not silently classified inactive from a blank current parameter.
Source guards reject foreign-project/secret-family references before access.
No readiness command retrieves a secret payload.

Recovery rechecks current configuration and resolves SDK `latest` again. If a
version changed after the original deployment, the fresh candidate may differ
from the retained deployment proof. Do not suppress that mismatch or substitute
a receipt: use the existing explicitly authorized restart/redeploy path after
reviewing which version should serve. A retained secret version is not evidence
that it is safe to reactivate.

### Runtime identity proposals and activation proof

Use separate feature identities and separate provisioning duties where the
runtime architecture supports that split. The proposed DEV flight reader is
`flight-provider@catchdates-dev.iam.gserviceaccount.com`, with accessor only on
its approved flight secret; no account or grant is created by this source work.
A dedicated reader must not inherit organizer WhatsApp accessor/version-manager
permissions. WhatsApp connection completion/disconnection needs version-management
duties, while message readers require accessor only. Payment OAuth refresh is
currently a runtime write operation: do not remove its grant until the refresh
lease/provisioning path has been safely separated and tested. Keep default
identities as observed facts until an explicitly approved deployment changes them.

For each live identity change, approval must name project, service-account,
consumer functions, secret resources, exact roles to add/remove, and rollback
that does not reuse compromised material. Verify effective inherited/conditional
access, a positive intended read, and negative unrelated-secret access under the
actual deployed identity. No IAM change, persistent access, provider activation,
paid subscription, or credential entry is authorized by this runbook.

### Rotation and retained copies

Rotation is specific to the credential contract. Provider keys may overlap only
where the provider supports it; verify the new binding and deployment before
revocation. OAuth refresh credentials use the existing transactional lease and
outcome-unknown recovery; never blindly replay an old refresh token. Retain
payment credential versions required for refunds and reconciliation. Guest-link
signing keyrings retain verification keys for valid outstanding links; venue QR
key rotation can invalidate outstanding QR codes. Changing
`ORGANIZER_CONTACT_IDENTITY_KEY` changes stored identity HMACs and requires an
explicit migration strategy. Do not roll back to compromised material. Each
rotation/revocation/deletion needs exact action-time approval and secure user
entry; this source change performs none.

`prod-mobile` is the mobile release authority. Older `prod` Android/App Store
Connect names and repository-scoped PROD Maps names are retained migration and
recovery copies, not demonstrated duplicates by value. Before proposing a
specific name's retirement, retain successful consumer and host iOS distribution
and signed Android lane receipts that identify the authority scope, source SHA,
artifact/build, signing identity, and names used. Verify installation/distribution
and a documented recovery path with the replacement authority. Then request
approval for the exact old scope/name list. Do not read values to prove equality,
remove copies speculatively, or treat TestFlight as a secrets vault.

Public Firebase client identifiers/API keys, constrained native Maps SDK keys,
and environment flags are reviewed application configuration. App Store signing
keys, OAuth/provider credentials, and server Places keys remain privileged.
Per-invitation bearer tokens are intentional server-only Firestore application
data; moving every token to Secret Manager requires a separate threat model.

### Local and cloud build inputs

`tool/flutter_with_env.sh <environment> --config-sources` reports only reviewed names, source,
and set/empty/unset state. Existing process environment (including an explicit
empty value) wins, then `.env.<environment>.local`, then `.env.local`. Use this
mode to identify stale fallback provenance; do not print private-file contents.
`tool/write_ios_maps_key_xcconfig.sh <environment> <output> --temporary -- <command>`
creates an absent mode-0600 compatibility output for a foreground command and
cleans it on normal exit, failure, HUP, INT, and TERM. It refuses an existing
output/symlink. SIGKILL, host failure, or power loss cannot run cleanup; inspect
names/ownership before separately authorized recovery. Prefer these temporary
outputs to additional manually maintained master copies.

Codex Cloud bootstrap remains key-free. PersonalVault is per-user input, not
GCP synchronization. The optional personal DEV Android Maps key is staged only
at runtime by the existing helper. Raw environment secrets are available to task
programs; allowed-HTTPS proxy placeholders cannot supply a compile-time SDK key.
Do not distribute PROD secrets to developer VMs or publish a key-used filesystem.
Changes to saved setup configuration require separate coordination; source helper
changes must first pass offline fake-input tests.
