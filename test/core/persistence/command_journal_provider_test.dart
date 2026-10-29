import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_provider.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('legacy reads and cleanup stay within the requested account', () async {
    SharedPreferences.setMockInitialValues({
      'legacy_a': 'original a',
      'legacy_b': 'original b',
    });
    expect(await loadLegacyCommandJournal('legacy_', 'a'), 'original a');
    await clearLegacyCommandJournal('legacy_', 'a');
    expect(await loadLegacyCommandJournal('legacy_', 'a'), isNull);
    expect(await loadLegacyCommandJournal('legacy_', 'b'), 'original b');
  });

  test(
    'invalid legacy storage is typed and preserved without raw diagnostics',
    () async {
      SharedPreferences.setMockInitialValues({'legacy_private-account': 42});
      await expectLater(
        loadLegacyCommandJournal('legacy_', 'private-account'),
        throwsA(
          isA<BackendOperationException>()
              .having(
                (error) => error.code,
                'code',
                'local-journal-unavailable',
              )
              .having((error) => error.cause, 'cause', isNull)
              .having((error) => error.debugMessage, 'debugMessage', isNull)
              .having(
                (error) => error.context?.action,
                'action',
                'read legacy command journal',
              ),
        ),
      );
      expect(
        (await SharedPreferences.getInstance()).get('legacy_private-account'),
        42,
      );
    },
  );
}
