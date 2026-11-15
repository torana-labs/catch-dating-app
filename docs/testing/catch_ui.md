# Catch UI Enforcement

Part of the testing guide: [TESTS.md](../../TESTS.md) holds the standard suites,
the shared habits and the index of area guides.

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
