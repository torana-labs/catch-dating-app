import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_staff_change.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_practice_role_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_staff_controller.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const sessionId = 'practice-room';
const pacer = 'practice-staff:pacer';
const sweep = 'practice-staff:sweep';
Map<String, Object?> sample(String name) =>
    (jsonDecode(
              File(
                'test/event_rehearsal/fixtures/staff_reviews.json',
              ).readAsStringSync(),
            )
            as Map)[name]
        as Map<String, Object?>;
EventRehearsalBootstrap snapshot(String name) =>
    EventRehearsalBootstrap.fromCallableData(sample(name));

void main() {
  late _Repository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  final query = eventRehearsalAssistanceProvider(sessionId);
  final owner = eventRehearsalStaffControllerProvider(sessionId);
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
  Future<RehearsalAssistanceReview> review() async {
    auth.add('host-1');
    await container.pump();
    await repository.waitForReads(1);
    repository.reads.single.complete(snapshot('beforeStaffEdit'));
    await container.pump();
    return container.read(query).requireValue;
  }

  EventRehearsalStaffController edit(RehearsalAssistanceReview review) =>
      container.read(owner.notifier)..open(review);
  void select(EventRehearsalStaffController editor, {String name = 'new'}) =>
      editor.select(
        operatorId: 'practice-staff:new',
        displayName: name,
        groupId: 'fast',
        decision: const AssistanceAssignGroupDuty(
          duty: AssistanceGroupDuty.sweep,
          expiresAt: 3601000,
        ),
      );
  RehearsalStaffForm form() => container.read(owner) as RehearsalStaffForm;
  EventRehearsalBootstrap result(RehearsalStaffChange change) {
    final raw = sample('staffAssigned');
    raw['actions'] = [
      {
        'clientActionId': change.clientActionId,
        'actorId': null,
        'kind': 'control',
        'name': 'staff:assign',
        'runtimeRevision': change.snapshot.session.runtimeRevision + 1,
        'virtualNowMillis': change.snapshot.serverTime,
      },
    ];
    return EventRehearsalBootstrap.fromCallableData(raw);
  }

  Future<void> fail(Future<EventRehearsalBootstrap> pending, int index) async {
    final expected = expectLater(pending, throwsA(isA<NetworkException>()));
    repository.writes[index].result.completeError(
      const NetworkException('unavailable', 'Offline'),
    );
    await expected;
  }

  test(
    'staff edit coalesces double taps and verifies the actual duty receipt',
    () async {
      final r = await review();
      final listener = container.listen(owner, (_, _) {});
      final editor = edit(r);
      select(editor);
      final pending = editor.submit();
      expect(editor.submit(), same(pending));
      expect(form().canDismiss, isFalse);
      final write = repository.writes.single;
      write.result.complete(result(write.change));
      expect(await pending, isA<EventRehearsalBootstrap>());
      expect(form().phase, RehearsalStaffPhase.saved);
      expect(await editor.submit(), same(form().result));
      expect(repository.writes, hasLength(1));
      listener.close();
    },
  );

  test(
    'unknown outcome survives dismissal, refresh and another staff selection',
    () async {
      final r = await review();
      final listener = container.listen(owner, (_, _) {});
      final editor = edit(r);
      select(editor);
      final first = editor.submit();
      await fail(first, 0);
      final frozen = form().change!;
      listener.close();
      await container.pump();
      container.read(query.notifier).reload();
      await container.pump();
      await repository.waitForReads(2);
      await repository.waitForReads(2);
      repository.reads.last.complete(snapshot('staffAssigned'));
      await container.pump();
      final next = container.read(query).requireValue;
      final reopened = container.listen(owner, (_, _) {});
      edit(next);
      select(editor, name: 'different');
      expect(form().change, same(frozen));
      expect(form().canReload, isFalse);
      final retry = editor.retry();
      expect(repository.writes.last.change, same(frozen));
      repository.writes.last.result.complete(result(frozen));
      await retry;
      expect(form().phase, RehearsalStaffPhase.saved);
      reopened.close();
    },
  );

  test(
    'malformed success keeps the exact staff request for reconciliation',
    () async {
      final r = await review();
      container.listen(owner, (_, _) {});
      final editor = edit(r);
      select(editor);
      final pending = editor.submit();
      final expected = expectLater(pending, throwsFormatException);
      repository.writes.single.result.complete(snapshot('staffAssigned'));
      await expected;
      expect(form().phase, RehearsalStaffPhase.retryRequired);
      final frozen = form().change;
      final retry = editor.retry();
      expect(repository.writes.last.change, same(frozen));
      repository.writes.last.result.complete(result(frozen!));
      await retry;
    },
  );

  test(
    'definitive denial releases pending intent and requires current review',
    () async {
      final r = await review();
      container.listen(owner, (_, _) {});
      final editor = edit(r);
      select(editor);
      final pending = editor.submit();
      final error = const BackendOperationException(
        code: 'aborted',
        message: 'The run changed.',
        context: BackendErrorContext(
          service: BackendService.functions,
          action: 'edit staff',
          resource: 'eventRehearsals',
        ),
      );
      final expected = expectLater(pending, throwsA(same(error)));
      repository.writes.single.result.completeError(error);
      await expected;
      expect(form().phase, RehearsalStaffPhase.refreshRequired);
      expect(form().canReload, isTrue);
      await expectLater(editor.retry(), throwsA(isA<ValidationException>()));
      expect(repository.writes, hasLength(1));
    },
  );

  test('rate limiting cannot settle an unresolved staff save', () async {
    final r = await review();
    container.listen(owner, (_, _) {});
    final editor = edit(r);
    select(editor);
    await fail(editor.submit(), 0);
    final frozen = form().change!;
    final retry = editor.retry();
    const error = BackendOperationException(
      code: 'resource-exhausted',
      message: 'Try later',
      context: BackendErrorContext(
        service: BackendService.functions,
        action: 'edit staff',
        resource: 'eventRehearsals',
      ),
    );
    final expected = expectLater(retry, throwsA(same(error)));
    repository.writes.last.result.completeError(error);
    await expected;
    expect(form().phase, RehearsalStaffPhase.retryRequired);
    expect(form().change, same(frozen));
    expect(form().canReload, isFalse);
  });

  test('refresh before submission cannot apply a stale draft', () async {
    final r = await review();
    container.listen(owner, (_, _) {});
    final editor = edit(r);
    select(editor);
    container.read(query.notifier).reload();
    await container.pump();
    await expectLater(editor.submit(), throwsA(isA<ValidationException>()));
    expect(repository.writes, isEmpty);
  });

  test(
    'detached pending editor detects sign-out and same-UID sign-in',
    () async {
      final r = await review();
      final listener = container.listen(owner, (_, _) {});
      final editor = edit(r);
      select(editor);
      final pending = editor.submit();
      final expected = expectLater(
        pending,
        throwsA(same(rehearsalReviewSessionChanged)),
      );
      listener.close();
      await container.pump();
      auth.add(null);
      await container.pump();
      auth.add('host-1');
      await container.pump();
      repository.writes.single.result.complete(
        result(repository.writes.single.change),
      );
      await expected;
      await expectLater(
        editor.retry(),
        throwsA(same(rehearsalReviewSessionChanged)),
      );
      expect(repository.writes, hasLength(1));
    },
  );

  test('role selection is run-scoped and auth-epoch scoped', () async {
    final r = await review();
    final scope = (
      sessionId: sessionId,
      clockId: r.snapshot.staffReview!.clockId,
    );
    final provider = eventRehearsalPracticeRoleControllerProvider(scope);
    container.listen(provider, (_, _) {});
    final editor = container.read(provider.notifier);
    expect(container.read(provider), isNull);
    editor.select(r, pacer);
    expect(container.read(provider), pacer);
    expect(
      () => editor.select(r, 'practice-staff:unknown'),
      throwsA(isA<ValidationException>()),
    );
    expect(container.read(provider), pacer);
    final other = eventRehearsalPracticeRoleControllerProvider((
      sessionId: sessionId,
      clockId: 'clock:new',
    ));
    expect(container.read(other), isNull);
    expect(
      () => container.read(other.notifier).select(r, sweep),
      throwsA(isA<ValidationException>()),
    );
    auth.add(null);
    await container.pump();
    expect(container.read(provider), isNull);
    auth.add('host-1');
    await container.pump();
    expect(
      () => editor.select(r, pacer),
      throwsA(same(rehearsalReviewSessionChanged)),
    );
  });

  test(
    'role queries do not share Host data and reject an impersonated response',
    () async {
      await review();
      final p = eventRehearsalAssistanceProvider(
        sessionId,
        practiceOperatorId: pacer,
      );
      final s = eventRehearsalAssistanceProvider(
        sessionId,
        practiceOperatorId: sweep,
      );
      container.listen(p, (_, _) {});
      container.listen(s, (_, _) {});
      await container.pump();
      expect(repository.roles.map((r) => r.role), [pacer, sweep]);
      expect(repository.roles.every((r) => r.host == 'host-1'), isTrue);
      repository.roles[0].result.complete(snapshot('pacer'));
      repository.roles[1].result.complete(snapshot('manager'));
      await container.pump();
      expect(
        container.read(p).requireValue.snapshot.staffReview!.actorUid,
        pacer,
      );
      expect(container.read(s).error, isA<FormatException>());
      expect(
        container.read(query).requireValue.snapshot.staffReview!.isManager,
        isTrue,
      );
    },
  );

  test(
    'staff editor rejects a role-scoped review even for the real Host',
    () async {
      await review();
      final p = eventRehearsalAssistanceProvider(
        sessionId,
        practiceOperatorId: pacer,
      );
      container.listen(p, (_, _) {});
      await container.pump();
      repository.roles.single.result.complete(snapshot('pacer'));
      await container.pump();
      final r = container.read(p).requireValue;
      expect(() => edit(r), throwsA(isA<ValidationException>()));
      expect(repository.writes, isEmpty);
    },
  );
}

class _Repository extends Fake implements EventRehearsalRepository {
  Completer<void> _changed = Completer<void>();
  Future<void> waitForReads(int count) async {
    while (reads.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }

  final reads = <Completer<EventRehearsalBootstrap>>[];
  final roles =
      <
        ({String role, String host, Completer<EventRehearsalBootstrap> result})
      >[];
  final writes =
      <
        ({
          RehearsalStaffChange change,
          Completer<EventRehearsalBootstrap> result,
        })
      >[];
  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) {
    final result = Completer<EventRehearsalBootstrap>();
    reads.add(result);
    _changed.complete();
    _changed = Completer<void>();
    return result.future;
  }

  @override
  Future<EventRehearsalBootstrap> fetchPracticeRole({
    required String sessionId,
    required String practiceOperatorId,
    required String hostUid,
  }) {
    final result = Completer<EventRehearsalBootstrap>();
    roles.add((role: practiceOperatorId, host: hostUid, result: result));
    return result.future;
  }

  @override
  Future<EventRehearsalBootstrap> applyStaff(RehearsalStaffChange change) {
    final result = Completer<EventRehearsalBootstrap>();
    writes.add((change: change, result: result));
    return result.future;
  }
}
