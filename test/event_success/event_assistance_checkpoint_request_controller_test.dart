import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_checkpoint_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_request.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_request_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_request_provider.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_checkpoint_fixtures.dart';
import 'event_assistance_checkpoint_request_fixtures.dart';

void main() {
  late _Repository repository;
  late _Permissions permissions;
  late StreamController<String?> auth;
  late ProviderContainer container;
  final query = eventAssistanceCheckpointRequestProvider(checkpointScope);
  final command = eventAssistanceCheckpointRequestControllerProvider(
    checkpointScope,
  );
  setUp(() {
    repository = _Repository();
    permissions = _Permissions();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventAssistanceCheckpointRepositoryProvider.overrideWith(
          (ref) => repository,
        ),
        eventAssistanceDepartureRepositoryProvider.overrideWith(
          (ref) => permissions,
        ),
      ],
    );
    container.listen(query, (_, _) {});
  });
  tearDown(() async {
    container.dispose();
    await auth.close();
  });
  Future<void> settleReview() async {
    final done = Completer<void>();
    final subscription = container.listen(query, (_, next) {
      if (!next.isLoading && !done.isCompleted) done.complete();
    }, fireImmediately: true);
    try {
      await done.future.timeout(const Duration(seconds: 3));
      await container.pump();
    } finally {
      subscription.close();
    }
  }

  Future<void> signIn(String? uid) async {
    auth.add(uid);
    await container.pump();
    if (uid != null) {
      if (permissions.pending != null) {
        await permissions.started.future;
      } else {
        await settleReview();
      }
    }
  }

  Future<EventAssistanceCheckpointRequestSession> review() async {
    await signIn('host-1');
    return container.read(query).requireValue;
  }

  EventAssistanceCheckpointRequestController editor(
    EventAssistanceCheckpointRequestSession session,
  ) {
    container.listen(command, (_, _) {});
    return container.read(command.notifier)..open(session);
  }

  CheckpointRequestForm form() =>
      container.read(command) as CheckpointRequestForm;
  Future<void> fail(
    int index,
    Future<EventAssistanceCheckpointResult> pending, {
    Object error = const NetworkException('unavailable', 'Offline'),
  }) async {
    final check = expectLater(pending, throwsA(same(error)));
    repository.writes[index].result.completeError(error);
    await check;
  }

  void confirm(int index) {
    final write = repository.writes[index];
    write.result.complete(
      checkpointResult(requestAppliedWire(write.change, before: write.before)),
    );
  }

  test('explicit reload retires an unsubmitted request review', () async {
    final session = await review();
    final actions = editor(session)..select(reassignReporter);
    actions.reload();
    expect(container.read(command), isA<CheckpointRequestIdle>());
    await settleReview();
    expect(session.isCurrent, isFalse);
    actions.open(container.read(query).requireValue);
    expect(form().change, isNull);
    expect(repository.writes, isEmpty);
  });

  test('rate limiting preserves an earlier uncertain request', () async {
    final actions = editor(await review())..select(reassignReporter);
    await fail(0, actions.submit());
    final original = form().change;
    await fail(
      1,
      actions.retry(),
      error: const NetworkException('resource-exhausted', 'Try again later'),
    );
    expect(form().phase, CheckpointRequestPhase.retryRequired);
    expect(form().canReload, isFalse);
    expect(form().change, same(original));
    final retry = actions.retry();
    expect(repository.writes[2].change, same(original));
    confirm(2);
    await retry;
    expect(form().phase, CheckpointRequestPhase.saved);
  });

  test(
    'no implicit action and refreshed permission invalidates an unsubmitted choice',
    () async {
      final session = await review();
      final actions = editor(session);
      expect(form().canSubmit, isFalse);
      actions.select(reassignReporter);
      expect(form().canSubmit, isTrue);
      actions.select(ReopenCheckpointRequest('Not closed'));
      expect(form().error, isA<FormatException>());
      expect(form().change, isNull);
      actions.select(reassignReporter);
      container.read(query.notifier).reload();
      await settleReview();
      expect(session.isCurrent, isFalse);
      await expectLater(actions.submit(), throwsA(isA<ValidationException>()));
      expect(repository.writes, isEmpty);
      expect(repository.reads, 2);
      expect(permissions.reads, 2);
    },
  );
  for (final decision in <CheckpointRequestDecision>[
    reassignReporter,
    CloseCheckpointRequest('Guest departed'),
    ReopenCheckpointRequest('Review again'),
  ]) {
    test(
      '${decision.runtimeType} deduplicates, verifies success and refreshes the shared report',
      () async {
        if (decision is ReopenCheckpointRequest) {
          repository.wire = checkpointClosedWire();
        }
        final session = await review();
        final actions = editor(session)..select(decision);
        Future<EventAssistanceCheckpointResult>? reentrant;
        container.listen(command, (_, next) {
          if (next is CheckpointRequestForm &&
              next.phase == CheckpointRequestPhase.submitting) {
            reentrant = actions.submit();
          }
        });
        final pending = actions.submit();
        expect(actions.submit(), same(pending));
        expect(reentrant, same(pending));
        expect(form().canSelect, isFalse);
        expect(form().canDismiss, isFalse);
        actions.select(CloseCheckpointRequest('Replacement'));
        expect(repository.writes.single.change.decision, same(decision));
        confirm(0);
        final result = await pending;
        await settleReview();
        expect(form().phase, CheckpointRequestPhase.saved);
        expect(await actions.submit(), same(result));
        expect(repository.writes.length, 1);
        expect(repository.reads, 2);
        expect(permissions.reads, 2);
        expect(
          EventAssistanceCheckpointRequestController.mutationKey(session),
          (scope: checkpointScope, account: session.account),
        );
      },
    );
  }
  test(
    'uncertain action survives closure and fresh report without changing its identity',
    () async {
      final session = await review();
      final subscription = container.listen(command, (_, _) {});
      final actions = container.read(command.notifier)
        ..open(session)
        ..select(reassignReporter);
      await fail(0, actions.submit());
      final original = repository.writes.single.change;
      subscription.close();
      await container.pump();
      expect(container.exists(command), isTrue);
      container.read(query.notifier).reload();
      await settleReview();
      container.listen(command, (_, _) {});
      final reopened = container.read(command.notifier)
        ..open(container.read(query).requireValue);
      expect(reopened, same(actions));
      expect(form().change, same(original));
      actions.select(CloseCheckpointRequest('Replace'));
      expect(form().change, same(original));
      expect(form().canReload, isFalse);
      actions.reload();
      expect(form().change, same(original));
      final retry = actions.retry();
      expect(repository.writes.last.change, same(original));
      expect(repository.writes.last.change.command, original.command);
      confirm(1);
      await retry;
    },
  );
  test('reentrant retry starts exactly one second request', () async {
    final actions = editor(await review())..select(reassignReporter);
    Future<EventAssistanceCheckpointResult>? retry;
    container.listen(command, (_, next) {
      if (next is CheckpointRequestForm &&
          next.phase == CheckpointRequestPhase.retryRequired) {
        retry = actions.retry();
      }
    });
    await fail(0, actions.submit());
    expect(repository.writes.length, 2);
    expect(actions.retry(), same(retry));
    expect(repository.writes.first.change, same(repository.writes.last.change));
    confirm(1);
    await retry;
  });
  test(
    'unverified success retains the original action for reconciliation',
    () async {
      final actions = editor(await review())..select(reassignReporter);
      final pending = actions.submit();
      final write = repository.writes.single;
      final wire = requestAppliedWire(write.change);
      ((checkpointBody(wire)['assignment']! as Map)['change']!
              as Map)['assignedBy'] =
          'other';
      final check = expectLater(pending, throwsFormatException);
      write.result.complete(checkpointResult(wire));
      await check;
      expect(form().phase, CheckpointRequestPhase.retryRequired);
      expect(form().change, same(write.change));
    },
  );
  test(
    'definitive conflict refreshes authority and requires a new explicit action',
    () async {
      final session = await review();
      final actions = editor(session)..select(reassignReporter);
      await fail(
        0,
        actions.submit(),
        error: const BackendOperationException(
          code: 'aborted',
          message: 'Changed',
          context: BackendErrorContext(
            service: BackendService.functions,
            action: 'update checkpoint request',
            resource: 'eventAssistanceCheckpoints',
          ),
        ),
      );
      await settleReview();
      expect(form().phase, CheckpointRequestPhase.refreshRequired);
      await expectLater(actions.retry(), throwsA(isA<ValidationException>()));
      final old = repository.writes.single.change;
      actions.open(container.read(query).requireValue);
      expect(form().change, isNull);
      actions.select(reassignReporter);
      expect(form().change!.operationId, isNot(old.operationId));
    },
  );
  for (final mode in ['switchBack', 'authError']) {
    test('closed pending action loses authority after $mode', () async {
      final session = await review();
      final subscription = container.listen(command, (_, _) {});
      final actions = container.read(command.notifier)
        ..open(session)
        ..select(reassignReporter);
      await fail(0, actions.submit());
      subscription.close();
      await container.pump();
      if (mode == 'switchBack') {
        await signIn('other');
        await signIn('host-1');
      } else {
        auth.addError(StateError('Sign-in unavailable'));
        await container.pump();
      }
      await expectLater(actions.retry(), throwsA(isA<AppException>()));
      expect(repository.writes.length, 1);
      expect(container.read(command), isNot(isA<CheckpointRequestForm>()));
    });
  }
  test('late completion cannot restore a retired account', () async {
    final actions = editor(await review())..select(reassignReporter);
    final pending = actions.submit();
    final check = expectLater(pending, throwsA(isA<AppException>()));
    await signIn('other');
    confirm(0);
    await check;
    await container.pump();
    expect(container.read(command), isNot(isA<CheckpointRequestForm>()));
  });
  test(
    'permission loading, failure and foreign caller never expose an actionable review',
    () async {
      permissions.pending = Completer<EventAssistanceGroupProgressView>();
      await signIn('host-1');
      expect(container.read(query).isLoading, isTrue);
      permissions.pending!.completeError(
        const NetworkException('unavailable', 'Offline'),
      );
      await settleReview();
      expect(container.read(query).hasError, isTrue);
      permissions.pending = null;
      permissions.actorOverride = 'other';
      container.read(query.notifier).reload();
      await settleReview();
      expect(container.read(query).hasError, isTrue);
      expect(repository.writes, isEmpty);
    },
  );
  test(
    'observer data readiness never creates manager or responsible reporter authority',
    () async {
      permissions.observerOnly = true;
      checkpointBody(repository.wire)['reporterOptions'] = null;
      final session = await review();
      final actions = editor(session);
      expect(session.view.canAct, isFalse);
      expect(form().canSelect, isFalse);
      actions.select(reassignReporter);
      expect(form().change, isNull);
      await expectLater(actions.submit(), throwsA(isA<ValidationException>()));
      expect(repository.writes, isEmpty);
    },
  );
  test(
    'checkpoint refresh retires management review while shared arrival reads remain available',
    () async {
      final session = await review();
      final shared = eventAssistanceCheckpointProvider(checkpointScope);
      container.listen(shared, (_, _) {});
      expect(container.read(shared).hasValue, isTrue);
      repository.pending = Completer<EventAssistanceCheckpointView>();
      container.read(shared.notifier).reload();
      await container.pump();
      expect(session.isCurrent, isFalse);
      expect(container.read(query).isLoading, isTrue);
      repository.pending!.complete(checkpointResult(requestReadyWire()).view);
      await settleReview();
      expect(container.read(query).hasValue, isTrue);
      expect(repository.reads, 2);
    },
  );
}

class _Repository extends Fake implements EventAssistanceCheckpointRepository {
  Map<String, Object?> wire = requestReadyWire();
  int reads = 0;
  Completer<EventAssistanceCheckpointView>? pending;
  final writes =
      <
        ({
          EventAssistanceCheckpointRequestChange change,
          Map<String, Object?> before,
          Completer<EventAssistanceCheckpointResult> result,
        })
      >[];
  @override
  Future<EventAssistanceCheckpointView> fetch(
    EventAssistanceCheckpointScope scope,
  ) async {
    reads++;
    return pending != null
        ? pending!.future
        : checkpointResult(wire, scope: scope).view;
  }

  @override
  Future<EventAssistanceCheckpointResult> manageRequest(
    EventAssistanceCheckpointRequestChange change,
  ) {
    final result = Completer<EventAssistanceCheckpointResult>();
    writes.add((change: change, before: checkpointCopy(wire), result: result));
    return result.future;
  }
}

class _Permissions extends Fake implements EventAssistanceDepartureRepository {
  final started = Completer<void>();
  int reads = 0;
  bool observerOnly = false;
  String? actorOverride;
  Completer<EventAssistanceGroupProgressView>? pending;
  @override
  Future<EventAssistanceGroupProgressView> fetch(
    EventAssistanceGroupScope scope, {
    required String actorUid,
  }) async {
    reads++;
    if (!started.isCompleted) started.complete();
    return pending != null
        ? pending!.future
        : checkpointOperator(
            actorUid: actorOverride ?? actorUid,
            authority: observerOnly ? 'readOnly' : 'canConfirm',
            scope: scope,
          );
  }
}
