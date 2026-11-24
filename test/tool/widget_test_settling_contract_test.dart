import 'dart:io';

import 'package:catch_test_support/repo_file.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('feature tests use bounded semantic pumping', () {
    final forbiddenCall =
        'pumpAnd'
        'Settle(';
    final violations = <String>[];

    for (final file
        in repoDirectory('test')
            .listSync(recursive: true)
            .whereType<File>()
            .where((file) => file.path.endsWith('.dart'))) {
      final source = file.readAsStringSync();
      if (source.contains(forbiddenCall)) violations.add(file.path);
    }

    expect(
      violations,
      isEmpty,
      reason:
          'Use pumpFeatureUi or a flow-specific bounded helper instead of raw '
          'broad settling in feature tests.',
    );
  });
}
