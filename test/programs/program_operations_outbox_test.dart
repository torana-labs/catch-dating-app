import 'package:catch_dating_app/contexts/programmes/data/program_operations_outbox.dart';
import 'package:catch_dating_app/contexts/programmes/domain/travel_leg_revision.dart';
import 'package:catch_dating_app/core/persistence/local_command_journal.dart';
import 'package:catch_dating_app/core/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_test/flutter_test.dart';

import 'program_operations_fixture.dart';

class MemoryOutboxStore
    extends LocalCommandJournal<ProgramOperationOutboxEntry> {
  MemoryOutboxStore() : this._(MemoryCommandJournalStorage());
  MemoryOutboxStore._(MemoryCommandJournalStorage memory)
    : super(
        storage: () async => memory,
        namespace: 'test',
        currentAccountId: () => accountId,
        codec: createProgramOperationJournal(
          storage: () async => memory,
          currentAccountId: () => accountId,
        ).codec,
      );
  static String accountId = 'acct';
  Future<void> save(
    String accountId,
    List<ProgramOperationOutboxEntry> entries,
  ) async {
    for (final entry in entries) {
      await append(accountId, entry);
    }
  }
}

ProgramOperationOutboxEntry legObservation({
  required String legId,
  String operationId = 'op_leg',
  DateTime? createdAt,
}) => ProgramOperationOutboxEntry.legObservation(
  programId: 'program-1',
  legId: legId,
  action: 'markReady',
  expectedRevision: 1,
  clientOperationId: operationId,
  createdAt: createdAt ?? DateTime.now(),
);

void main() {
  group('ProgramOperationsOutbox', () {
    late MemoryOutboxStore store;
    late FakeProgramMutator mutator;
    late ProgramOperationsOutbox outbox;

    setUp(() {
      store = MemoryOutboxStore();
      mutator = FakeProgramMutator();
      outbox = ProgramOperationsOutbox(store, mutator);
    });

    test('each leg observation retains its own immutable command', () async {
      await outbox.enqueueAndAttempt(
        accountId: 'acct',
        entry: legObservation(legId: 'leg-1', operationId: 'op_old'),
        offline: true,
      );
      await outbox.enqueueAndAttempt(
        accountId: 'acct',
        entry: legObservation(legId: 'leg-1', operationId: 'op_new'),
        offline: true,
      );

      final summary = await outbox.loadForProgram(
        accountId: 'acct',
        programId: 'program-1',
      );
      expect(summary.entries.map((e) => e.clientOperationId), [
        'op_old',
        'op_new',
      ]);
      expect(mutator.calls, isEmpty);
    });

    test(
      'flush replays pending operations and removes delivered ones',
      () async {
        await outbox.enqueueAndAttempt(
          accountId: 'acct',
          entry: legObservation(legId: 'leg-1', operationId: 'op_1'),
          offline: true,
        );
        await outbox.enqueueAndAttempt(
          accountId: 'acct',
          entry: ProgramOperationOutboxEntry.dispatch(
            programId: 'program-1',
            pickupPointId: 'del_t3',
            vehicleClassId: 'innova',
            plateDisplay: 'DL-1T-4421',
            legIds: const ['leg-1'],
            expectedLegRevisions: const [
              DispatchLegRevision(legId: 'leg-1', revision: 2),
            ],
            clientOperationId: 'op_dispatch',
            createdAt: DateTime.now().add(const Duration(seconds: 1)),
          ),
          offline: true,
        );

        final summary = await outbox.flushProgram(
          accountId: 'acct',
          programId: 'program-1',
        );
        expect(summary.entries, isEmpty);
        expect(mutator.calls, [
          'obs:leg-1:markReady:op_1',
          'dispatch:DL-1T-4421:op_dispatch',
        ]);
      },
    );

    test(
      'non-retryable failures mark the entry needsReview and stop nothing',
      () async {
        await outbox.enqueueAndAttempt(
          accountId: 'acct',
          entry: legObservation(legId: 'leg-1', operationId: 'op_1'),
          offline: true,
        );
        await outbox.enqueueAndAttempt(
          accountId: 'acct',
          entry: legObservation(legId: 'leg-2', operationId: 'op_2'),
          offline: true,
        );

        mutator
          ..error = const ValidationException('stale revision')
          ..failOnce = true;

        final summary = await outbox.flushProgram(
          accountId: 'acct',
          programId: 'program-1',
        );
        expect(
          summary.entries.map((entry) => entry.status),
          contains(ProgramOperationOutboxStatus.needsReview),
        );
        expect(summary.needsReviewCount, 1);
      },
    );

    test(
      'retryable failures keep the entry pending and halt the flush',
      () async {
        await outbox.enqueueAndAttempt(
          accountId: 'acct',
          entry: legObservation(legId: 'leg-1', operationId: 'op_1'),
          offline: true,
        );
        await outbox.enqueueAndAttempt(
          accountId: 'acct',
          entry: legObservation(legId: 'leg-2', operationId: 'op_2'),
          offline: true,
        );

        mutator.error = const NetworkException('offline', 'Offline');
        final summary = await outbox.flushProgram(
          accountId: 'acct',
          programId: 'program-1',
        );
        expect(summary.pendingCount, 2);
        expect(mutator.calls, hasLength(1));
      },
    );

    test('legacy dispatch without fences is preserved for review', () async {
      final raw = ProgramOperationOutboxEntry.dispatch(
        programId: 'program-1',
        pickupPointId: 'pickup',
        vehicleClassId: 'suv',
        plateDisplay: 'DL1234',
        legIds: ['leg-1'],
        expectedLegRevisions: [
          const DispatchLegRevision(legId: 'leg-1', revision: 1),
        ],
        clientOperationId: 'legacy',
        createdAt: DateTime.now(),
      ).toJson();
      (raw['payload']! as Map<String, Object?>).remove('expectedLegRevisions');
      await store.save('acct', [ProgramOperationOutboxEntry.fromJson(raw)]);
      final result = await outbox.flushProgram(
        accountId: 'acct',
        programId: 'program-1',
      );
      expect(mutator.calls, isEmpty);
      expect(result.needsReviewCount, 1);
      expect(result.entries.single.clientOperationId, 'legacy');
      expect(
        result.entries.single.lastErrorCode,
        'dispatch-manifest-needs-review',
      );
    });

    test(
      'offline dispatch keeps its observed departure time on replay',
      () async {
        final departedAt = DateTime.now().subtract(const Duration(hours: 2));
        await outbox.enqueueAndAttempt(
          accountId: 'acct',
          offline: true,
          entry: ProgramOperationOutboxEntry.dispatch(
            programId: 'program-1',
            pickupPointId: 'pickup',
            vehicleClassId: 'suv',
            plateDisplay: 'DL1234',
            legIds: ['leg-1'],
            expectedLegRevisions: [
              const DispatchLegRevision(legId: 'leg-1', revision: 1),
            ],
            clientOperationId: 'departure',
            createdAt: departedAt,
          ),
        );
        await outbox.flushProgram(accountId: 'acct', programId: 'program-1');
        expect(
          mutator.lastDeparture?.millisecondsSinceEpoch,
          departedAt.millisecondsSinceEpoch,
        );
      },
    );

    test(
      'receipt references and observed time survive journal reload',
      () async {
        final observedAt = DateTime.now().subtract(const Duration(hours: 2));
        const claimRef = TravelLegObservationReference(
          clientOperationId: 'offline-claim',
          action: 'claim',
        );
        const readyRef = TravelLegObservationReference(
          clientOperationId: 'offline-ready',
          action: 'markReady',
        );
        await outbox.enqueueAndAttempt(
          accountId: 'acct',
          offline: true,
          entry: ProgramOperationOutboxEntry.legObservation(
            programId: 'program-1',
            legId: 'leg-1',
            action: 'claim',
            clientOperationId: claimRef.clientOperationId,
            expectedRevision: 1,
            createdAt: observedAt,
          ),
        );
        await outbox.enqueueAndAttempt(
          accountId: 'acct',
          offline: true,
          entry: ProgramOperationOutboxEntry.legObservation(
            programId: 'program-1',
            legId: 'leg-1',
            action: 'markReady',
            clientOperationId: readyRef.clientOperationId,
            expectedRevision: 1,
            createdAt: observedAt,
            afterObservation: claimRef,
          ),
        );
        await outbox.enqueueAndAttempt(
          accountId: 'acct',
          offline: true,
          entry: ProgramOperationOutboxEntry.dispatch(
            programId: 'program-1',
            pickupPointId: 'pickup',
            vehicleClassId: 'suv',
            plateDisplay: 'DL1234',
            legIds: ['leg-1'],
            expectedLegRevisions: [
              const DispatchLegRevision(
                legId: 'leg-1',
                revision: 1,
                afterObservation: readyRef,
              ),
            ],
            clientOperationId: 'offline-dispatch',
            createdAt: observedAt,
          ),
        );
        final reloaded = ProgramOperationsOutbox(store, mutator);
        final result = await reloaded.flushProgram(
          accountId: 'acct',
          programId: 'program-1',
        );
        expect(result.entries, isEmpty);
        expect(mutator.observationPredecessors.map((ref) => ref?.toJson()), [
          null,
          claimRef.toJson(),
        ]);
        expect(
          mutator.lastFences.single.afterObservation?.toJson(),
          readyRef.toJson(),
        );
        expect(mutator.lastFences.single.revision, 1);
        expect(
          mutator.lastObservation?.millisecondsSinceEpoch,
          observedAt.millisecondsSinceEpoch,
        );
      },
    );

    test(
      'legacy observations without a revision are retained for review',
      () async {
        final raw = legObservation(legId: 'leg-1').toJson();
        (raw['payload']! as Map<String, Object?>).remove('expectedRevision');
        await store.save('acct', [ProgramOperationOutboxEntry.fromJson(raw)]);
        final result = await outbox.flushProgram(
          accountId: 'acct',
          programId: 'program-1',
        );
        expect(mutator.calls, isEmpty);
        expect(result.needsReviewCount, 1);
        expect(
          result.entries.single.lastErrorCode,
          'arrival-observation-needs-review',
        );
      },
    );

    test('old entries remain available for explicit review', () async {
      final stale = DateTime(2026, 2);
      final ancient = DateTime(2026);
      await store.save('acct', [
        legObservation(
          legId: 'leg-stale',
          operationId: 'op_stale',
          createdAt: stale,
        ),
        legObservation(
          legId: 'leg-old',
          operationId: 'op_old',
          createdAt: ancient,
        ),
      ]);

      final summary = await outbox.loadForProgram(
        accountId: 'acct',
        programId: 'program-1',
        now: DateTime(2026, 2, 20),
      );
      expect(summary.entries, hasLength(2));
      expect(
        summary.entries.map((entry) => entry.status),
        everyElement(ProgramOperationOutboxStatus.needsReview),
      );
    });
  });
}
