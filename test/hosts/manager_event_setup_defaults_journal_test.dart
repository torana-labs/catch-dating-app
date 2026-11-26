import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_journal.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  final hash = List.filled(64, 'a').join();
  ManagerEventSetupDefaultsUpdateRequest request(String id) =>
      ManagerEventSetupDefaultsUpdateRequest(
        organizerId: 'club-1',
        requestId: id,
        expectedRevision: 0,
        reviewedDefaultsHash: hash,
        changes: const {
          'currency': {'mode': 'set', 'value': 'INR'},
        },
      );

  test(
    'pending body survives reopen and is isolated by manager and club',
    () async {
      const journal = ManagerEventSetupDefaultsJournal();
      final original = request('request-1');
      await journal.save(userId: 'host-1', request: original);
      expect(
        (await const ManagerEventSetupDefaultsJournal().load(
          userId: 'host-1',
          organizerId: 'club-1',
        ))?.toJson(),
        original.toJson(),
      );
      expect(
        await journal.load(userId: 'host-2', organizerId: 'club-1'),
        isNull,
      );
      expect(
        await journal.load(userId: 'host-1', organizerId: 'club-2'),
        isNull,
      );
      await expectLater(
        journal.save(userId: 'host-1', request: request('request-2')),
        throwsA(anything),
      );
      await journal.clear(userId: 'host-1', request: request('request-2'));
      expect(
        (await journal.load(
          userId: 'host-1',
          organizerId: 'club-1',
        ))?.requestId,
        'request-1',
      );
    },
  );
}
