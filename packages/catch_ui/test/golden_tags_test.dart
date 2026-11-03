import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

// The Linux package job runs `--exclude-tags=golden` and the macOS lane runs
// `--tags=golden`, so a golden file without the file-level tag would compare
// macOS baselines on Linux. A per-test tag does not cover the file's other
// tests, so the tag is on the library.
void main() {
  test('every golden test file under test/goldens is tagged golden', () {
    final tag = RegExp(r"^@Tags\(\['golden'\]\)\nlibrary;\n");
    final checked = <String>[];
    final untagged = <String>[];
    for (final entity in Directory('test/goldens').listSync(recursive: true)) {
      if (entity is! File || !entity.path.endsWith('_test.dart')) continue;
      final source = entity.readAsStringSync();
      if (!source.contains('matchesGoldenFile') &&
          !source.contains('matchCatchGolden')) {
        continue;
      }
      checked.add(entity.path);
      if (!tag.hasMatch(source)) untagged.add(entity.path);
    }
    expect(checked, isNotEmpty, reason: 'test/goldens must hold the goldens');
    expect(
      untagged,
      isEmpty,
      reason: "Start each file with @Tags(['golden']) and library;.",
    );
  });
}
