import 'dart:io';

import 'package:catch_test_support/repo_file.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'the retired Programs list and create modal cannot return as hidden source',
    () {
      expect(
        repoFile(
          'lib/programs/presentation/program_list_screen.dart',
        ).existsSync(),
        isFalse,
      );
      final retiredSymbols = RegExp(
        r'\b(?:ProgramListScreen|ProgramListPageBody|ProgramCreateDialog)\b|program_list_screen\.dart',
      );
      final violations = <String>[];
      // This guard is intentionally scoped to executable app/catalog/test Dart.
      // The legacy route identity remains supported as a redirect to Events.
      for (final root in [
        'lib',
        'widgetbook/lib',
        'test/programs',
        'test/hosts',
      ]) {
        for (final file in Directory(
          root,
        ).listSync(recursive: true).whereType<File>()) {
          if (file.path.endsWith('.dart') &&
              retiredSymbols.hasMatch(file.readAsStringSync())) {
            violations.add(file.path);
          }
        }
      }
      expect(violations, isEmpty);
    },
  );
}
