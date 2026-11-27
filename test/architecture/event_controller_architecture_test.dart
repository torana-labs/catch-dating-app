import 'dart:io';
import 'package:catch_test_support/repo_file.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'event flow owners use generated Riverpod providers instead of ChangeNotifier',
    () {
      const controllers = [
        'create/private_event_details_controller',
        'create/private_event_preferences_controller',
        'forms/event_offer_preferences_controller',
        'create/event_publication_controller',
        'forms/host_event_offer_controller',
        'forms/host_event_offer_workspace_controller',
        'forms/host_form_admission_controller',
      ];
      for (final controller in controllers) {
        final path = 'lib/hosts/$controller.dart';
        final source = repoFile(path).readAsStringSync();
        expect(source, isNot(contains('extends ChangeNotifier')), reason: path);
        expect(source, isNot(contains('notifyListeners(')), reason: path);
        expect(
          source,
          matches(r'@(?:riverpod|Riverpod\(dependencies:)'),
          reason: path,
        );
        expect(
          repoFile('lib/hosts/$controller.g.dart').existsSync(),
          isTrue,
          reason: path,
        );
      }
      for (final root in ['lib/events', 'lib/hosts/create']) {
        for (final file in repoDirectory(
          root,
        ).listSync(recursive: true).whereType<File>()) {
          if (!file.path.endsWith('.dart') ||
              file.path.endsWith('.g.dart') ||
              file.path.endsWith('.freezed.dart')) {
            continue;
          }
          expect(
            file.readAsStringSync(),
            isNot(matches(r'extends\s+(?:ChangeNotifier|StateNotifier)\b')),
            reason: file.path,
          );
        }
      }
    },
  );
}
