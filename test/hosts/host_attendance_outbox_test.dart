import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/persistence/local_command_journal.dart';
import 'package:catch_dating_app/platform/persistence/memory_command_journal_storage.dart';
import 'package:flutter_test/flutter_test.dart';

class MemoryOutboxStore extends LocalCommandJournal<HostAttendanceOutboxEntry> {
  MemoryOutboxStore() : this._(MemoryCommandJournalStorage());
  MemoryOutboxStore._(MemoryCommandJournalStorage memory)
    : super(
        storage: () async => memory,
        namespace: 'test',
        currentAccountId: () => accountId,
        codec: createHostAttendanceJournal(
          storage: () async => memory,
          currentAccountId: () => accountId,
        ).codec,
      );
  static String accountId = 'staff-1';
  Future<void> save(
    String accountId,
    List<HostAttendanceOutboxEntry> entries,
  ) async {
    for (final entry in entries) {
      await append(accountId, entry);
    }
  }
}

class FakeAttendanceMutator implements HostAttendanceMutator {
  final List<HostAttendanceOutboxEntry> calls = [];
  AppException? error;

  @override
  Future<EventAttendeeAttendanceResult> setAttendance({
    required String eventId,
    required String attendeeId,
    required bool desiredCheckedIn,
    required int expectedRevision,
    required String clientOperationId,
  }) async {
    calls.add(
      HostAttendanceOutboxEntry(
        eventId: eventId,
        attendeeId: attendeeId,
        desiredCheckedIn: desiredCheckedIn,
        expectedRevision: expectedRevision,
        clientOperationId: clientOperationId,
        createdAt: DateTime(2026),
        status: HostAttendanceOutboxStatus.pending,
      ),
    );
    if (error case final failure?) throw failure;
    return EventAttendeeAttendanceResult(
      attendeeId: attendeeId,
      checkedIn: desiredCheckedIn,
      acceptedRevision: expectedRevision + 1,
      replayed: false,
      changed: true,
    );
  }
}

HostAttendanceOutboxEntry entry({
  String operationId = 'operation_1234567890',
  DateTime? createdAt,
}) => HostAttendanceOutboxEntry(
  eventId: 'event-1',
  attendeeId: 'attendee-1',
  desiredCheckedIn: true,
  expectedRevision: 4,
  clientOperationId: operationId,
  createdAt: createdAt ?? DateTime.now(),
  status: HostAttendanceOutboxStatus.pending,
);

void main() {
  test('offline enqueue persists only replay-safe attendance fields', () async {
    final store = MemoryOutboxStore();
    final mutator = FakeAttendanceMutator();
    final outbox = HostAttendanceOutbox(store, mutator);

    final summary = await outbox.enqueueAndAttempt(
      accountId: 'staff-1',
      entry: entry(),
      offline: true,
    );

    expect(summary.pendingCount, 1);
    expect(mutator.calls, isEmpty);
    final json = (await store.load('staff-1')).single.toJson();
    expect(json.keys, {
      'eventId',
      'attendeeId',
      'desiredCheckedIn',
      'expectedRevision',
      'clientOperationId',
      'createdAtMillis',
      'status',
      'lastErrorCode',
    });
    expect(json.toString(), isNot(contains('phone')));
    expect(json.toString(), isNot(contains('displayName')));
  });

  test(
    'flush reuses the original absolute operation and removes success',
    () async {
      final store = MemoryOutboxStore();
      final mutator = FakeAttendanceMutator();
      final outbox = HostAttendanceOutbox(store, mutator);
      await store.save('staff-1', [entry()]);

      final summary = await outbox.flushEvent(
        accountId: 'staff-1',
        eventId: 'event-1',
      );

      expect(summary.entries, isEmpty);
      expect(mutator.calls.single.clientOperationId, 'operation_1234567890');
      expect(mutator.calls.single.desiredCheckedIn, true);
      expect(mutator.calls.single.expectedRevision, 4);
    },
  );

  test('retryable network failure remains pending for a later flush', () async {
    final store = MemoryOutboxStore();
    final mutator = FakeAttendanceMutator()
      ..error = const NetworkException('offline', 'Offline');
    final outbox = HostAttendanceOutbox(store, mutator);
    await store.save('staff-1', [entry()]);

    final summary = await outbox.flushEvent(
      accountId: 'staff-1',
      eventId: 'event-1',
    );

    expect(summary.pendingCount, 1);
    expect(summary.needsReviewCount, 0);
  });

  test('revision conflict stops replay and requires visible review', () async {
    final store = MemoryOutboxStore();
    final mutator = FakeAttendanceMutator()
      ..error = const BackendOperationException(
        code: 'aborted',
        message: 'Roster changed',
        context: BackendErrorContext(
          service: BackendService.functions,
          action: 'set attendance',
        ),
        retryable: true,
      );
    final outbox = HostAttendanceOutbox(store, mutator);
    await store.save('staff-1', [entry()]);

    final summary = await outbox.flushEvent(
      accountId: 'staff-1',
      eventId: 'event-1',
    );

    expect(summary.pendingCount, 0);
    expect(summary.needsReviewCount, 1);
    expect(summary.entries.single.lastErrorCode, 'aborted');
  });

  test(
    'old observations require review and are never silently deleted',
    () async {
      final store = MemoryOutboxStore();
      final outbox = HostAttendanceOutbox(store, FakeAttendanceMutator());
      await store.save('staff-1', [
        entry(createdAt: DateTime(2026, 8)),
        entry(
          operationId: 'operation_0987654321',
          createdAt: DateTime(2026, 6),
        ),
      ]);

      final summary = await outbox.loadForEvent(
        accountId: 'staff-1',
        eventId: 'event-1',
        now: DateTime(2026, 8, 12),
      );

      expect(summary.entries, hasLength(2));
      expect(summary.needsReviewCount, 2);
    },
  );

  test('outboxes stay isolated between signed-in accounts', () async {
    final store = MemoryOutboxStore();
    final outbox = HostAttendanceOutbox(store, FakeAttendanceMutator());
    await store.save('staff-1', [entry()]);

    MemoryOutboxStore.accountId = 'staff-2';
    final other = await outbox.loadForEvent(
      accountId: 'staff-2',
      eventId: 'event-1',
      now: DateTime(2026, 8, 12),
    );

    expect(other.entries, isEmpty);
    MemoryOutboxStore.accountId = 'staff-1';
  });

  test(
    'loadAll normalizes the complete account queue for Host Today',
    () async {
      final store = MemoryOutboxStore();
      final outbox = HostAttendanceOutbox(store, FakeAttendanceMutator());
      await store.save('staff-1', [
        entry(createdAt: DateTime(2026, 8)),
        HostAttendanceOutboxEntry(
          eventId: 'event-2',
          attendeeId: 'attendee-2',
          desiredCheckedIn: false,
          expectedRevision: 2,
          clientOperationId: 'operation_2222222222',
          createdAt: DateTime(2026, 8, 11),
          status: HostAttendanceOutboxStatus.pending,
        ),
      ]);

      final summary = await outbox.loadAll(
        accountId: 'staff-1',
        now: DateTime(2026, 8, 12),
      );

      expect(summary.entries.map((item) => item.eventId), [
        'event-1',
        'event-2',
      ]);
      expect(summary.needsReviewCount, 1);
      expect(await store.load('staff-1'), hasLength(2));
    },
  );
}
