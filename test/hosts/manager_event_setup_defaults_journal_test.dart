import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_journal.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'event_controller_test_support.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  final hash = List.filled(64, 'a').join();
  ManagerEventSetupDefaults snapshot(int revision) => ManagerEventSetupDefaults(
    organizerId: 'club-1',
    cityId: null,
    marketId: null,
    timezone: null,
    organizerDefaultsRevision: null,
    basicsReviewedHash: hash,
    preferencesRevision: revision,
    preferences: const ManagerEventSetupPreferences(),
    preferencesHash: hash,
    reviewedDefaultsHash: hash,
  );
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

  test(
    'lost response, revocation, and reopen reuse the exact command',
    () async {
      final sent = <Map<String, Object?>>[];
      var attempts = 0;
      Future<ManagerEventSetupDefaultsUpdateReceipt> write(
        ManagerEventSetupDefaultsUpdateRequest value,
      ) async {
        sent.add(value.toJson());
        attempts++;
        if (attempts == 1) throw StateError('response lost');
        if (attempts == 2) throw StateError('permission denied');
        return ManagerEventSetupDefaultsUpdateReceipt(
          appliedRevision: 1,
          current: snapshot(1),
          replayed: true,
        );
      }

      final first = TestHostManagerEventSetupDefaultsController(
        organizerId: 'club-1',
        userId: 'host-1',
        read: (_) async => snapshot(0),
        write: write,
      );
      await first.load();
      await first.save(const ManagerEventSetupPreferences(currency: 'INR'));
      expect(first.pending, isNotNull);
      expect(first.canEdit, isFalse);
      final frozen = first.pending!.toJson();
      first.dispose();

      final reopened = TestHostManagerEventSetupDefaultsController(
        organizerId: 'club-1',
        userId: 'host-1',
        read: (_) async => snapshot(0),
        write: write,
      );
      await reopened.load();
      expect(reopened.pending?.toJson(), frozen);
      await reopened.retryPending();
      expect(reopened.pending?.toJson(), frozen);
      expect(reopened.canEdit, isFalse);
      await reopened.retryPending();
      expect(sent, everyElement(frozen));
      expect(reopened.pending, isNull);
      expect(reopened.current?.preferencesRevision, 1);
      expect(
        await const ManagerEventSetupDefaultsJournal().load(
          userId: 'host-1',
          organizerId: 'club-1',
        ),
        isNull,
      );
      reopened.dispose();
    },
  );

  test('failed manager reread cannot edit a stale defaults snapshot', () async {
    var denied = false;
    final controller = TestHostManagerEventSetupDefaultsController(
      organizerId: 'club-1',
      userId: 'host-1',
      read: (_) async {
        if (denied) throw StateError('manager access revoked');
        return snapshot(0);
      },
      write: (_) async => throw StateError('must not write'),
    );
    await controller.load();
    expect(controller.canEdit, isTrue);
    denied = true;
    await controller.load();
    expect(controller.current, isNull);
    expect(controller.canEdit, isFalse);
    expect(controller.error, isNotNull);
    controller.dispose();
  });
}
