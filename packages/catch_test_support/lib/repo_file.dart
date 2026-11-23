import 'dart:io';

/// Files read by their repository path, whatever directory the test runs in.
///
/// `flutter test` runs each package's tests from that package's directory: the
/// repository root, `apps/<app>`, `widgetbook` or `packages/<package>`. A
/// relative `File('test/fixtures/case.json')` therefore names a different file
/// in each, and breaks when a test moves between packages. `repoFile` takes
/// the path from the repository root instead:
///
/// ```dart
/// final json = repoFile('contracts/fixtures/valid/event.json');
/// ```
///
/// The Flutter test selector reads `repoFile` and `repoDirectory` arguments
/// as repository paths (docs/testing/flutter_selection.md, "Filesystem
/// reads"), so a literal path here needs no `test-selection-reads` comment.
File repoFile(String path) => File(_resolve(path));

/// The directory at [path] from the repository root; see [repoFile].
Directory repoDirectory(String path) => Directory(_resolve(path));

/// The repository root: the nearest directory, from the working directory
/// up, whose `pubspec.yaml` declares the root package.
Directory get repoRoot => _repoRoot ??= _findRepoRoot();
Directory? _repoRoot;

const _rootPackage = 'catch_dating_app';

String _resolve(String path) {
  if (path.isEmpty ||
      path.startsWith('/') ||
      path.contains(r'\') ||
      path.split('/').any((segment) => segment == '..' || segment == '.')) {
    throw ArgumentError.value(
      path,
      'path',
      'Use a path from the repository root, such as contracts/fixtures',
    );
  }
  return '${repoRoot.path}/$path';
}

Directory _findRepoRoot() {
  final rootName = RegExp('^name:\\s*$_rootPackage\\s*\$', multiLine: true);
  var directory = Directory.current.absolute;
  while (true) {
    final pubspec = File('${directory.path}/pubspec.yaml');
    if (pubspec.existsSync() && rootName.hasMatch(pubspec.readAsStringSync())) {
      return directory;
    }
    final parent = directory.parent;
    if (parent.path == directory.path) {
      throw StateError(
        'No directory above ${Directory.current.path} has a pubspec.yaml '
        'for $_rootPackage; run tests from inside the repository.',
      );
    }
    directory = parent;
  }
}
