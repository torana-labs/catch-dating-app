import 'dart:convert';
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
final _probeRun = RegExp(r'^(tool/catch_ui_lints_probe/[^/]+)/\d+/(?:arch/)?');
// lib/hosts/today, create, insights, live, onboarding, door, organizer, forms
// and events (all but its legacy presentation folder, which still holds the
// routed moments screens) are host destinations redrawn in place until the host router moves into
// apps/host; they hold the same rules as an app package.
final _newRoot = RegExp(
  r'^(?:apps/[^/]+/lib|lib/pages|lib/hosts/(?:today|create|insights|live|onboarding|door|organizer|forms|people|programmes|events(?!/presentation/)))/',
);

/// The carried list: files under the new roots that still hold the rules of
/// the legacy path they came from. Only the Phase 4 codemod adds entries, and
/// `catch_arch_stale_carry` reports an entry the file no longer needs.
const carriedScreensPath = 'tool/architecture/carried_screens.json';

/// Whether a repository-relative path sits under a D24 root.
bool newRootPath(String relative) =>
    _newRoot.hasMatch(relative.replaceFirst(_probeRun, ''));

String? _repositoryPath(String path) {
  final normalized = path.replaceAll(r'\', '/');
  final root = migrationRepositoryRoot(normalized);
  if (root == null) return null;
  return normalized.substring(root.length + 1).replaceFirst(_probeRun, '');
}

/// The legacy path whose rules the carried file at this absolute path keeps,
/// or null when the file is not carried. A lint fixture is carried when its
/// run folder's own `carried_screens.json` or the repository's list names the
/// path it stands for.
String? carriedFrom(String path) {
  final normalized = path.replaceAll(r'\', '/');
  final root = migrationRepositoryRoot(normalized);
  if (root == null) return null;
  final relative = normalized.substring(root.length + 1);
  final probe = _probeRun.firstMatch(relative);
  final key = relative.replaceFirst(_probeRun, '');
  if (probe != null) {
    final run = _carriedList(File('$root/${probe[1]}/carried_screens.json'));
    if (run[key] case final from?) return from;
  }
  return _carriedList(File('$root/$carriedScreensPath'))[key];
}

/// Whether this absolute path is on the carried list.
bool carriedPath(String path) => carriedFrom(path) != null;

/// Whether D24 holds this absolute path at zero drawing.
bool zeroDrawingPath(String path) =>
    newRootSourcePath(path) && !carriedPath(path);

/// Whether this absolute path is handwritten code under a D24 root, carried or
/// not: what `catch_arch_stale_carry` holds a carried file to.
bool newRootSourcePath(String path) {
  final relative = _repositoryPath(path);
  return relative != null &&
      newRootPath(relative) &&
      !relative.endsWith('.g.dart') &&
      !relative.endsWith('.freezed.dart');
}

final _carriedCache =
    <String, ({DateTime modified, Map<String, String> map})>{};

/// The `{path: from}` entries of one carried list, reread when it changes. A
/// missing or malformed list carries nothing, so every file meets the new-root
/// rules and the mistake is loud.
Map<String, String> _carriedList(File file) {
  if (!file.existsSync()) return const {};
  final modified = file.statSync().modified;
  final cached = _carriedCache[file.path];
  if (cached != null && cached.modified == modified) return cached.map;
  final map = parseCarriedScreens(file.readAsStringSync());
  _carriedCache[file.path] = (modified: modified, map: map);
  return map;
}

/// Parses `{"carried": [{"path": ..., "from": ...}]}` into `{path: from}`.
Map<String, String> parseCarriedScreens(String source) {
  try {
    final json = jsonDecode(source);
    if (json is! Map<String, dynamic> || json['carried'] is! List) {
      return const {};
    }
    return {
      for (final entry in (json['carried'] as List).whereType<Map>())
        if (entry['path'] case final String path)
          if (entry['from'] case final String from) path: from,
    };
  } on FormatException {
    return const {};
  }
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
