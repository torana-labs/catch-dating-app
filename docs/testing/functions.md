---
doc_id: testing_functions
owner: release_operations
status: active
---

# Functions Tests

Part of the testing guide: [TESTS.md](../../TESTS.md) holds the standard suites,
the shared habits and the index of area guides.

Functions tests are discovered recursively from compiled
`functions/lib/**/*.test.js` plus `functions/test/**/*.test.cjs`; rules specs
remain in the emulator-owned `test:rules` lane. Adding a new nested Functions
domain test therefore requires no script edit. On a pull request CI runs
only the discovered files the change can reach (`CATCH_UNIT_TEST_SELECTION`,
from `tool/impact/functions_unit_test_selection.mjs`); a local `npm test` and
the merge queue run them all. For a change outside `functions/` and
`contracts/`, a Functions test runs only when its import tree can read the
changed path. Literal reads need nothing: `readFileSync(path.join(__dirname,
"../../../docs/guide.md"))` or a same-file `const root = path.resolve(__dirname,
"../../..")` joined with literals both count. A helper that reads a computed
path (a parameter, a directory listing) names the roots it stays within at the
top of the file, as Flutter tests do:

```ts
// test-selection-reads: contracts/
```

Without that comment, a computed read, a child process or a dynamic import
keeps every test that reaches the file on the broad rule: it runs whenever the
change's top-level folder is named anywhere in its tree. `--explain` on the
selector shows why each test was picked. After a failed nightly, the
`selection-miss` job of the `Main CI alert` workflow checks each failing Functions test against the
pull request selection of every commit since the last green nightly, and opens
or comments on a "Test selection missed a failing test" issue for any test no
commit selected (`tool/ci/selection_miss_report.mjs`). The `test:rules` lane runs the
strict list in `functions/test/emulator-tests.json`: add each new
emulator-dependent test there, never to `functions/package.json`, whose edits
redeploy every Function. CI chooses the tests once, in the `Plan emulator shards` job, then splits
them across emulator jobs with `CATCH_TEST_SHARD=<index>/<total>`: no job when a
pull request reaches no strict test, one job for up to 15 tests, otherwise
three. The merge queue, main and nightly always run the whole list in three.
A local run without that variable executes the whole list.

Functions tests read repository contracts through `contractFixture("name")`
(`contracts/fixtures/valid/<name>.json`) and `contractFile("dir/x.json")` in
`functions/src/shared/contractFixtures.ts`, each with one string literal. Pull
request selection then runs only the tests that read a changed contract; a path
built from a variable makes that test run for every contract change.
