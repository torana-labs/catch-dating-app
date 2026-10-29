import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_accountability_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_accountability_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_accountability_provider.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_accountability_fixtures.dart';

void main() {
  late _Repository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  final query = eventAssistanceAccountabilityProvider(accountabilityScope);
  final commandProvider = eventAssistanceAccountabilityControllerProvider(
    accountabilityScope.guest,
  );
  setUp(() {
    repository = _Repository();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventAssistanceAccountabilityRepositoryProvider.overrideWith(
          (ref) => repository,
        ),
      ],
    );
    container.listen(query, (_, _) {});
  });
  tearDown(() async {
    container.dispose();
    await auth.close();
  });
  Future<void> signIn(String? uid) async {
    final count = repository.reads.length + 1;
    auth.add(uid);
    await container.pump();
    if (uid != null) await repository.waitForReads(count);
    await container.pump();
  }

  Future<void> completeRead(
    int index, {
    EventAssistanceAccountabilityView? view,
  }) async {
    await repository.waitForReads(index + 1);
    repository.reads[index].result.complete(view ?? accountabilityView());
    await container.pump();
  }

  Future<EventAssistanceAccountabilitySession> review() async {
    await signIn('host-1');
    await completeRead(0);
    return container.read(query).requireValue;
  }

  EventAssistanceAccountabilityController editor(
    EventAssistanceAccountabilitySession session,
  ) {
    container.listen(commandProvider, (_, _) {});
    return container.read(commandProvider.notifier)..open(session);
  }

  AccountabilityForm form() =>
      container.read(commandProvider) as AccountabilityForm;
  void confirm(int index) {
    final write = repository.writes[index];
    write.result.complete(
      accountabilityResult(accountabilityAppliedWire(write.change)),
    );
  }

  Future<void> fail(
    int index,
    Future<EventAssistanceAccountabilityResult> pending, {
    Object error = const NetworkException('unavailable', 'Offline'),
  }) async {
    final check = expectLater(pending, throwsA(same(error)));
    repository.writes[index].result.completeError(error);
    await check;
  }

  test('rate limiting preserves an earlier uncertain request', () async {
    final actions = editor(await review())
      ..select(AssistanceVisitDisposition.returned);
    await fail(0, actions.submit());
    final original = form().change;
    await fail(
      1,
      actions.retry(),
      error: const NetworkException('resource-exhausted', 'Try again later'),
    );
    expect(form().phase, AccountabilityPhase.retryRequired);
    expect(form().canReload, isFalse);
    expect(form().change, same(original));
    final retry = actions.retry();
    expect(repository.writes[2].change, same(original));
    confirm(2);
    await retry;
    expect(form().phase, AccountabilityPhase.saved);
  });

  test(
    'no implicit disposition; clearing the choice and stale reviews prevent submission',
    () async {
      final session = await review();
      final actions = editor(session);
      expect(form().canSubmit, isFalse);
      expect(form().change, isNull);
      actions.select(AssistanceVisitDisposition.returned);
      expect(form().canSubmit, isTrue);
      actions.select(null);
      expect(form().error, isNull);
      expect(form().change, isNull);
      actions.select(AssistanceVisitDisposition.returned);
      container.read(query.notifier).reload();
      await container.pump();
      expect(session.isCurrent, isFalse);
      await expectLater(actions.submit(), throwsA(isA<ValidationException>()));
      expect(repository.writes, isEmpty);
    },
  );

  test(
    'reentrant and repeated triggers share one request and its verified result',
    () async {
      final session = await review();
      final actions = editor(session)
        ..select(AssistanceVisitDisposition.returned);
      Future<EventAssistanceAccountabilityResult>? reentrant;
      container.listen(commandProvider, (_, next) {
        if (next is AccountabilityForm &&
            next.phase == AccountabilityPhase.submitting) {
          reentrant = actions.submit();
        }
      });
      final pending = actions.submit();
      expect(actions.submit(), same(pending));
      expect(reentrant, same(pending));
      expect(form().canDismiss, isFalse);
      expect(form().canSelect, isFalse);
      expect(form().canReload, isFalse);
      actions.select(AssistanceVisitDisposition.departed);
      expect(
        repository.writes.single.change.disposition,
        AssistanceVisitDisposition.returned,
      );
      expect(EventAssistanceAccountabilityController.mutationKey(session), (
        guest: accountabilityScope.guest,
        account: session.account,
      ));
      confirm(0);
      final result = await pending;
      await container.pump();
      expect(form().phase, AccountabilityPhase.saved);
      expect(await actions.submit(), same(result));
      expect(repository.writes.length, 1);
      expect(repository.reads.length, 2);
    },
  );

  test(
    'an uncertain decision survives closing and reopening against a fresh page',
    () async {
      final session = await review();
      final subscription = container.listen(commandProvider, (_, _) {});
      final actions = container.read(commandProvider.notifier)..open(session);
      actions.select(AssistanceVisitDisposition.returned);
      await fail(0, actions.submit());
      final original = repository.writes.single.change;
      final payload = original.command;
      subscription.close();
      await container.pump();
      expect(container.exists(commandProvider), isTrue);
      container.read(query.notifier).reload();
      await container.pump();
      await completeRead(
        1,
        view: accountabilityView(disposition: 'returned', revision: 1),
      );
      final fresh = container.read(query).requireValue;
      container.listen(commandProvider, (_, _) {});
      final reopened = container.read(commandProvider.notifier)..open(fresh);
      expect(reopened, same(actions));
      expect(form().change, same(original));
      expect(form().canReload, isFalse);
      actions.select(AssistanceVisitDisposition.unresolved);
      expect(form().change, same(original));
      final retry = actions.retry();
      expect(repository.writes.last.change, same(original));
      expect(repository.writes.last.change.command, payload);
      confirm(1);
      await retry;
      expect(form().phase, AccountabilityPhase.saved);
    },
  );

  test(
    'an uncertain visit result stays shared across group and checkpoint reviews',
    () async {
      final actions = editor(await review())
        ..select(AssistanceVisitDisposition.returned);
      await fail(0, actions.submit());
      final original = repository.writes.single.change;
      final other = EventAssistanceAccountabilityScope(
        group: EventAssistanceGroupScope(
          organizerId: 'org-1',
          eventId: 'event-1',
          groupId: 'easy',
        ),
        attendeeId: 'guest-1',
        checkpoint: AssistanceAccountabilityCheckpoint(
          checkpointId: 'stop-2',
          progressRevision: 7,
        ),
      );
      final otherQuery = eventAssistanceAccountabilityProvider(other);
      container.listen(otherQuery, (_, _) {});
      await completeRead(1, view: accountabilityView(scope: other));
      final next = eventAssistanceAccountabilityControllerProvider(other.guest);
      expect(next, commandProvider);
      container
          .read(next.notifier)
          .open(container.read(otherQuery).requireValue);
      actions.select(AssistanceVisitDisposition.departed);
      final pending = actions.retry();
      expect(repository.writes.last.change, same(original));
      expect(repository.writes.last.change.snapshot.scope, accountabilityScope);
      expect(repository.writes.last.change.snapshot.scope.checkpoint, isNull);
      confirm(1);
      await pending;
      await container.pump();
      expect(repository.reads.length, 4);
    },
  );

  test(
    'unavailable visits remain reviewable without offering a write',
    () async {
      await signIn('host-1');
      await completeRead(0, view: accountabilityView(reason: 'notCheckedIn'));
      final actions = editor(container.read(query).requireValue);
      expect(form().review.view.canResolve, isFalse);
      expect(form().canSelect, isFalse);
      actions.select(AssistanceVisitDisposition.returned);
      expect(form().canSubmit, isFalse);
      await expectLater(actions.submit(), throwsA(isA<ValidationException>()));
      expect(repository.writes, isEmpty);
    },
  );

  test('a retry from the failure callback gets a new active future', () async {
    final actions = editor(await review())
      ..select(AssistanceVisitDisposition.returned);
    Future<EventAssistanceAccountabilityResult>? retry;
    container.listen(commandProvider, (_, next) {
      if (next is AccountabilityForm && next.canRetry && retry == null) {
        retry = actions.retry();
      }
    });
    await fail(0, actions.submit());
    expect(repository.writes.length, 2);
    confirm(1);
    await retry!;
    expect(form().phase, AccountabilityPhase.saved);
  });

  test(
    'unverified success remains uncertain until the exact request is confirmed',
    () async {
      final actions = editor(await review())
        ..select(AssistanceVisitDisposition.returned);
      final check = expectLater(actions.submit(), throwsFormatException);
      repository.writes.single.result.complete(
        accountabilityResult(accountabilityWire()),
      );
      await check;
      expect(form().phase, AccountabilityPhase.retryRequired);
      final retry = actions.retry();
      expect(
        repository.writes.last.change,
        same(repository.writes.first.change),
      );
      confirm(1);
      await retry;
    },
  );

  test(
    'a definitive conflict requires fresh authority and a new operation',
    () async {
      final actions = editor(await review())
        ..select(AssistanceVisitDisposition.returned);
      await fail(
        0,
        actions.submit(),
        error: const BackendOperationException(
          code: 'aborted',
          message: 'Accountability changed',
          context: BackendErrorContext(
            service: BackendService.functions,
            action: 'accountability',
            resource: 'eventAttendees',
          ),
        ),
      );
      expect(form().phase, AccountabilityPhase.refreshRequired);
      await expectLater(actions.retry(), throwsA(isA<ValidationException>()));
      await completeRead(1);
      actions.open(container.read(query).requireValue);
      actions.select(AssistanceVisitDisposition.departed);
      final pending = actions.submit();
      expect(
        repository.writes.last.change.operationId,
        isNot(repository.writes.first.change.operationId),
      );
      confirm(1);
      await pending;
    },
  );

  for (final transition in ['switchBack', 'authError']) {
    test('closed pending editor loses authority after $transition', () async {
      final session = await review();
      final subscription = container.listen(commandProvider, (_, _) {});
      final actions = container.read(commandProvider.notifier)..open(session);
      actions.select(AssistanceVisitDisposition.returned);
      await fail(0, actions.submit());
      subscription.close();
      await container.pump();
      if (transition == 'switchBack') {
        await signIn('host-2');
        await signIn('host-1');
      } else {
        auth.addError(StateError('Authentication unavailable'));
        await container.pump();
      }
      container.listen(commandProvider, (_, _) {});
      final reopened = container.read(commandProvider.notifier);
      expect(container.read(commandProvider), isNot(isA<AccountabilityForm>()));
      await expectLater(
        reopened.retry(),
        throwsA(same(accountabilitySessionChanged)),
      );
      expect(repository.writes.length, 1);
    });
  }

  test('a late completion cannot restore the old account state', () async {
    final actions = editor(await review())
      ..select(AssistanceVisitDisposition.returned);
    final check = expectLater(
      actions.submit(),
      throwsA(same(accountabilitySessionChanged)),
    );
    await signIn(null);
    await signIn('host-1');
    confirm(0);
    await check;
    expect(container.read(commandProvider), isNot(isA<AccountabilityForm>()));
    expect(repository.writes.length, 1);
  });

  test(
    'loading, account changes and failed reads never expose old accountability',
    () async {
      expect(container.read(query).isLoading, isTrue);
      expect(repository.reads, isEmpty);
      await signIn('host-1');
      await signIn('host-2');
      await completeRead(0);
      expect(container.read(query).isLoading, isTrue);
      repository.reads[1].result.completeError(
        const NetworkException('unavailable', 'Offline'),
      );
      await container.pump();
      expect(container.read(query).hasError, isTrue);
      expect(container.read(query).hasValue, isFalse);
      await container.pump();
      expect(repository.reads.length, 2);
      container.read(query.notifier).reload();
      await container.pump();
      await completeRead(2);
      expect(container.read(query).requireValue.account.uid, 'host-2');
      await signIn(null);
      expect(container.read(query).hasValue, isFalse);
    },
  );

  test(
    'equal scopes share a read and a later reload wins over an older completion',
    () async {
      final first = await review();
      final sameScope = EventAssistanceAccountabilityScope(
        group: accountabilityGroup,
        attendeeId: accountabilityScope.attendeeId,
      );
      container.listen(
        eventAssistanceAccountabilityProvider(sameScope),
        (_, _) {},
      );
      expect(repository.reads.length, 1);
      container.read(query.notifier).reload();
      await container.pump();
      container.read(query.notifier).reload();
      await container.pump();
      await completeRead(
        2,
        view: accountabilityView(disposition: 'returned', revision: 1),
      );
      final fresh = container.read(query).requireValue;
      await completeRead(1);
      expect(container.read(query).requireValue, same(fresh));
      expect(first.isCurrent, isFalse);
      expect(fresh.view.disposition, AssistanceVisitDisposition.returned);
    },
  );
}

class _Repository extends Fake
    implements EventAssistanceAccountabilityRepository {
  Completer<void> _changed = Completer<void>();
  final reads =
      <
        ({
          EventAssistanceAccountabilityScope scope,
          Completer<EventAssistanceAccountabilityView> result,
        })
      >[];
  final writes =
      <
        ({
          EventAssistanceAccountabilityChange change,
          Completer<EventAssistanceAccountabilityResult> result,
        })
      >[];
  Future<void> waitForReads(int count) async {
    while (reads.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }

  @override
  Future<EventAssistanceAccountabilityView> fetch(
    EventAssistanceAccountabilityScope scope,
  ) {
    final result = Completer<EventAssistanceAccountabilityView>();
    reads.add((scope: scope, result: result));
    _changed.complete();
    _changed = Completer<void>();
    return result.future;
  }

  @override
  Future<EventAssistanceAccountabilityResult> apply(
    EventAssistanceAccountabilityChange change,
  ) {
    final result = Completer<EventAssistanceAccountabilityResult>();
    writes.add((change: change, result: result));
    return result.future;
  }
}
