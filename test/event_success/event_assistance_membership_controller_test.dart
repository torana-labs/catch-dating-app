import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_membership_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_provider.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_membership_fixtures.dart';

void main() {
  late _Repository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  final query = eventAssistanceMembershipProvider(membershipScope);
  final commandProvider = eventAssistanceMembershipControllerProvider(
    membershipScope,
  );
  setUp(() {
    repository = _Repository();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventAssistanceMembershipRepositoryProvider.overrideWith(
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
    EventAssistanceMembershipView? view,
  }) async {
    await repository.waitForReads(index + 1);
    repository.reads[index].result.complete(view ?? membershipView());
    await container.pump();
  }

  Future<EventAssistanceMembershipSession> review() async {
    await signIn('host-1');
    await completeRead(0);
    return container.read(query).requireValue;
  }

  EventAssistanceMembershipController editor(
    EventAssistanceMembershipSession session,
  ) {
    container.listen(commandProvider, (_, _) {});
    return container.read(commandProvider.notifier)..open(session);
  }

  MembershipForm form() => container.read(commandProvider) as MembershipForm;
  void confirm(int index) {
    final write = repository.writes[index];
    write.result.complete(
      membershipResult(membershipAppliedWire(write.change)),
    );
  }

  Future<void> fail(
    int index,
    Future<EventAssistanceMembershipResult> pending, {
    Object error = const NetworkException('unavailable', 'Offline'),
  }) async {
    final check = expectLater(pending, throwsA(same(error)));
    repository.writes[index].result.completeError(error);
    await check;
  }

  test(
    'no implicit choice; invalid and obsolete selections cannot be submitted',
    () async {
      final session = await review();
      final actions = editor(session);
      expect(form().canSubmit, isFalse);
      expect(form().change, isNull);
      actions.select(const AssistancePlaceGroup('easy'));
      expect(form().canSubmit, isTrue);
      actions.select(const AssistancePlaceGroup('unknown'));
      expect(form().error, isA<FormatException>());
      expect(form().change, isNull);
      actions.select(const AssistancePlaceGroup('easy'));
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
        ..select(const AssistancePlaceGroup('easy'));
      Future<EventAssistanceMembershipResult>? reentrant;
      container.listen(commandProvider, (_, next) {
        if (next is MembershipForm &&
            next.phase == MembershipPhase.submitting) {
          reentrant = actions.submit();
        }
      });
      final pending = actions.submit();
      expect(actions.submit(), same(pending));
      expect(reentrant, same(pending));
      expect(form().canDismiss, isFalse);
      expect(form().canSelect, isFalse);
      expect(form().canReload, isFalse);
      actions.select(const AssistancePlaceGroup('tempo'));
      expect(
        (repository.writes.single.change.decision as AssistancePlaceGroup)
            .groupId,
        'easy',
      );
      expect(EventAssistanceMembershipController.mutationKey(session), (
        scope: membershipScope,
        account: session.account,
      ));
      confirm(0);
      final result = await pending;
      await container.pump();
      expect(form().phase, MembershipPhase.saved);
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
      actions.select(const AssistancePlaceGroup('easy'));
      await fail(0, actions.submit());
      final original = repository.writes.single.change;
      final payload = original.command;
      subscription.close();
      await container.pump();
      expect(container.exists(commandProvider), isTrue);
      container.read(query.notifier).reload();
      await container.pump();
      await completeRead(1, view: membershipView(state: 'current'));
      final fresh = container.read(query).requireValue;
      container.listen(commandProvider, (_, _) {});
      final reopened = container.read(commandProvider.notifier)..open(fresh);
      expect(reopened, same(actions));
      expect(form().change, same(original));
      expect(form().canReload, isFalse);
      actions.select(const AssistanceLeaveGroup());
      expect(form().change, same(original));
      final retry = actions.retry();
      expect(repository.writes.last.change, same(original));
      expect(repository.writes.last.change.command, payload);
      confirm(1);
      await retry;
      expect(form().phase, MembershipPhase.saved);
    },
  );

  test('a retry from the failure callback gets a new active future', () async {
    final actions = editor(await review())
      ..select(const AssistancePlaceGroup('easy'));
    Future<EventAssistanceMembershipResult>? retry;
    container.listen(commandProvider, (_, next) {
      if (next is MembershipForm && next.canRetry && retry == null) {
        retry = actions.retry();
      }
    });
    await fail(0, actions.submit());
    expect(repository.writes.length, 2);
    confirm(1);
    await retry!;
    expect(form().phase, MembershipPhase.saved);
  });

  test(
    'unverified success remains uncertain until the exact request is confirmed',
    () async {
      final actions = editor(await review())
        ..select(const AssistancePlaceGroup('easy'));
      final check = expectLater(actions.submit(), throwsFormatException);
      repository.writes.single.result.complete(
        membershipResult(membershipWire()),
      );
      await check;
      expect(form().phase, MembershipPhase.retryRequired);
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
        ..select(const AssistancePlaceGroup('easy'));
      await fail(
        0,
        actions.submit(),
        error: const BackendOperationException(
          code: 'aborted',
          message: 'Membership changed',
          context: BackendErrorContext(
            service: BackendService.functions,
            action: 'membership',
            resource: 'eventAssistanceMemberships',
          ),
        ),
      );
      expect(form().phase, MembershipPhase.refreshRequired);
      await expectLater(actions.retry(), throwsA(isA<ValidationException>()));
      await completeRead(1);
      actions.open(container.read(query).requireValue);
      actions.select(const AssistancePlaceGroup('tempo'));
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
      actions.select(const AssistancePlaceGroup('easy'));
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
      expect(container.read(commandProvider), isNot(isA<MembershipForm>()));
      await expectLater(
        reopened.retry(),
        throwsA(same(membershipSessionChanged)),
      );
      expect(repository.writes.length, 1);
    });
  }

  test('a late completion cannot restore the old account state', () async {
    final actions = editor(await review())
      ..select(const AssistancePlaceGroup('easy'));
    final check = expectLater(
      actions.submit(),
      throwsA(same(membershipSessionChanged)),
    );
    await signIn(null);
    await signIn('host-1');
    confirm(0);
    await check;
    expect(container.read(commandProvider), isNot(isA<MembershipForm>()));
    expect(repository.writes.length, 1);
  });

  test(
    'loading, account changes and failed reads never expose old membership',
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
      final sameScope = EventAssistanceGuestScope(
        organizerId: membershipScope.organizerId,
        eventId: membershipScope.eventId,
        attendeeId: membershipScope.attendeeId,
      );
      container.listen(eventAssistanceMembershipProvider(sameScope), (_, _) {});
      expect(repository.reads.length, 1);
      container.read(query.notifier).reload();
      await container.pump();
      container.read(query.notifier).reload();
      await container.pump();
      await completeRead(2, view: membershipView(state: 'current'));
      final fresh = container.read(query).requireValue;
      await completeRead(1);
      expect(container.read(query).requireValue, same(fresh));
      expect(first.isCurrent, isFalse);
      expect(fresh.view.accepted?.groupId, 'easy');
    },
  );
}

class _Repository extends Fake implements EventAssistanceMembershipRepository {
  Completer<void> _changed = Completer<void>();
  final reads =
      <
        ({
          EventAssistanceGuestScope scope,
          Completer<EventAssistanceMembershipView> result,
        })
      >[];
  final writes =
      <
        ({
          EventAssistanceMembershipChange change,
          Completer<EventAssistanceMembershipResult> result,
        })
      >[];
  Future<void> waitForReads(int count) async {
    while (reads.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }

  @override
  Future<EventAssistanceMembershipView> fetch(EventAssistanceGuestScope scope) {
    final result = Completer<EventAssistanceMembershipView>();
    reads.add((scope: scope, result: result));
    _changed.complete();
    _changed = Completer<void>();
    return result.future;
  }

  @override
  Future<EventAssistanceMembershipResult> apply(
    EventAssistanceMembershipChange change,
  ) {
    final result = Completer<EventAssistanceMembershipResult>();
    writes.add((change: change, result: result));
    return result.future;
  }
}
