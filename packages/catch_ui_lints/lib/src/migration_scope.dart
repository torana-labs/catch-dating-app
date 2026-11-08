import 'dart:io';

bool migrationScope(String relative) =>
    (relative.startsWith('lib/') ||
        relative.startsWith('packages/platform/lib/') ||
        RegExp(r'^apps/[^/]+/lib/').hasMatch(relative) ||
        relative.startsWith('tool/catch_ui_lints_probe/')) &&
    !relative.startsWith('packages/platform/lib/theme/') &&
    !relative.startsWith('packages/platform/lib/schema_contracts/generated/') &&
    !relative.endsWith('.g.dart') &&
    !relative.endsWith('.freezed.dart');

// A lint fixture stands for the path under its run folder.
final _probeRun = RegExp(r'^tool/catch_ui_lints_probe/[^/]+/\d+/(?:arch/)?');
// lib/hosts/today, lib/hosts/create and lib/hosts/onboarding are host
// destinations redrawn in place until the host router moves into apps/host;
// they hold the same rules as an app package.
final _newRoot = RegExp(
  r'^(?:apps/[^/]+/lib|lib/pages|lib/hosts/today|lib/hosts/create|lib/hosts/onboarding)/',
);

/// These two predate D24 and are redrawn in P6, so they keep what the rest of
/// `lib/` tolerates until then. The list only shrinks: a test fails when it
/// gains an entry or names a file that is gone. `apps/*/lib` has no list.
const newRootLegacyFiles = <String>{
  'lib/pages/celebration/celebration_screen.dart',
  'lib/pages/startup/splash_screen.dart',
};

/// Whether a repository-relative path sits under a D24 root.
bool newRootPath(String relative) =>
    _newRoot.hasMatch(relative.replaceFirst(_probeRun, ''));

String? _repositoryPath(String path) {
  final normalized = path.replaceAll(r'\', '/');
  final root = migrationRepositoryRoot(normalized);
  if (root == null) return null;
  return normalized.substring(root.length + 1).replaceFirst(_probeRun, '');
}

/// Whether this absolute path is on [newRootLegacyFiles].
bool newRootLegacyPath(String path) =>
    newRootLegacyFiles.contains(_repositoryPath(path));

/// Whether D24 holds this absolute path at zero drawing.
bool zeroDrawingPath(String path) {
  final relative = _repositoryPath(path);
  return relative != null &&
      newRootPath(relative) &&
      !newRootLegacyFiles.contains(relative) &&
      !relative.endsWith('.g.dart') &&
      !relative.endsWith('.freezed.dart');
}

String? migrationRepositoryRoot(String path) {
  var directory = File(path).parent;
  while (directory.parent.path != directory.path) {
    if (File('${directory.path}/.git').existsSync() ||
        Directory('${directory.path}/.git').existsSync()) {
      return directory.path;
    }
    directory = directory.parent;
  }
  return null;
}
