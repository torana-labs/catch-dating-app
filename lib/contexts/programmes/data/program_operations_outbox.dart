import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/dispatch_manifest.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_provider.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_storage.dart';
import 'package:catch_dating_app/platform/persistence/local_command_journal.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';

part 'program_operations_outbox.g.dart';

/// Idempotent writes the arrivals workspace must never lose while the
/// airport concourse is offline: leg observations and vehicle dispatch.
abstract interface class ProgramOperationsMutator {
  Future<ProgramMutationResult> setReadiness({
    required String programId,
    required String legId,
    required String action,
    required String clientOperationId,
    required int expectedRevision,
    required DateTime observedAt,
    TravelLegObservationReference? afterObservation,
    int? manualCurbAtMillis,
    String? manualCurbNote,
  });

  Future<DispatchResult> dispatchTrip({
    required String programId,
    required String pickupPointId,
    required String vehicleClassId,
    required String plateDisplay,
    required List<String> legIds,
    required DateTime departedAt,
    required String clientOperationId,
    String? destinationHotelId,
    String? destinationLabel,
    String? vendorId,
    required List<DispatchLegRevision> expectedLegRevisions,
  });

  Future<ProgramDoorJournalBatch> recordDoorAction({
    required String programId,
    required String functionId,
    required Map<String, Object?> operation,
  });

  Future<ProgramMutationResult> createWalkIn({
    required String programId,
    required String functionId,
    required String displayName,
    required DateTime occurredAt,
    required String clientOperationId,
    int? partySize,
    String? note,
  });
}

class RepositoryProgramOperationsMutator implements ProgramOperationsMutator {
  const RepositoryProgramOperationsMutator(this._repository);

  final ProgramWorkRepository _repository;

  @override
  Future<ProgramMutationResult> setReadiness({
    required String programId,
    required String legId,
    required String action,
    required String clientOperationId,
    required int expectedRevision,
    required DateTime observedAt,
    TravelLegObservationReference? afterObservation,
    int? manualCurbAtMillis,
    String? manualCurbNote,
  }) {
    final manualCurbAt = manualCurbAtMillis == null
        ? null
        : DateTime.fromMillisecondsSinceEpoch(manualCurbAtMillis);
    return switch (action) {
      'claim' => _repository.claimLeg(
        programId: programId,
        legId: legId,
        clientOperationId: clientOperationId,
        expectedRevision: expectedRevision,
        observedAt: observedAt,
        afterObservation: afterObservation,
      ),
      'unclaim' => _repository.unclaimLeg(
        programId: programId,
        legId: legId,
        clientOperationId: clientOperationId,
        expectedRevision: expectedRevision,
        observedAt: observedAt,
        afterObservation: afterObservation,
      ),
      'markReady' => _repository.markLegReady(
        programId: programId,
        legId: legId,
        clientOperationId: clientOperationId,
        expectedRevision: expectedRevision,
        observedAt: observedAt,
        afterObservation: afterObservation,
        manualCurbAt: manualCurbAt,
        manualCurbNote: manualCurbNote,
      ),
      'markDisrupted' => _repository.markLegDisrupted(
        programId: programId,
        legId: legId,
        clientOperationId: clientOperationId,
        expectedRevision: expectedRevision,
        observedAt: observedAt,
        afterObservation: afterObservation,
        manualCurbAt: manualCurbAt,
        manualCurbNote: manualCurbNote,
      ),
      _ => throw ArgumentError.value(action, 'action'),
    };
  }

  @override
  Future<ProgramDoorJournalBatch> recordDoorAction({
    required String programId,
    required String functionId,
    required Map<String, Object?> operation,
  }) => _repository.recordDoorJournal(
    programId: programId,
    functionId: functionId,
    operations: [operation],
  );

  @override
  Future<ProgramMutationResult> createWalkIn({
    required String programId,
    required String functionId,
    required String displayName,
    required DateTime occurredAt,
    required String clientOperationId,
    int? partySize,
    String? note,
  }) => _repository.createWalkIn(
    programId: programId,
    functionId: functionId,
    displayName: displayName,
    occurredAt: occurredAt,
    clientOperationId: clientOperationId,
    partySize: partySize,
    note: note,
  );

  @override
  Future<DispatchResult> dispatchTrip({
    required String programId,
    required String pickupPointId,
    required String vehicleClassId,
    required String plateDisplay,
    required List<String> legIds,
    required DateTime departedAt,
    required String clientOperationId,
    String? destinationHotelId,
    String? destinationLabel,
    String? vendorId,
    required List<DispatchLegRevision> expectedLegRevisions,
  }) => _repository.dispatchTrip(
    programId: programId,
    pickupPointId: pickupPointId,
    vehicleClassId: vehicleClassId,
    plateDisplay: plateDisplay,
    legIds: legIds,
    clientOperationId: clientOperationId,
    destinationHotelId: destinationHotelId,
    destinationLabel: destinationLabel,
    vendorId: vendorId,
    expectedLegRevisions: expectedLegRevisions,
    departedAt: departedAt,
  );
}

typedef ProgramOperationOutboxStore =
    LocalCommandJournal<ProgramOperationOutboxEntry>;

ProgramOperationOutboxStore createProgramOperationJournal({
  required Future<CommandJournalStorage> Function() storage,
  required String? Function() currentAccountId,
  Future<String?> Function(String)? loadLegacy,
  Future<void> Function(String)? clearLegacy,
}) => LocalCommandJournal(
  storage: storage,
  namespace: 'program_operations',
  currentAccountId: currentAccountId,
  loadLegacy: loadLegacy,
  clearLegacy: clearLegacy,
  codec: LocalCommandCodec(
    encode: (entry) => entry.toJson(),
    decode: ProgramOperationOutboxEntry.fromJson,
    scope: (entry) => entry.programId,
    resources: (entry) => switch (entry.kind) {
      ProgramOperationKind.legObservation => {'leg:${entry.payload['legId']}'},
      ProgramOperationKind.dispatch => {
        for (final legId in (entry.payload['legIds']! as List)) 'leg:$legId',
        'vehicle:${(entry.payload['plateDisplay']! as String).toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '')}',
      },
      ProgramOperationKind.doorAction => {'guest:${entry.payload['guestId']}'},
      ProgramOperationKind.walkIn => {
        'function:${entry.payload['functionId']}',
      },
    },
  ),
);

class ProgramOperationsOutbox {
  const ProgramOperationsOutbox(this._journal, this._mutator);
  final ProgramOperationOutboxStore _journal;
  final ProgramOperationsMutator _mutator;

  /// Recovery is account-wide because damaged records may have unreadable
  /// program identities. Export never replays, repairs, or deletes commands.
  Future<String> exportRecovery(String accountId) =>
      _journal.exportRecovery(accountId);

  Future<ProgramOperationOutboxSummary> loadForProgram({
    required String accountId,
    required String programId,
    DateTime? now,
  }) async => ProgramOperationOutboxSummary(
    await _journal.load(accountId, scope: programId, now: now),
  );

  Future<ProgramOperationOutboxSummary> enqueueAndAttempt({
    required String accountId,
    required ProgramOperationOutboxEntry entry,
    required bool offline,
  }) async {
    await _journal.append(accountId, entry);
    if (!offline) await _journal.flush(accountId, entry.programId, _execute);
    return loadForProgram(accountId: accountId, programId: entry.programId);
  }

  Future<ProgramOperationOutboxSummary> flushProgram({
    required String accountId,
    required String programId,
  }) async {
    await _journal.flush(accountId, programId, _execute);
    return loadForProgram(accountId: accountId, programId: programId);
  }

  Future<ProgramOperationOutboxSummary> clearNeedsReview({
    required String accountId,
    required String programId,
    String? commandId,
  }) async {
    await _journal.dismissReview(accountId, programId, commandId: commandId);
    return loadForProgram(accountId: accountId, programId: programId);
  }

  Future<void> _execute(ProgramOperationOutboxEntry entry) async {
    switch (entry.kind) {
      case ProgramOperationKind.legObservation:
        final revision = entry.payload['expectedRevision'];
        if (revision is! int || revision < 1) {
          throw const ValidationException(
            'This saved observation needs a reviewed journey revision.',
            code: 'arrival-observation-needs-review',
          );
        }
        await _mutator.setReadiness(
          programId: entry.programId,
          legId: entry.payload['legId']! as String,
          action: entry.payload['action']! as String,
          clientOperationId: entry.clientOperationId,
          expectedRevision: revision,
          observedAt: entry.createdAt,
          afterObservation: entry.payload['afterObservation'] == null
              ? null
              : TravelLegObservationReference.fromJson(
                  requiredMap(
                    entry.payload['afterObservation'],
                    'preceding observation',
                  ),
                ),
          manualCurbAtMillis: entry.payload['manualCurbAtMillis'] as int?,
          manualCurbNote: entry.payload['manualCurbNote'] as String?,
        );
      case ProgramOperationKind.dispatch:
        final legs = (entry.payload['legIds']! as List<Object?>).cast<String>();
        final fences =
            (entry.payload['expectedLegRevisions'] as List<Object?>? ?? [])
                .map(
                  (fence) => DispatchLegRevision.fromJson(
                    requiredMap(fence, 'revision fence'),
                  ),
                )
                .toList(growable: false);
        validateDispatchRevisionFences(legs, fences);
        await _mutator.dispatchTrip(
          programId: entry.programId,
          pickupPointId: entry.payload['pickupPointId']! as String,
          vehicleClassId: entry.payload['vehicleClassId']! as String,
          plateDisplay: entry.payload['plateDisplay']! as String,
          legIds: (entry.payload['legIds']! as List<Object?>).cast<String>(),
          clientOperationId: entry.clientOperationId,
          destinationHotelId: entry.payload['destinationHotelId'] as String?,
          destinationLabel: entry.payload['destinationLabel'] as String?,
          vendorId: entry.payload['vendorId'] as String?,
          expectedLegRevisions: fences,
          departedAt: entry.createdAt,
        );
      case ProgramOperationKind.doorAction:
        await _mutator.recordDoorAction(
          programId: entry.programId,
          functionId: entry.payload['functionId']! as String,
          operation: {
            'guestId': entry.payload['guestId'],
            'action': entry.payload['action'],
            'occurredAtMillis': entry.createdAt.millisecondsSinceEpoch,
            'partySize': entry.payload['partySize'],
            'note': entry.payload['note'],
          },
        );
      case ProgramOperationKind.walkIn:
        await _mutator.createWalkIn(
          programId: entry.programId,
          functionId: entry.payload['functionId']! as String,
          displayName: entry.payload['displayName']! as String,
          occurredAt: entry.createdAt,
          clientOperationId: entry.clientOperationId,
          partySize: entry.payload['partySize'] as int?,
          note: entry.payload['note'] as String?,
        );
    }
  }
}

// keepalive: one journal shared by arrivals, dispatch, and hotel operations.
@Riverpod(keepAlive: true)
ProgramOperationOutboxStore programOperationOutboxStore(Ref ref) {
  final auth = ref.watch(firebaseAuthProvider);
  return createProgramOperationJournal(
    storage: ref.watch(commandJournalStorageProvider),
    currentAccountId: () => auth.currentUser?.uid,
    loadLegacy: (accountId) =>
        loadLegacyCommandJournal('program_operations_outbox_v1_', accountId),
    clearLegacy: (accountId) =>
        clearLegacyCommandJournal('program_operations_outbox_v1_', accountId),
  );
}

// keepalive: commands survive navigation between program work surfaces.
@Riverpod(keepAlive: true)
ProgramOperationsOutbox programOperationsOutbox(Ref ref) =>
    ProgramOperationsOutbox(
      ref.watch(programOperationOutboxStoreProvider),
      RepositoryProgramOperationsMutator(
        ref.watch(programWorkRepositoryProvider),
      ),
    );
