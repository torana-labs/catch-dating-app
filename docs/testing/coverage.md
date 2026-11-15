---
doc_id: testing_coverage
owner: release_operations
status: active
---

# Coverage And Test Maintainability

Part of the testing guide: [TESTS.md](../../TESTS.md) holds the standard suites,
the shared habits and the index of area guides.

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
