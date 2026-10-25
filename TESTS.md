# Catch Tests

Git owns the test-file inventory. Use `git ls-files '*test*'` when you need a
current list; this document owns only the durable commands and testing policy.

## Standard suites

```sh
flutter test
(cd apps/consumer && flutter test --concurrency=1)
(cd apps/host && flutter test --concurrency=1)
bash tool/test_app_shell_integration.sh
flutter test --concurrency=1 test/goldens
node tool/run.mjs check test:flutter-test-size
(cd widgetbook && flutter analyze --no-fatal-warnings --no-fatal-infos && flutter build web --release)
npm --prefix functions test
npm --prefix functions run test:rules
npm run web:typecheck
node tool/run.mjs check --category meta
```

Use focused tests while iterating, then run the owning surface's full gate before handoff. Never run multiple Flutter analyzer/test processes concurrently. Add regression coverage beside the owned surface and make recurring architectural rules enforceable through the tool manifest.

Functions tests are discovered recursively from compiled
`functions/lib/**/*.test.js` plus `functions/test/**/*.test.cjs`; rules specs
remain in the emulator-owned `test:rules` lane. Adding a new nested Functions
domain test therefore requires no script edit. CI splits the `test:rules` list
across three emulator jobs with `CATCH_TEST_SHARD=<index>/3`; a local run
without that variable executes the whole list.

`.github/workflows/flutter-ci.yml` compiles Widgetbook on every relevant Flutter
change and publishes an LCOV plus feature-level Markdown coverage artifact.
`.github/workflows/visual-integration-ci.yml` runs desktop goldens with the
checked 0.30% macOS raster tolerance, deterministic headless app-shell wrappers,
and a bounded native macOS app-shell smoke sequentially for relevant changes,
on weekdays, and on manual dispatch. CI sets `CATCH_GOLDEN_REPORT`, so golden
pixel changes and missing baselines are listed in the job summary with their
images retained as CI artifacts instead of failing; render errors and
non-golden expectations still fail. Local `flutter test test/goldens` without
that variable stays strict. The macOS runner lives in `apps/consumer`, so run native passes
from there with a device id and scope—for example,
`(cd apps/consumer && bash ../../tool/test_app_shell_integration.sh macos smoke)`
or `... macos all`. Each native suite has a thin entrypoint in
`apps/consumer/integration_test/` that delegates to the shared suite, because
Flutter runs device tests only from the current project's `integration_test/`
directory; add one when adding a native suite. Live Firebase/device evidence remains a release-runbook lane rather than
being implied by repository integration tests.

Catch Host journeys (`integration_test/host_app_shell_journeys_test.dart`) boot
the Host entrypoint's router against `HostShellBackend`: real Host repositories
over an in-memory Firestore and a recording callable surface whose responses
follow the callable contracts. A screen that calls a callable without a fixture
fails the journey by name, so a new Host read needs a fixture in
`integration_test/support/host_app_shell_test_harness.dart`.

## Coverage and test maintainability

Coverage is an evidence surface, not a global percentage gate:

```sh
flutter test --concurrency=1 --exclude-tags=golden --coverage
node tool/test/flutter_coverage_report.mjs \
  --lcov coverage/lcov.info \
  --format markdown \
  --output coverage/flutter-coverage-summary.md
```

The report separates handwritten code from generated/config code and groups
observed lines by top-level Flutter feature. LCOV does not include files the
test process never loads, so the report says "observed" rather than implying
repository-wide completeness. Use the feature rows to choose focused additions;
do not introduce an aggregate pass/fail threshold without reviewed product-risk
evidence.

New or split Flutter test specs stay at or below 1,200 lines. Existing oversized
specs are recorded exactly and cannot grow:

```sh
node tool/test/check_flutter_test_size.mjs --check
# Only after a reviewed split or reduction:
node tool/test/check_flutter_test_size.mjs --write-baseline
```

`test/dashboard/dashboard_screen_test.dart` is the reference decomposition: its
full-home-shell group lives in the same Dart test library through
`dashboard_full_home_shell_tests.dart`, preserving private fixtures while making
the focused spec independently navigable in failures.

Explore, Event Success, core primitives, Host operations, and Profile use the
same library-part pattern, organized by behavioral area. Their former five
oversized entrypoints are now below the ceiling; each behavior part is also
below the ceiling.

Expected-error tests and deterministic captures should inject
`ErrorLogger.silent(...)` or a recording `consoleSink`. Production defaults
still print and report unexpected failures; never make the global logger silent
to quiet a test.

## Catch UI enforcement

`flutter analyze` remains the generic Flutter/Dart analysis gate, but it does
not load the local Catch UI analyzer plugin in this workspace, and it does not
promote info-level diagnostics to failures the way CI does. A targeted
`dart analyze lib` also skips the plugin.

**To check whether your own code passes**, run the gate CI runs:

```sh
node tool/ci/check_flutter_workspace_analysis.mjs
```

It analyses every Dart and Flutter package with `--fatal-infos`, which is what
turns Catch lints such as `CATCH_NO_WIDGET_RETURNING_METHOD` into failures. A
clean `flutter analyze` is not evidence that this will pass.

**To check whether the enforcement machinery itself is intact**, run the
wrappers below. These verify the rules, the drift baseline, and cross-file
conformance — they are not a substitute for the command above:

```sh
bash tool/check_catch_ui_lints.sh
bash tool/check_catch_ui_lint_drift.sh --check
node tool/design/check_component_enforcement_coverage.mjs
dart run tool/architecture/check_ui_composition_contracts.dart --check
```

`check_catch_ui_lints.sh` rebuilds and seeds the plugin, then asserts each rule
fires against deliberately-violating probe fixtures; **it never analyses `lib/`,
so it passes regardless of whether your code is clean.** The drift gate rejects
analyzer-plugin setup errors and every remaining Catch diagnostic; the resolved
checker owns cross-file screen/shell conformance.

To see every gate CI will run for the change you are about to push, without
maintaining a list by hand:

```sh
node tool/harness/verify_local.mjs --base origin/main --list
```

Drop `--list` to execute them. The gates are read out of `.github/workflows/`,
so this cannot drift from CI.
