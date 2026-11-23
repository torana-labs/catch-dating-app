---
doc_id: testing_flutter_selection
owner: release_operations
status: active
---

# Flutter Test Selection

Part of the testing guide: [TESTS.md](../../TESTS.md) holds the standard suites,
the shared habits and the index of area guides.

Flutter CI runs only the root and app-package unit and widget tests a change
can reach;
`docs/release_operations.md` owns the selection rules. To see the selection
for a change locally, install the contract generator's dependencies once with
`npm --prefix functions ci --ignore-scripts`, then run
`dart run tool/harness/lib/flutter_test_selection.dart --base <sha> --head <sha> --output build/ci/flutter-test-plan.json`.
Without those dependencies, a `contracts/**` change selects every test.

## Filesystem reads

Read a repository file in a test through `repoFile()` or `repoDirectory()`
from `package:catch_test_support/repo_file.dart`, giving its path from the
repository root: `repoFile('test/my_feature/fixtures/case.json')`. It names
the same file whichever package directory the test runs from, so the test can
move between packages.

A test or helper that reads files, through those functions or `dart:io`, runs
only when a path it can read changes, if the selector can bound its reads.
Literal paths need nothing: `repoFile('test/my_feature/fixtures/case.json')`,
a same-file constant such as `const _root = 'test/my_feature/fixtures';`, or a
conditional between literals all count. When a path is computed (from a
parameter, the environment or a package root), name the repository roots it
stays within at the top of the file:

```dart
// test-selection-reads: contracts/, packages/catch_ui/assets/fonts/
```

Declared roots are always repository paths. A path given straight to `File`,
`Directory`, `Link` or `FileSystemEntity` is relative to the directory the
test runs from, its package directory: in an app package
(`apps/<app>/test/`), `File('test/fixtures/case.json')` reads
`apps/<app>/test/fixtures/case.json`. A helper in
`packages/catch_test_support/lib/` runs from every package's directory, so a
relative literal path there keeps it a probe; it reads repository files
through `repoFile()`. Keep the comment current when you change what the file
reads. The selector keeps the file a probe that always runs when it uses
`Process`, `Directory.current` or `Platform.script`, when a literal or
constant-prefixed path falls outside the declared roots, or when a declared
root is not in the tree. Paths under `.dart_tool/` and files outside the
repository, such as the Flutter SDK, need no root because they follow global
inputs. A computed path inside a declared root is trusted, so the nightly full
run is the backstop for a declaration that misses a read.
