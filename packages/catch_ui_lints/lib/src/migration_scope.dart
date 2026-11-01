import 'dart:io';

bool migrationScope(String relative) =>
    (relative.startsWith('lib/') ||
        RegExp(r'^apps/[^/]+/lib/').hasMatch(relative) ||
        relative.startsWith('tool/catch_ui_lints_probe/')) &&
    !relative.startsWith('lib/platform/theme/') &&
    !relative.startsWith('lib/platform/schema_contracts/generated/') &&
    !relative.startsWith('lib/l10n/generated/') &&
    !relative.endsWith('.g.dart') &&
    !relative.endsWith('.freezed.dart');

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
