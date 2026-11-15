import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Every test under packages/catch_ui/test stays inside the package.
///
/// The package-tests job runs the whole Catch UI suite whenever a change
/// reaches its pubspec closure, and tool/ci/flutter_package_scope.mjs adds
/// any repository file a test reaches through a relative directive to that
/// closure. A test that imported a root test/ helper would pull root test/
/// into Catch UI's closure, so a helper edit would run this suite as well as
/// the root shards. Root helpers stay in the root suite.
void main() {
  test(
    'no Catch UI test imports, exports or parts a file outside the package',
    () {
      final package = Directory.current.absolute.uri;
      // A whole directive, so a conditional import's alternatives count too.
      final directive = RegExp(
        r'''^\s*(?:import|export|part)\b[^;]*;''',
        multiLine: true,
      );
      final quoted = RegExp(r'''['"]([^'"]+\.dart)['"]''');
      final escapes = <String>[];
      for (final entity in Directory('test').listSync(recursive: true)) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final source = entity.readAsStringSync();
        for (final statement in directive.allMatches(source)) {
          for (final match in quoted.allMatches(statement.group(0)!)) {
            final uri = match.group(1)!;
            // package:, dart: and other schemes resolve outside the tree.
            if (uri.contains(':')) {
              continue;
            }
            final target = entity.absolute.uri.resolve(uri);
            if (!target.path.startsWith(package.path)) {
              escapes.add('${entity.path}: $uri');
            }
          }
        }
      }
      expect(
        escapes,
        isEmpty,
        reason: 'Move shared helpers into the package instead.',
      );
    },
  );
}
