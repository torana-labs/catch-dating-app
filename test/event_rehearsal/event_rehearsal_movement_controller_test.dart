import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_request.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement_command.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_movement_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_movement_view_model.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_checkpoint_management_fixtures.dart';
import 'event_rehearsal_movement_fixtures.dart';

void main() {
  late _Repository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  final selection = movementReview().selection;
  final query = eventRehearsalMovementProvider(selection);
  final provider = eventRehearsalMovementControllerProvider(selection.scope);
  setUp(() {
    repository = _Repository();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventRehearsalRepositoryProvider.overrideWith((ref) => repository),
      ],
    );
    container.listen(query, (_, _) {});
  });
  tearDown(() async {
    container.dispose();
    await auth.close();
  });
  Future<AsyncValue<RehearsalMovementPage>> settle() async {
    await container.pump();
    final done = Completer<AsyncValue<RehearsalMovementPage>>();
    final sub = container.listen(query, (_, next) {
      if (!next.isLoading && !done.isCompleted) done.complete(next);
    }, fireImmediately: true);
    try {
      return await done.future.timeout(const Duration(seconds: 10));
    } finally {
      sub.close();
    }
  }

  Future<RehearsalMovementPage> load() async {
    auth.add('host-1');
    return (await settle()).requireValue;
  }

  EventRehearsalMovementController open(RehearsalMovementPage page) {
    container.listen(provider, (_, _) {});
    return container.read(provider.notifier)..open(page);
  }

  RehearsalMovementForm form() =>
      container.read(provider) as RehearsalMovementForm;
  Future<void> fail(
    Future<EventRehearsalBootstrap> pending, {
    Object error = const NetworkException('unavailable', 'Offline'),
  }) async {
    final check = expectLater(pending, throwsA(same(error)));
    repository.writes.last.result.completeError(error);
    await check;
  }

  void confirm({bool later = false}) {
    final w = repository.writes.last;
    w.result.complete(
      EventRehearsalBootstrap.fromCallableData(
        movementResult(w.change, later: later),
      ),
    );
  }

  test(
    'one group owns repeated and reentrant taps until its receipt is verified',
    () async {
      final page = await load();
      final actions = open(page);
      final command = movementDeparture(page.snapshot);
      Future<EventRehearsalBootstrap>? reentrant;
      container.listen(provider, (_, next) {
        if (next is RehearsalMovementForm &&
            next.phase == RehearsalMovementPhase.submitting) {
          reentrant = actions.submit(command);
        }
      });
      final pending = actions.submit(command);
      expect(actions.submit(command), same(pending));
      expect(reentrant, same(pending));
      expect(repository.writes.length, 1);
      expect(form().canDismiss, isFalse);
      expect(EventRehearsalMovementController.mutationKey(page), (
        scope: selection.scope,
        account: page.account,
      ));
      confirm();
      final result = await pending;
      expect(form().phase, RehearsalMovementPhase.saved);
      expect(await actions.submit(command), same(result));
      expect(repository.writes.length, 1);
    },
  );
  test(
    'closed sheet and refreshed history retain an uncertain request exactly',
    () async {
      final page = await load();
      final subscription = container.listen(provider, (_, _) {});
      final actions = container.read(provider.notifier)..open(page);
      await fail(actions.submit(movementDeparture(page.snapshot)));
      final original = repository.writes.single.change;
      subscription.close();
      await container.pump();
      expect(container.exists(provider), isTrue);
      container.read(query.notifier).reload();
      await settle();
      final fresh = container.read(query).requireValue;
      expect(page.isCurrent, isFalse);
      container.listen(provider, (_, _) {});
      actions.open(fresh);
      expect(form().change, same(original));
      expect(form().canReload, isFalse);
      await expectLater(
        actions.submit(movementDeparture(fresh.snapshot)),
        throwsA(isA<ValidationException>()),
      );
      final retry = actions.retry();
      expect(repository.writes.last.change, same(original));
      expect(repository.writes.last.change.toJson(), original.toJson());
      confirm(later: true);
      await retry;
      expect(form().phase, RehearsalMovementPhase.saved);
    },
  );
  test(
    'a retry callback can execute before the failed stack unwinds',
    () async {
      final page = await load();
      final actions = open(page);
      Future<EventRehearsalBootstrap>? retry;
      container.listen(provider, (_, next) {
        if (next is RehearsalMovementForm && next.canRetry && retry == null) {
          retry = actions.retry();
        }
      });
      await fail(actions.submit(movementDeparture(page.snapshot)));
      expect(repository.writes.length, 2);
      expect(
        repository.writes.last.change,
        same(repository.writes.first.change),
      );
      confirm();
      await retry!;
    },
  );
  test(
    'a malformed success stays uncertain and stale reviews cannot create decisions',
    () async {
      final page = await load();
      final actions = open(page);
      final check = expectLater(
        actions.submit(movementDeparture(page.snapshot)),
        throwsFormatException,
      );
      repository.writes.last.result.complete(movementSnapshot());
      await check;
      expect(form().canRetry, isTrue);
      final retry = actions.retry();
      confirm();
      await retry;
      container.read(query.notifier).reload();
      await settle();
      final fresh = container.read(query).requireValue;
      actions.open(fresh);
      await expectLater(
        actions.submit(movementDeparture(page.snapshot)),
        throwsA(isA<ValidationException>()),
      );
      expect(repository.writes.length, 2);
    },
  );
  test(
    'a definitive revision conflict requires a new review and request',
    () async {
      final page = await load();
      final actions = open(page);
      await fail(
        actions.submit(movementDeparture(page.snapshot)),
        error: const BackendOperationException(
          code: 'aborted',
          message: 'Rehearsal changed',
          context: BackendErrorContext(
            service: BackendService.functions,
            action: 'movement',
            resource: 'eventRehearsals',
          ),
        ),
      );
      expect(form().phase, RehearsalMovementPhase.refreshRequired);
      await expectLater(actions.retry(), throwsA(isA<ValidationException>()));
      await settle();
      final fresh = container.read(query).requireValue;
      actions.open(fresh);
      final pending = actions.submit(movementDeparture(fresh.snapshot));
      expect(
        repository.writes.last.change.clientActionId,
        isNot(repository.writes.first.change.clientActionId),
      );
      confirm();
      await pending;
    },
  );
  for (final transition in ['signOut', 'switchBack', 'authError']) {
    test('a closed pending request is revoked after $transition', () async {
      final page = await load();
      final sub = container.listen(provider, (_, _) {});
      final actions = container.read(provider.notifier)..open(page);
      await fail(actions.submit(movementDeparture(page.snapshot)));
      sub.close();
      await container.pump();
      if (transition == 'authError') {
        auth.addError(StateError('Auth failed'));
      } else {
        auth.add(transition == 'switchBack' ? 'host-2' : null);
      }
      await container.pump();
      if (transition == 'switchBack') {
        auth.add('host-1');
        await container.pump();
      }
      container.listen(provider, (_, _) {});
      expect(container.read(provider), isNot(isA<RehearsalMovementForm>()));
      await expectLater(
        container.read(provider.notifier).retry(),
        throwsA(same(rehearsalReviewSessionChanged)),
      );
      expect(repository.writes.length, 1);
    });
  }
  test(
    'an in-flight result cannot restore private state after sign-out',
    () async {
      final page = await load();
      final actions = open(page);
      final pending = actions.submit(movementDeparture(page.snapshot));
      final check = expectLater(
        pending,
        throwsA(same(rehearsalReviewSessionChanged)),
      );
      auth.add(null);
      await container.pump();
      confirm();
      await check;
      expect(container.read(provider), isNot(isA<RehearsalMovementForm>()));
    },
  );
  test('checkpoint and departure share the same pending group slot', () async {
    repository.sample = 'departed';
    final page = await load();
    final actions = open(page);
    final report = RehearsalRecordCheckpoint(
      snapshot: page.snapshot,
      observation: AssistanceCheckpointObservation(['actor-01']),
    );
    final pending = actions.submit(report);
    expect(actions.submit(movementDeparture(page.snapshot)), same(pending));
    expect(repository.writes.single.change.command, same(report));
    confirm();
    await pending;
  });
  test(
    'provider rejects a changed generation before requesting movement',
    () async {
      repository.sample = 'ready';
      repository.wrongGeneration = true;
      auth.add('host-1');
      await settle();
      expect(container.read(query).error, same(rehearsalReviewExpired));
      expect(repository.movementReads, 0);
    },
  );
  test(
    'provider does not join a movement result from a different runtime snapshot',
    () async {
      repository.movementSample = 'departed';
      auth.add('host-1');
      await settle();
      expect(container.read(query).error, isA<FormatException>());
      expect(repository.movementReads, 1);
    },
  );
  test(
    'auth loss between the two deliberate reads withholds the movement page',
    () async {
      repository.delayedMovement = Completer<RehearsalMovementReview>();
      auth.add('host-1');
      await repository.movementStarted.future.timeout(
        const Duration(seconds: 10),
      );
      expect(repository.movementReads, 1);
      auth.add(null);
      await container.pump();
      repository.delayedMovement!.complete(movementReview());
      await container.pump();
      expect(container.read(query).hasError, isTrue);
      expect(container.read(query).asData, isNull);
    },
  );
  for (final scenario in [
    (
      before: 'departed',
      after: 'reassigned',
      decision: ReassignCheckpointReporter(
        reporterId: 'host-1',
        reason: 'Taking over the report.',
      ),
    ),
    (
      before: 'resolved',
      after: 'closed',
      decision: CloseCheckpointRequest('Reviewed every outstanding guest.'),
    ),
    (
      before: 'needsReview',
      after: 'reopened',
      decision: ReopenCheckpointRequest('Reviewed every outstanding guest.'),
    ),
  ]) {
    test(
      '${scenario.after} retains the exact pending command through refresh',
      () async {
        repository.management = true;
        repository.sample = scenario.before;
        final page = await load();
        final actions = open(page);
        final command = RehearsalManageCheckpoint(
          snapshot: page.snapshot,
          decision: scenario.decision,
        );
        await fail(actions.submit(command));
        final original = repository.writes.single.change;
        container.invalidate(query);
        final refreshed = (await settle()).requireValue;
        actions.open(refreshed);
        expect(form().change, same(original));
        final pending = actions.retry();
        expect(repository.writes.last.change, same(original));
        final result = EventRehearsalBootstrap.fromCallableData(
          managementResult(original, scenario.after),
        );
        repository.writes.last.result.complete(result);
        expect(await pending, same(result));
        expect(form().phase, RehearsalMovementPhase.saved);
      },
    );
  }
}

class _Repository extends Fake implements EventRehearsalRepository {
  String sample = 'ready';
  bool management = false;
  Map<String, Object?> sampleData(String name) =>
      management ? managementBootstrap(name) : movementBootstrap(name);
  String? movementSample;
  bool wrongGeneration = false;
  int movementReads = 0;
  final movementStarted = Completer<void>();
  Completer<RehearsalMovementReview>? delayedMovement;
  final writes =
      <
        ({
          RehearsalMovementChange change,
          Completer<EventRehearsalBootstrap> result,
        })
      >[];
  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) async {
    final raw = sampleData(sample);
    raw.remove('movementReview');
    if (wrongGeneration) {
      final session = movementObjectAt(raw, ['session']);
      session['setupRevision'] = (session['setupRevision'] as int) + 1;
      final current = EventRehearsalSession.fromMap(session);
      movementObjectAt(raw, ['staffReview'])['clockId'] =
          rehearsalMovementScope(current, 'event:whole').clockId;
    }
    return EventRehearsalBootstrap.fromCallableData(raw);
  }

  @override
  Future<RehearsalMovementReview> fetchMovement({
    required EventRehearsalBootstrap snapshot,
    required RehearsalMovementSelection selection,
    required String actorUid,
  }) {
    movementReads++;
    if (!movementStarted.isCompleted) movementStarted.complete();
    if (delayedMovement != null) return delayedMovement!.future;
    final raw = movementObjectAt(sampleData(movementSample ?? sample), [
      'movementReview',
    ]);
    raw['actorUid'] = actorUid;
    return Future.value(
      RehearsalMovementReview.fromJson(
        raw,
        session: snapshot.session,
        actors: snapshot.actors,
        selection: selection,
        expectedActorUid: actorUid,
      ),
    );
  }

  @override
  Future<EventRehearsalBootstrap> applyMovement(
    RehearsalMovementChange change,
  ) {
    final result = Completer<EventRehearsalBootstrap>();
    writes.add((change: change, result: result));
    return result.future;
  }
}
