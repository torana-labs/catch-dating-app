# Flutter Package, Golden And Native Suites

Part of the testing guide: [TESTS.md](../../TESTS.md) holds the standard suites,
the shared habits and the index of area guides.

`.github/workflows/flutter-ci.yml` runs the Kernel, Catch UI, Consumer and Host
package suites and compiles Widgetbook in one job, "Catch UI, Consumer & Host
package tests", on every relevant Flutter change; a failing suite doesn't stop
the others, and the job summary lists each outcome. On
a pull request each package suite and Widgetbook run only when the change
reaches its pubspec path-dependency closure
(`tool/ci/flutter_package_scope.mjs`; React-only `packages/*` with no pubspec
reach none unless a closure bundles or imports them); a skipped suite leaves its job green
with a "not affected" reason in the job summary. Locally,
`node tool/harness/verify_local.mjs` runs them all. A test of `catch_ui` (or
`catch_tokens`) alone that needs no root test helper belongs in
`packages/catch_ui/test`, where its suite already runs on every change that
reaches it; `no_root_test_imports_test.dart` keeps that tree from importing
root `test/` files. Each test shard uploads its
own LCOV; nightly and unverified main runs merge them into a feature-level
Markdown coverage report. The iOS simulator builds in
`.github/workflows/app-build-matrix.yml` run in the merge queue only for a
change to an iOS build input, and every night;
`node --test tool/ci/ios_build_inputs.test.mjs` pins that list against
`nx.json` and the tracked native files.
`.github/workflows/visual-integration-ci.yml` runs desktop goldens with the
checked 0.30% macOS raster tolerance, deterministic headless app-shell wrappers,
and a bounded native macOS app-shell smoke as parallel jobs. `ci.yml` calls it
for relevant changes, in the daily scheduled run, and on manual dispatch. CI sets `CATCH_GOLDEN_REPORT`, so golden
pixel changes and missing baselines are listed in the job summary with their
images retained as CI artifacts instead of failing; render errors and
non-golden expectations still fail. Local `flutter test test/goldens` without
that variable stays strict.

The library's own goldens live with the library: every golden family that
renders only `package:catch_ui` and `package:catch_tokens` is in
`packages/catch_ui/test/goldens`, with its baselines, its own
`flutter_test_config.dart` and font loader, and the `golden` tag declared in
`packages/catch_ui/dart_test.yaml`. The Linux "Catch UI package tests" job runs
`flutter test --concurrency=1 --exclude-tags=golden` there; the macOS goldens
job runs `(cd packages/catch_ui && flutter test --concurrency=1 --tags=golden)`
after `test/goldens`, with the same `CATCH_GOLDEN_REPORT`, and keeps both
failure folders. `test/goldens` holds only the goldens that import the app or
the platform. Locally, `(cd packages/catch_ui && flutter test --concurrency=1)`
runs the package's tests and goldens together. The macOS runner lives in `apps/consumer`, so run native passes
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
