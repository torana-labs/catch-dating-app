import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/persistence/command_journal_provider.dart';
import 'package:catch_dating_app/core/persistence/command_journal_storage.dart';
import 'package:catch_dating_app/core/persistence/local_command_journal.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part '../../../hosts/data/host_attendance_outbox.g.dart';

abstract interface class HostAttendanceMutator {
  Future<EventAttendeeAttendanceResult> setAttendance({
    required String eventId,
    required String attendeeId,
    required bool desiredCheckedIn,
    required int expectedRevision,
    required String clientOperationId,
  });
}

class RepositoryHostAttendanceMutator implements HostAttendanceMutator {
  const RepositoryHostAttendanceMutator(this._repository);

  final EventAttendeeRepository _repository;

  @override
  Future<EventAttendeeAttendanceResult> setAttendance({
    required String eventId,
    required String attendeeId,
    required bool desiredCheckedIn,
    required int expectedRevision,
    required String clientOperationId,
  }) => _repository.setAttendance(
    eventId: eventId,
    attendeeId: attendeeId,
    desiredCheckedIn: desiredCheckedIn,
    expectedRevision: expectedRevision,
    clientOperationId: clientOperationId,
  );
}

typedef HostAttendanceOutboxStatus = LocalCommandStatus;

class HostAttendanceOutboxEntry {
  const HostAttendanceOutboxEntry({
    required this.eventId,
    required this.attendeeId,
    required this.desiredCheckedIn,
    required this.expectedRevision,
    required this.clientOperationId,
    required this.createdAt,
    required this.status,
    this.lastErrorCode,
  });

  factory HostAttendanceOutboxEntry.fromJson(Map<String, Object?> json) =>
      HostAttendanceOutboxEntry(
        eventId: json['eventId']! as String,
        attendeeId: json['attendeeId']! as String,
        desiredCheckedIn: json['desiredCheckedIn']! as bool,
        expectedRevision: json['expectedRevision']! as int,
        clientOperationId: json['clientOperationId']! as String,
        createdAt: DateTime.fromMillisecondsSinceEpoch(
          json['createdAtMillis']! as int,
        ),
        status: HostAttendanceOutboxStatus.values.byName(
          json['status']! as String,
        ),
        lastErrorCode: json['lastErrorCode'] as String?,
      );

  final String eventId;
  final String attendeeId;
  final bool desiredCheckedIn;
  final int expectedRevision;
  final String clientOperationId;
  final DateTime createdAt;
  final HostAttendanceOutboxStatus status;
  final String? lastErrorCode;

  HostAttendanceOutboxEntry copyWith({
    HostAttendanceOutboxStatus? status,
    String? lastErrorCode,
  }) => HostAttendanceOutboxEntry(
    eventId: eventId,
    attendeeId: attendeeId,
    desiredCheckedIn: desiredCheckedIn,
    expectedRevision: expectedRevision,
    clientOperationId: clientOperationId,
    createdAt: createdAt,
    status: status ?? this.status,
    lastErrorCode: lastErrorCode ?? this.lastErrorCode,
  );

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'attendeeId': attendeeId,
    'desiredCheckedIn': desiredCheckedIn,
    'expectedRevision': expectedRevision,
    'clientOperationId': clientOperationId,
    'createdAtMillis': createdAt.millisecondsSinceEpoch,
    'status': status.name,
    'lastErrorCode': lastErrorCode,
  };
}

class HostAttendanceOutboxSummary {
  const HostAttendanceOutboxSummary(this.entries);

  final List<HostAttendanceOutboxEntry> entries;

  int get pendingCount => entries
      .where((entry) => entry.status == HostAttendanceOutboxStatus.pending)
      .length;
  int get needsReviewCount => entries
      .where((entry) => entry.status == HostAttendanceOutboxStatus.needsReview)
      .length;

  HostAttendanceOutboxEntry? forAttendee(String attendeeId) {
    for (final entry in entries.reversed) {
      if (entry.attendeeId == attendeeId) return entry;
    }
    return null;
  }
}

typedef HostAttendanceOutboxStore =
    LocalCommandJournal<HostAttendanceOutboxEntry>;

HostAttendanceOutboxStore createHostAttendanceJournal({
  required Future<CommandJournalStorage> Function() storage,
  required String? Function() currentAccountId,
  Future<String?> Function(String)? loadLegacy,
  Future<void> Function(String)? clearLegacy,
}) => LocalCommandJournal(
  storage: storage,
  namespace: 'host_attendance',
  currentAccountId: currentAccountId,
  loadLegacy: loadLegacy,
  clearLegacy: clearLegacy,
  codec: LocalCommandCodec(
    encode: (entry) => entry.toJson(),
    decode: HostAttendanceOutboxEntry.fromJson,
    scope: (entry) => entry.eventId,
    resources: (entry) => {'attendee:${entry.attendeeId}'},
  ),
);

class HostAttendanceOutbox {
  const HostAttendanceOutbox(this._journal, this._attendees);
  static const reviewAfter = LocalCommandJournal.reviewAfter;
  final HostAttendanceOutboxStore _journal;
  final HostAttendanceMutator _attendees;

  Future<HostAttendanceOutboxSummary> loadAll({
    required String accountId,
    DateTime? now,
  }) async =>
      HostAttendanceOutboxSummary(await _journal.load(accountId, now: now));

  Future<HostAttendanceOutboxSummary> loadForEvent({
    required String accountId,
    required String eventId,
    DateTime? now,
  }) async => HostAttendanceOutboxSummary(
    await _journal.load(accountId, scope: eventId, now: now),
  );

  Future<HostAttendanceOutboxSummary> enqueueAndAttempt({
    required String accountId,
    required HostAttendanceOutboxEntry entry,
    required bool offline,
  }) async {
    await _journal.append(accountId, entry);
    if (!offline) await _journal.flush(accountId, entry.eventId, _execute);
    return loadForEvent(accountId: accountId, eventId: entry.eventId);
  }

  Future<HostAttendanceOutboxSummary> flushEvent({
    required String accountId,
    required String eventId,
  }) async {
    await _journal.flush(accountId, eventId, _execute);
    return loadForEvent(accountId: accountId, eventId: eventId);
  }

  Future<HostAttendanceOutboxSummary> clearNeedsReview({
    required String accountId,
    required String eventId,
  }) async {
    await _journal.dismissReview(accountId, eventId);
    return loadForEvent(accountId: accountId, eventId: eventId);
  }

  Future<void> _execute(HostAttendanceOutboxEntry entry) async {
    await _attendees.setAttendance(
      eventId: entry.eventId,
      attendeeId: entry.attendeeId,
      desiredCheckedIn: entry.desiredCheckedIn,
      expectedRevision: entry.expectedRevision,
      clientOperationId: entry.clientOperationId,
    );
  }
}

// keepalive: shared durable command policy across Host work surfaces.
@Riverpod(keepAlive: true)
HostAttendanceOutboxStore hostAttendanceOutboxStore(Ref ref) {
  final auth = ref.watch(firebaseAuthProvider);
  return createHostAttendanceJournal(
    storage: ref.watch(commandJournalStorageProvider),
    currentAccountId: () => auth.currentUser?.uid,
    loadLegacy: (accountId) =>
        loadLegacyCommandJournal('host_attendance_outbox_v1_', accountId),
    clearLegacy: (accountId) =>
        clearLegacyCommandJournal('host_attendance_outbox_v1_', accountId),
  );
}

// keepalive: commands survive navigation between event work surfaces.
@Riverpod(keepAlive: true)
HostAttendanceOutbox hostAttendanceOutbox(Ref ref) => HostAttendanceOutbox(
  ref.watch(hostAttendanceOutboxStoreProvider),
  RepositoryHostAttendanceMutator(ref.watch(eventAttendeeRepositoryProvider)),
);
