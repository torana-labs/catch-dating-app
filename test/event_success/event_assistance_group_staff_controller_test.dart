import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_group_staff_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff_change.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_group_staff_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_group_staff_provider.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_group_staff_fixtures.dart';

void main() {
  late _Repository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  final query = eventAssistanceGroupStaffProvider(staffLookup);
  final commandProvider = eventAssistanceGroupStaffControllerProvider(
    staffTarget,
  );
  setUp(() {
    repository = _Repository();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventAssistanceGroupStaffRepositoryProvider.overrideWith(
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
    EventAssistanceGroupStaffView? view,
  }) async {
    await repository.waitForReads(index + 1);
    repository.reads[index].result.complete(view ?? staffView());
    await container.pump();
  }

  Future<EventAssistanceGroupStaffSession> review() async {
    await signIn('host-1');
    await completeRead(0);
    return container.read(query).requireValue;
  }

  EventAssistanceGroupStaffController editor(
    EventAssistanceGroupStaffSession session,
  ) {
    container.listen(commandProvider, (_, _) {});
    return container.read(commandProvider.notifier)..open(session);
  }

  GroupStaffForm form() => container.read(commandProvider) as GroupStaffForm;
  void confirm(int index) {
    final write = repository.writes[index];
    write.result.complete(staffResult(staffAppliedWire(write.change)));
  }

  Future<void> fail(
    int index,
    Future<EventAssistanceGroupStaffResult> pending, {
    Object error = const NetworkException('unavailable', 'Offline'),
  }) async {
    final check = expectLater(pending, throwsA(same(error)));
    repository.writes[index].result.completeError(error);
    await check;
  }

  test('rate limiting preserves an earlier uncertain request', () async {
    final actions = editor(await review())..select(assignLead);
    await fail(0, actions.submit());
    final original = form().change;
    await fail(
      1,
      actions.retry(),
      error: const NetworkException('resource-exhausted', 'Try again later'),
    );
    expect(form().phase, GroupStaffPhase.retryRequired);
    expect(form().canReload, isFalse);
    expect(form().change, same(original));
    final retry = actions.retry();
    expect(repository.writes[2].change, same(original));
    confirm(2);
    await retry;
    expect(form().phase, GroupStaffPhase.saved);
  });

  test(
    'no implicit choice; invalid and obsolete selections cannot be submitted',
    () async {
      final session = await review();
      final actions = editor(session);
      expect(form().canSubmit, isFalse);
      expect(form().change, isNull);
      actions.select(assignLead);
      expect(form().canSubmit, isTrue);
      actions.select(
        const AssistanceAssignGroupDuty(
          duty: AssistanceGroupDuty.lead,
          expiresAt: 0,
        ),
      );
      expect(form().error, isA<FormatException>());
      expect(form().change, isNull);
      actions.select(assignLead);
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
      final actions = editor(session)..select(assignLead);
      Future<EventAssistanceGroupStaffResult>? reentrant;
      container.listen(commandProvider, (_, next) {
        if (next is GroupStaffForm &&
            next.phase == GroupStaffPhase.submitting) {
          reentrant = actions.submit();
        }
      });
      final pending = actions.submit();
      expect(actions.submit(), same(pending));
      expect(reentrant, same(pending));
      expect(form().canDismiss, isFalse);
      expect(form().canSelect, isFalse);
      expect(form().canReload, isFalse);
      actions.select(assignSweep);
      expect(
        (repository.writes.single.change.decision as AssistanceAssignGroupDuty)
            .duty,
        AssistanceGroupDuty.lead,
      );
      expect(EventAssistanceGroupStaffController.mutationKey(session), (
        target: staffTarget,
        account: session.account,
      ));
      confirm(0);
      final result = await pending;
      await container.pump();
      expect(form().phase, GroupStaffPhase.saved);
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
      actions.select(assignLead);
      await fail(0, actions.submit());
      final original = repository.writes.single.change;
      final payload = original.toJson();
      subscription.close();
      await container.pump();
      expect(container.exists(commandProvider), isTrue);
      container.read(query.notifier).reload();
      await container.pump();
      await completeRead(1, view: staffView(status: 'assigned'));
      final fresh = container.read(query).requireValue;
      container.listen(commandProvider, (_, _) {});
      final reopened = container.read(commandProvider.notifier)..open(fresh);
      expect(reopened, same(actions));
      expect(form().change, same(original));
      expect(form().canReload, isFalse);
      actions.select(const AssistanceRemoveGroupDuty());
      expect(form().change, same(original));
      final retry = actions.retry();
      expect(repository.writes.last.change, same(original));
      expect(repository.writes.last.change.toJson(), payload);
      confirm(1);
      await retry;
      expect(form().phase, GroupStaffPhase.saved);
    },
  );

  test(
    'another phone for the same verified UID cannot replace an uncertain decision',
    () async {
      final actions = editor(await review())..select(assignLead);
      await fail(0, actions.submit());
      final original = repository.writes.single.change;
      final otherLookup = EventAssistanceGroupStaffLookup(
        group: staffGroup,
        phoneNumber: '+919876549999',
      );
      final otherQuery = eventAssistanceGroupStaffProvider(otherLookup);
      container.listen(otherQuery, (_, _) {});
      await completeRead(
        1,
        view: staffResult(
          staffWire(lookup: otherLookup),
          lookup: otherLookup,
        ).view,
      );
      final other = container.read(otherQuery).requireValue;
      expect(other.view.target, staffTarget);
      final sameEditor = eventAssistanceGroupStaffControllerProvider(
        other.view.target,
      );
      expect(sameEditor, commandProvider);
      container.read(sameEditor.notifier).open(other);
      actions.select(assignSweep);
      final pending = actions.retry();
      expect(repository.writes.last.change, same(original));
      expect(
        repository.writes.last.change.toJson()['phoneNumber'],
        staffLookup.phoneNumber,
      );
      confirm(1);
      await pending;
    },
  );

  test(
    'a lookup resolving to another account cannot open the reviewed target editor',
    () async {
      final actions = editor(await review());
      container.read(query.notifier).reload();
      await completeRead(
        1,
        view: staffResult(staffWire(uid: 'new-phone-owner')).view,
      );
      final reassigned = container.read(query).requireValue;
      expect(
        () => actions.open(reassigned),
        throwsA(isA<ValidationException>()),
      );
      actions.select(assignLead);
      expect(form().canSubmit, isFalse);
      expect(repository.writes, isEmpty);
      final next = eventAssistanceGroupStaffControllerProvider(
        reassigned.view.target,
      );
      container.listen(next, (_, _) {});
      container.read(next.notifier).open(reassigned);
      expect(container.read(next), isA<GroupStaffForm>());
    },
  );

  test('a retry from the failure callback gets a new active future', () async {
    final actions = editor(await review())..select(assignLead);
    Future<EventAssistanceGroupStaffResult>? retry;
    container.listen(commandProvider, (_, next) {
      if (next is GroupStaffForm && next.canRetry && retry == null) {
        retry = actions.retry();
      }
    });
    await fail(0, actions.submit());
    expect(repository.writes.length, 2);
    confirm(1);
    await retry!;
    expect(form().phase, GroupStaffPhase.saved);
  });

  test(
    'unverified success remains uncertain until the exact request is confirmed',
    () async {
      final actions = editor(await review())..select(assignLead);
      final check = expectLater(actions.submit(), throwsFormatException);
      repository.writes.single.result.complete(staffResult(staffWire()));
      await check;
      expect(form().phase, GroupStaffPhase.retryRequired);
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
      final actions = editor(await review())..select(assignLead);
      await fail(
        0,
        actions.submit(),
        error: const BackendOperationException(
          code: 'aborted',
          message: 'GroupStaff changed',
          context: BackendErrorContext(
            service: BackendService.functions,
            action: 'staff',
            resource: 'eventStaffGrants',
          ),
        ),
      );
      expect(form().phase, GroupStaffPhase.refreshRequired);
      await expectLater(actions.retry(), throwsA(isA<ValidationException>()));
      await completeRead(1);
      actions.open(container.read(query).requireValue);
      actions.select(assignSweep);
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
      actions.select(assignLead);
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
      expect(container.read(commandProvider), isNot(isA<GroupStaffForm>()));
      await expectLater(
        reopened.retry(),
        throwsA(same(groupStaffSessionChanged)),
      );
      expect(repository.writes.length, 1);
    });
  }

  test('a late completion cannot restore the old account state', () async {
    final actions = editor(await review())..select(assignLead);
    final check = expectLater(
      actions.submit(),
      throwsA(same(groupStaffSessionChanged)),
    );
    await signIn(null);
    await signIn('host-1');
    confirm(0);
    await check;
    expect(container.read(commandProvider), isNot(isA<GroupStaffForm>()));
    expect(repository.writes.length, 1);
  });

  test(
    'loading, account changes and failed reads never expose old staff',
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
      final sameScope = EventAssistanceGroupStaffLookup(
        group: staffGroup,
        phoneNumber: '+91 98765 43210',
      );
      container.listen(eventAssistanceGroupStaffProvider(sameScope), (_, _) {});
      expect(repository.reads.length, 1);
      container.read(query.notifier).reload();
      await container.pump();
      container.read(query.notifier).reload();
      await container.pump();
      await completeRead(2, view: staffView(status: 'assigned'));
      final fresh = container.read(query).requireValue;
      await completeRead(1);
      expect(container.read(query).requireValue, same(fresh));
      expect(first.isCurrent, isFalse);
      expect(fresh.view.currentDuty?.duty, AssistanceGroupDuty.lead);
    },
  );
}

class _Repository extends Fake implements EventAssistanceGroupStaffRepository {
  Completer<void> _changed = Completer<void>();
  final reads =
      <
        ({
          EventAssistanceGroupStaffLookup lookup,
          Completer<EventAssistanceGroupStaffView> result,
        })
      >[];
  final writes =
      <
        ({
          EventAssistanceGroupStaffChange change,
          Completer<EventAssistanceGroupStaffResult> result,
        })
      >[];
  Future<void> waitForReads(int count) async {
    while (reads.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }

  @override
  Future<EventAssistanceGroupStaffView> fetch(
    EventAssistanceGroupStaffLookup lookup,
  ) {
    final result = Completer<EventAssistanceGroupStaffView>();
    reads.add((lookup: lookup, result: result));
    _changed.complete();
    _changed = Completer<void>();
    return result.future;
  }

  @override
  Future<EventAssistanceGroupStaffResult> apply(
    EventAssistanceGroupStaffChange change,
  ) {
    final result = Completer<EventAssistanceGroupStaffResult>();
    writes.add((change: change, result: result));
    return result.future;
  }
}
