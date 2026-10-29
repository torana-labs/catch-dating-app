import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_operations_outbox.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operation_projection.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/core/persistence/command_journal_storage.dart';
import 'package:catch_dating_app/core/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'program_operations_fixture.dart';

void main() {
  late ProviderContainer container;
  late FakeProgramMutator mutator;
  late ProgramOperationOutboxStore journal;
  late String account;
  late bool offline;
  late Future<CommandJournalStorage> Function() openStorage;
  final provider = programOperationsControllerProvider('program-1', 'acct');

  void update() => container.updateOverrides([
    uidProvider.overrideWithValue(AsyncData(account)),
    isObviouslyOfflineProvider.overrideWithValue(offline),
    programOperationsOutboxProvider.overrideWithValue(
      ProgramOperationsOutbox(journal, mutator),
    ),
  ]);

  setUp(() {
    account = 'acct';
    offline = true;
    final memory = MemoryCommandJournalStorage();
    openStorage = () async => memory;
    mutator = FakeProgramMutator();
    journal = createProgramOperationJournal(
      storage: () => openStorage(),
      currentAccountId: () => account,
    );
    container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        uidProvider.overrideWithValue(AsyncData(account)),
        isObviouslyOfflineProvider.overrideWithValue(offline),
        programOperationsOutboxProvider.overrideWithValue(
          ProgramOperationsOutbox(journal, mutator),
        ),
      ],
    );
    container.listen(programOperationsStateProvider('program-1'), (_, _) {});
    addTearDown(container.dispose);
  });

  test(
    'offline claim, ready and departure retain chained revision fences',
    () async {
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      final row = arrivalRow();
      expect(await controller.observe(row, 'claim'), isTrue);
      expect(await controller.observe(row, 'markReady'), isTrue);
      final saved = container.read(provider).requireValue.outbox;
      final projected = projectProgramArrival(row, saved);
      expect(projected.row.readiness, TravelLegReadiness.ready);
      expect(projected.row.claimedByMe, isTrue);
      expect(projected.row.revision, row.revision);
      expect(
        await controller.dispatch(
          roster: ProgramArrivalsRoster(
            accessExpiresAt: null,
            vehicleClasses: const [],
            programId: 'program-1',
            pickupPointId: 'pickup-1',
            generatedAt: DateTime.now(),
            rows: [row],
          ),
          pickupPointId: 'pickup-1',
          vehicleClassId: 'sedan',
          plateDisplay: 'DL 1 A 1234',
          legIds: [row.legId],
        ),
        isTrue,
      );
      final queue = container.read(provider).requireValue.outbox;
      expect(queue.pendingCount, 3);
      expect(projectProgramArrival(row, queue).blocked, isTrue);
      expect(await controller.observe(row, 'unclaim'), isFalse);
      expect(mutator.calls, isEmpty);
      offline = false;
      update();
      await container.pump();
      await waitUntil(
        () => container.read(provider).asData?.value.outbox.pendingCount == 0,
      );
      expect(mutator.calls.length, 3);
      expect(
        mutator.observationPredecessors.last?.clientOperationId,
        saved.entries.first.clientOperationId,
      );
      expect(
        mutator.lastFences.single.afterObservation?.clientOperationId,
        saved.entries.last.clientOperationId,
      );
      expect(mutator.lastFences.single.revision, 7);
    },
  );

  test(
    'a rejected departure stays visible and does not report acceptance',
    () async {
      offline = false;
      update();
      await container.read(provider.future);
      mutator.error = const ValidationException('conflict');
      final accepted = await container
          .read(provider.notifier)
          .dispatch(
            roster: ProgramArrivalsRoster(
              accessExpiresAt: null,
              vehicleClasses: const [],
              programId: 'program-1',
              pickupPointId: 'pickup-1',
              generatedAt: DateTime.now(),
              rows: [arrivalRow(readiness: TravelLegReadiness.ready)],
            ),
            pickupPointId: 'pickup-1',
            vehicleClassId: 'sedan',
            plateDisplay: 'DL 1 A 1234',
            legIds: ['leg-1'],
          );
      expect(accepted, isFalse);
      expect(container.read(provider).requireValue.outbox.needsReviewCount, 1);
      expect(
        container.read(provider).requireValue.error,
        isA<ValidationException>(),
      );
    },
  );

  test(
    'an unrelated conflict does not reject an accepted observation',
    () async {
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      await controller.observe(arrivalRow(legId: 'other'), 'claim');
      mutator
        ..error = const ValidationException('conflict')
        ..failOnce = true;
      // Keep the connectivity provider offline while explicitly syncing. A
      // separate auto-sync would consume the first failure before the new write.
      await controller.sync();
      expect(await controller.observe(arrivalRow(), 'claim'), isTrue);
      expect(container.read(provider).requireValue.outbox.needsReviewCount, 1);
    },
  );

  test(
    'account switch hides saved work and blocks callbacks from the old screen',
    () async {
      await container.read(provider.future);
      final old = container.read(provider.notifier);
      await old.observe(arrivalRow(), 'claim');
      account = 'other-account';
      update();
      await container.pump();
      await container.read(
        programOperationsControllerProvider('program-1', account).future,
      );
      expect(
        container
            .read(programOperationsStateProvider('program-1'))
            .requireValue
            .outbox
            .entries,
        isEmpty,
      );
      expect(await old.observe(arrivalRow(), 'markReady'), isFalse);
      expect(mutator.calls, isEmpty);
    },
  );

  test(
    'a save followed by an unknown sync failure preserves the command',
    () async {
      offline = false;
      update();
      await container.read(provider.future);
      mutator.error = StateError('response lost');
      final controller = container.read(provider.notifier);
      expect(await controller.observe(arrivalRow(), 'claim'), isFalse);
      final saved = container.read(provider).requireValue;
      expect(saved.outbox.pendingCount, 1);
      expect(saved.error, isA<StateError>());
      final id = saved.outbox.entries.single.clientOperationId;
      mutator.error = null;
      expect(await controller.sync(), isTrue);
      expect(mutator.calls, everyElement(endsWith(id)));
      expect(container.read(provider).requireValue.outbox.entries, isEmpty);
    },
  );

  test('failed initial storage load is exposed and can be retried', () async {
    final memory = MemoryCommandJournalStorage();
    openStorage = () async => throw StateError('storage unavailable');
    await expectLater(
      container.read(provider.future),
      throwsA(isA<BackendOperationException>()),
    );
    expect(
      container.read(programOperationsStateProvider('program-1')).hasError,
      isTrue,
    );
    openStorage = () async => memory;
    container.invalidate(provider);
    expect((await container.read(provider.future)).outbox.entries, isEmpty);
  });

  test(
    'reconnect during append flushes after save and serializes double taps',
    () async {
      await container.read(provider.future);
      final memory = MemoryCommandJournalStorage();
      final saving = Completer<void>();
      final release = Completer<void>();
      openStorage = () async {
        if (!saving.isCompleted) saving.complete();
        await release.future;
        return memory;
      };
      final controller = container.read(provider.notifier);
      final pending = controller.observe(arrivalRow(), 'claim');
      await saving.future;
      expect(await controller.observe(arrivalRow(), 'claim'), isFalse);
      offline = false;
      update();
      await container.pump();
      release.complete();
      expect(await pending, isTrue);
      await waitUntil(
        () => container.read(provider).asData?.value.busy == false,
      );
      expect(container.read(provider).requireValue.outbox.entries, isEmpty);
      expect(mutator.calls.length, 1);
    },
  );
}

Future<void> waitUntil(bool Function() done) async {
  for (var attempt = 0; attempt < 100 && !done(); attempt++) {
    await Future<void>.delayed(const Duration(milliseconds: 5));
  }
  expect(done(), isTrue, reason: 'The queued operation did not settle.');
}
