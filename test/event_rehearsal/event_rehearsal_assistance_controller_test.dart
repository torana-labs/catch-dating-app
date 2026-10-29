import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_help_requests.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_editor.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_account.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_assistance_fixtures.dart';

void main() {
  late _Repository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  final query = eventRehearsalAssistanceProvider('session-1');
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
  Future<void> signIn(String? uid) async {
    final expected = repository.reads.length + 1;
    auth.add(uid);
    await container.pump();
    if (uid != null) await repository.waitForReads(expected);
    await container.pump();
  }

  Future<void> completeRead(int index, {Map<String, Object?>? data}) async {
    await repository.waitForReads(index + 1);
    repository.reads[index].result.complete(
      EventRehearsalBootstrap.fromCallableData(data ?? practiceBootstrap()),
    );
    await container.pump();
  }

  Future<RehearsalAssistanceReview> review() async {
    await signIn('host-1');
    expect(repository.reads, hasLength(1));
    await completeRead(0);
    return container.read(query).requireValue;
  }

  EventRehearsalAssistanceEditor editor(RehearsalAssistanceReview review) {
    final provider = eventRehearsalAssistanceEditorProvider(
      review.snapshot.session.id,
    );
    container.listen(provider, (_, _) {});
    return container.read(provider.notifier)..open(review);
  }

  RehearsalAssistanceEditorState state(RehearsalAssistanceReview review) =>
      container.read(
        eventRehearsalAssistanceEditorProvider(review.snapshot.session.id),
      );
  RehearsalAssistanceForm form(RehearsalAssistanceReview review) =>
      state(review) as RehearsalAssistanceForm;
  void confirm(
    int index, {
    int runtimeRevision = 5,
    List<Map<String, Object?>>? actors,
    Map<String, Object?>? helpRequests,
  }) {
    final write = repository.writes[index];
    write.result.complete(
      EventRehearsalBootstrap.fromCallableData(
        practiceBootstrap(
          runtimeRevision: runtimeRevision,
          actionCount: write.change.session.actionCount + 1,
          actions: [practiceReceipt(write.change)],
          actors: actors,
          helpRequests: helpRequests,
        ),
      ),
    );
  }

  RehearsalPublishInstruction publish() =>
      RehearsalPublishInstruction(actorId: 'actor-01', plan: practicePlan());

  test(
    'unverified provider success stays pending until a verified receipt',
    () async {
      final current = await review();
      final actions = editor(current)..select(publish());
      final original = form(current).change;
      final pending = actions.submit();
      final failure = expectLater(pending, throwsA(isA<FormatException>()));
      repository.writes.single.result.complete(
        EventRehearsalBootstrap.fromCallableData(
          practiceBootstrap(runtimeRevision: 5),
        ),
      );
      await failure;
      expect(form(current).phase, RehearsalAssistancePhase.retryRequired);
      final retry = actions.submit();
      expect(repository.writes.last.change, same(original));
      confirm(1);
      await retry;
    },
  );

  test(
    'a detached pending owner observes sign-out and same-account sign-in',
    () async {
      final current = await review();
      final provider = eventRehearsalAssistanceEditorProvider('session-1');
      final attached = container.listen(provider, (_, _) {});
      final actions = container.read(provider.notifier)
        ..open(current)
        ..select(publish());
      final failure = expectLater(
        actions.submit(),
        throwsA(isA<NetworkException>()),
      );
      repository.writes.single.result.completeError(
        const NetworkException('unavailable', 'Offline'),
      );
      await failure;
      attached.close();
      await container.pump();
      await signIn(null);
      await signIn('host-1');
      await completeRead(1);
      final fresh = container.read(query).requireValue;
      final reopened = editor(fresh);
      expect(form(fresh).change, isNull);
      expect(form(fresh).canEdit, isTrue);
      expect(form(fresh).review.account, isNot(same(current.account)));
      await expectLater(reopened.submit(), throwsA(isA<ValidationException>()));
      expect(repository.writes, hasLength(1));
    },
  );

  test(
    'rate limit after an unknown outcome keeps the original request',
    () async {
      final current = await review();
      final actions = editor(current)..select(publish());
      final original = form(current).change;
      for (final code in ['unavailable', 'resource-exhausted']) {
        final pending = actions.submit();
        final failure = expectLater(pending, throwsA(isA<NetworkException>()));
        repository.writes.last.result.completeError(
          NetworkException(code, 'Unconfirmed'),
        );
        await failure;
        expect(form(current).phase, RehearsalAssistancePhase.retryRequired);
        expect(form(current).canReload, isFalse);
        actions.reload();
        expect(form(current).change, same(original));
      }
      final retried = actions.submit();
      expect(repository.writes.last.change, same(original));
      confirm(2);
      await retried;
    },
  );

  test('reentrant submit shares the original future', () async {
    final current = await review();
    final actions = editor(current)..select(publish());
    Future<EventRehearsalBootstrap>? reentrant;
    container.listen(eventRehearsalAssistanceEditorProvider('session-1'), (
      _,
      next,
    ) {
      if (next is RehearsalAssistanceForm &&
          next.phase == RehearsalAssistancePhase.submitting) {
        reentrant = actions.submit();
      }
    });
    final pending = actions.submit();
    expect(reentrant, same(pending));
    expect(repository.writes, hasLength(1));
    confirm(0);
    await pending;
  });

  test(
    'help resolution keeps its reviewed case through an uncertain retry',
    () async {
      await signIn('host-1');
      await completeRead(
        0,
        data: practiceBootstrap(helpRequests: practiceHelpRequests()),
      );
      final current = container.read(query).requireValue;
      final actions = editor(current);
      final request =
          current.snapshot.helpRequests!.cases.single as RehearsalOpenHelpCase;
      actions.selectHelpResolution(
        request,
        const AssistanceCaseDecision.resolve(),
      );
      final change = form(current).change!;
      final pending = actions.submit();
      final failure = expectLater(pending, throwsA(isA<NetworkException>()));
      repository.writes.single.result.completeError(
        const NetworkException('unavailable', 'Offline'),
      );
      await failure;
      actions.selectHelpResolution(
        request,
        const AssistanceCaseDecision.decline(),
      );
      expect(form(current).change, same(change));
      final retry = actions.submit();
      expect(repository.writes.last.change, same(change));
      confirm(1, helpRequests: practiceHelpRequests(settled: true));
      expect(
        (await retry).helpRequests!.cases.single,
        isA<RehearsalClosedHelpCase>(),
      );
      expect(form(current).phase, RehearsalAssistancePhase.applied);
    },
  );

  for (final (command, status) in [
    (RehearsalPauseAutomation(actorId: 'actor-01'), 'paused'),
    (RehearsalResumeAutomation(actorId: 'actor-01'), 'enabled'),
  ]) {
    test('${command.kind} uses its reviewed request receipt', () async {
      final current = await review();
      final actions = editor(current)..select(command);
      expect(form(current).change!.command, same(command));
      expect(form(current).change!.toJson()['expectedSetupRevision'], 1);
      final pending = actions.submit();
      confirm(
        0,
        actors: [
          {
            ...practiceActor(),
            'assistanceAutomation': practiceAutomation(status: status),
          },
        ],
      );
      expect(
        (await pending).actors.single.assistanceAutomation!.status.name,
        status,
      );
      expect(repository.writes.single.change.command.kind, command.kind);
    });
  }

  test(
    'loading, signed-out and failed authentication expose no private review',
    () async {
      expect(container.read(query).isLoading, isTrue);
      expect(repository.reads, isEmpty);
      final first = await review();
      expect(
        first.account,
        same(container.read(authenticatedSessionProvider).requireValue),
      );
      expect(
        first.account,
        same(container.read(eventAssistanceAccountProvider).requireValue),
      );
      await signIn(null);
      expect(container.read(query).hasValue, isFalse);
      expect(container.read(query).error, isA<SignInRequiredException>());
      expect(first.isCurrent, isFalse);
      container.read(query.notifier).reload();
      expect(repository.reads, hasLength(1));
      auth.addError(StateError('Authentication unavailable'));
      await container.pump();
      expect(container.read(query).hasValue, isFalse);
    },
  );

  test(
    'late old-account reads and foreign session projections cannot create a review',
    () async {
      await signIn('host-1');
      await signIn('host-2');
      await completeRead(0);
      expect(container.read(query).isLoading, isTrue);
      await completeRead(
        1,
        data: practiceBootstrap(sessionId: 'other-session'),
      );
      expect(container.read(query).hasError, isTrue);
      expect(container.read(query).hasValue, isFalse);
      expect(repository.reads.map((read) => read.sessionId), [
        'session-1',
        'session-1',
      ]);
    },
  );

  test(
    'explicit refresh retires the prior review and ignores old pending reads',
    () async {
      final old = await review();
      final actions = editor(old);
      actions.select(publish());
      container.read(query.notifier).reload();
      await container.pump();
      expect(old.isCurrent, isFalse);
      expect(form(old).phase, RehearsalAssistancePhase.refreshRequired);
      await expectLater(actions.submit(), throwsA(isA<ValidationException>()));
      expect(repository.writes, isEmpty);
      container.read(query.notifier).reload();
      await container.pump();
      await completeRead(1);
      expect(container.read(query).isLoading, isTrue);
      await completeRead(2, data: practiceBootstrap(setupRevision: 2));
      final fresh = container.read(query).requireValue;
      expect(fresh.snapshot.session.setupRevision, 2);
      expect(fresh, isNot(same(old)));
    },
  );

  test(
    'one selected command owns duplicate submissions and confirmed result',
    () async {
      final current = await review();
      final actions = editor(current);
      await expectLater(actions.submit(), throwsA(isA<ValidationException>()));
      actions.select(publish());
      final change = form(current).change!;
      final pending = actions.submit();
      expect(identical(actions.submit(), pending), isTrue);
      expect(form(current).canDismiss, isFalse);
      actions.select(null);
      expect(form(current).change, same(change));
      expect(repository.writes, hasLength(1));
      confirm(0);
      final result = await pending;
      await container.pump();
      expect(form(current).phase, RehearsalAssistancePhase.applied);
      expect(await actions.submit(), same(result));
      expect(repository.writes, hasLength(1));
      expect(result.presentCount, 0);
      expect(repository.reads, hasLength(2));
    },
  );

  test(
    'uncertain outcome retains exact payload and rejects another choice until resolved',
    () async {
      final current = await review();
      final actions = editor(current)..select(publish());
      final change = form(current).change!;
      final pending = actions.submit();
      final failure = expectLater(pending, throwsA(isA<NetworkException>()));
      repository.writes[0].result.completeError(
        const NetworkException('unavailable', 'Offline'),
      );
      await failure;
      expect(form(current).phase, RehearsalAssistancePhase.retryRequired);
      expect(form(current).canEdit, isFalse);
      actions.select(null);
      final retry = actions.submit();
      expect(repository.writes[1].change, same(change));
      confirm(1, runtimeRevision: 8);
      expect((await retry).session.runtimeRevision, 8);
      expect(form(current).phase, RehearsalAssistancePhase.applied);
    },
  );

  test(
    'closing and refreshing retain one unresolved command across reviews',
    () async {
      final current = await review();
      final provider = eventRehearsalAssistanceEditorProvider(
        current.snapshot.session.id,
      );
      final subscription = container.listen(provider, (_, _) {});
      final actions = container.read(provider.notifier)
        ..open(current)
        ..select(publish());
      final original = form(current).change;
      final failure = expectLater(
        actions.submit(),
        throwsA(isA<NetworkException>()),
      );
      repository.writes[0].result.completeError(
        const NetworkException('unavailable', 'Offline'),
      );
      await failure;
      subscription.close();
      await container.pump();
      expect(container.exists(provider), isTrue);
      final reopened = container.listen(provider, (_, _) {});
      expect(container.read(provider.notifier), same(actions));
      expect(form(current).change, same(original));
      expect(form(current).phase, RehearsalAssistancePhase.retryRequired);
      reopened.close();
      container.read(query.notifier).reload();
      await container.pump();
      expect(current.isCurrent, isFalse);
      expect(container.exists(provider), isTrue);
      await completeRead(1, data: practiceBootstrap(runtimeRevision: 6));
      final fresh = container.read(query).requireValue;
      final replacement = editor(fresh)
        ..select(RehearsalPauseAutomation(actorId: 'actor-01'));
      expect(replacement, same(actions));
      expect(form(fresh).change, same(original));
      expect(form(fresh).canReload, isFalse);
      final retried = replacement.submit();
      expect(repository.writes.last.change, same(original));
      confirm(1, runtimeRevision: 8);
      await retried;
    },
  );

  test(
    'a reset conflict requires a fresh review rather than a rebased retry',
    () async {
      final current = await review();
      final actions = editor(current)..select(publish());
      final pending = actions.submit();
      final failure = expectLater(
        pending,
        throwsA(isA<BackendOperationException>()),
      );
      repository.writes[0].result.completeError(
        const BackendOperationException(
          code: 'aborted',
          message: 'Rehearsal reset',
          context: BackendErrorContext(
            service: BackendService.functions,
            action: 'practice',
            resource: 'eventRehearsals',
          ),
        ),
      );
      await failure;
      expect(form(current).phase, RehearsalAssistancePhase.refreshRequired);
      await expectLater(actions.submit(), throwsA(isA<ValidationException>()));
      expect(repository.writes, hasLength(1));
    },
  );

  test(
    'account change permanently revokes an editor even if its command completes',
    () async {
      final current = await review();
      final actions = editor(current)..select(publish());
      final pending = actions.submit();
      final failure = expectLater(
        pending,
        throwsA(same(rehearsalReviewSessionChanged)),
      );
      await signIn(null);
      await signIn('host-1');
      confirm(0);
      await failure;
      expect(state(current), isA<RehearsalAssistanceIdle>());
      await expectLater(
        actions.submit(),
        throwsA(same(rehearsalReviewSessionChanged)),
      );
      await completeRead(1);
      expect(
        container.read(query).requireValue.account,
        isNot(same(current.account)),
      );
      expect(state(current), isA<RehearsalAssistanceIdle>());
      expect(repository.writes, hasLength(1));
    },
  );

  test(
    'refresh does not discard a verified receipt for the original command',
    () async {
      final current = await review();
      final actions = editor(current)..select(publish());
      final pending = actions.submit();
      container.read(query.notifier).reload();
      await container.pump();
      expect(form(current).phase, RehearsalAssistancePhase.submitting);
      confirm(0);
      final result = await pending;
      expect(form(current).phase, RehearsalAssistancePhase.applied);
      expect(form(current).result, same(result));
    },
  );

  test(
    'invalid actor selection clears the draft without a backend call',
    () async {
      final current = await review();
      final actions = editor(current)..select(publish());
      actions.select(
        RehearsalPublishInstruction(
          actorId: 'unknown-actor',
          plan: practicePlan(),
        ),
      );
      expect(form(current).change, isNull);
      expect(form(current).error, isA<FormatException>());
      expect(form(current).canSubmit, isFalse);
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

  final reads =
      <({String sessionId, Completer<EventRehearsalBootstrap> result})>[];
  final writes =
      <
        ({
          RehearsalAssistanceChange change,
          Completer<EventRehearsalBootstrap> result,
        })
      >[];
  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) {
    final result = Completer<EventRehearsalBootstrap>();
    reads.add((sessionId: sessionId, result: result));
    _changed.complete();
    _changed = Completer<void>();
    return result.future;
  }

  @override
  Future<EventRehearsalBootstrap> applyAssistance(
    RehearsalAssistanceChange change,
  ) {
    final result = Completer<EventRehearsalBootstrap>();
    writes.add((change: change, result: result));
    // The controller independently verifies responses; this fake must not do it for it.
    return result.future;
  }
}
