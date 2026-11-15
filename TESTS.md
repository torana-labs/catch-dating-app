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
(cd packages/catch_ui && flutter test --concurrency=1)
node tool/run.mjs check test:flutter-test-size
(cd widgetbook && flutter analyze --no-fatal-warnings --no-fatal-infos && flutter build web --release)
npm --prefix functions test
npm --prefix functions run test:rules
npm run web:typecheck
node tool/run.mjs check --category meta
```

For Admin work, run `npm run check:admin` before pushing. It runs CI's Admin lane locally, reading the steps from `.github/workflows/react-surface-validation.yml`, plus the Admin checks in the contracts and tools lanes: the build with its import boundaries and bundle budget, unused code, Storybook accessibility and the visual report, design parity, the callable validators and the action catalog. It takes about 8 minutes; `-- --pr` skips the Storybook build and visual report, and `-- --only <text>` runs one step.

Use focused tests while iterating, then run the owning surface's full gate before handoff. Never run multiple Flutter analyzer/test processes concurrently. Add regression coverage beside the owned surface and make recurring architectural rules enforceable through the tool manifest.

## Area guides

Each guide owns one area's testing commands and policy. Add new guidance to the
guide that owns its area, not to this file.

| Area | Guide |
|---|---|
| Functions unit, emulator and contract-fixture tests; pull request selection | [docs/testing/functions.md](docs/testing/functions.md) |
| Flutter root test selection, including "Filesystem reads" and `// test-selection-reads:` | [docs/testing/flutter_selection.md](docs/testing/flutter_selection.md) |
| Flutter package suites, iOS builds, goldens, native app-shell suites and Host journeys | [docs/testing/flutter_suites.md](docs/testing/flutter_suites.md) |
| Coverage reports and the Flutter test-size ceiling | [docs/testing/coverage.md](docs/testing/coverage.md) |
| Catch UI analyzer enforcement and the local CI gate list | [docs/testing/catch_ui.md](docs/testing/catch_ui.md) |

## Test and debug habits

- Use `flushTestEventQueue` rather than a raw `Future<void>.delayed(Duration.zero)`
  when a test needs queued provider, stream or callback delivery.
- Give a custom tap target stable semantics, a label, a tooltip or a key that
  describes the user's action before writing a finder for it.
- When you edit Riverpod, Freezed, json_serializable or other `build_runner`
  sources, keep what `build_runner` generates rather than reverting hash or output
  churn. `dart run build_runner watch` suits a long clean-up loop.
- When someone is clicking through the app on a physical phone, run an interactive
  `flutter run` through `tool/flutter_with_env.sh`, keep stdin open for reload and
  restart, and read the fresh logs as your feedback.

## Generated Contract Outputs

The schema contract outputs are generated, not tracked: `packages/platform/lib/schema_contracts/generated`, `lib/contexts/*/data/generated`, `functions/src/shared/generated` (except `brand.ts` and `notificationCopyEn.ts`), `admin/src/generated/contracts`, `tool/contracts/generated` and `website/src/shared/contracts/generated`. Bootstrapping a worktree generates them. Run `npm run generate:contracts` after a pull that touches `contracts/**` or the generator, and the IDE analyzer needs the Dart tree present. The pre-commit hook regenerates them when you stage an input.
