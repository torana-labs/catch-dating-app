import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_participation_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_participation_editor.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_participation_provider.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_participation_fixtures.dart';

void main() {
  late _Repository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  final query = eventAssistanceParticipationReviewProvider(
    participationScope(),
  );
  final commandProvider = eventAssistanceParticipationEditorProvider(
    participationScope(),
  );
  setUp(() {
    repository = _Repository();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventAssistanceParticipationRepositoryProvider.overrideWith(
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
    EventAssistanceParticipationView? view,
  }) async {
    await repository.waitForReads(index + 1);
    repository.reads[index].result.complete(view ?? participationView());
    await container.pump();
  }

  Future<EventParticipationSession> review() async {
    await signIn('host-1');
    await completeRead(0);
    return container.read(query).requireValue;
  }

  EventAssistanceParticipationEditor editor(EventParticipationSession session) {
    container.listen(commandProvider, (_, _) {});
    return container.read(commandProvider.notifier)..open(session);
  }

  EventParticipationForm form() =>
      container.read(commandProvider) as EventParticipationForm;
  void confirm(int index) {
    final write = repository.writes[index];
    write.result.complete(
      EventAssistanceParticipationResult.fromCallableData(
        participationResponse(
          outcome: 'applied',
          operationRevision: write.change.snapshot.revision + 1,
          revision: write.change.snapshot.revision + 1,
          participation: write.change.participation.toJson(),
        ),
        expectedScope: write.change.snapshot.scope,
      ),
    );
  }

  Future<void> fail(
    int index,
    Future<EventAssistanceParticipationResult> pending, {
    Object error = const NetworkException('unavailable', 'Offline'),
  }) async {
    final check = expectLater(pending, throwsA(same(error)));
    repository.writes[index].result.completeError(error);
    await check;
  }

  test('return points belong only to an explicit temporary break', () async {
    final actions = editor(await review());
    expect(form().showsReturnPoint, isFalse);
    actions.select(EventParticipationChoice.temporaryBreak);
    expect(form().showsReturnPoint, isTrue);
    actions.selectReturnPoint('itinerary:second');
    expect(form().returnPointId, 'itinerary:second');
    expect(() => actions.selectReturnPoint('unknown'), throwsArgumentError);
    actions.select(EventParticipationChoice.departed);
    expect(form().returnPointId, isNull);
    expect(form().showsReturnPoint, isFalse);
    expect(
      () => actions.selectReturnPoint('itinerary:second'),
      throwsArgumentError,
    );
    actions.select(EventParticipationChoice.temporaryBreak);
    expect(form().returnPointId, isNull);
  });

  test('ineligible guests cannot stage a participation change', () async {
    await signIn('host-1');
    await completeRead(0, view: participationView(canChange: false));
    final actions = editor(container.read(query).requireValue);
    actions.select(EventParticipationChoice.active);
    expect(form().change, isNull);
    expect(form().canEdit, isFalse);
    await expectLater(actions.submit(), throwsA(isA<ValidationException>()));
    expect(repository.writes, isEmpty);
  });

  test(
    'no implicit choice; invalid and obsolete selections cannot be submitted',
    () async {
      final session = await review();
      final actions = editor(session);
      expect(form().canSubmit, isFalse);
      expect(form().change, isNull);
      actions.select(EventParticipationChoice.active);
      expect(form().canSubmit, isTrue);
      actions.select(EventParticipationChoice.active);
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
      final actions = editor(session)..select(EventParticipationChoice.active);
      Future<EventAssistanceParticipationResult>? reentrant;
      container.listen(commandProvider, (_, next) {
        if (next is EventParticipationForm &&
            next.phase == EventParticipationEditorPhase.submitting) {
          reentrant = actions.submit();
        }
      });
      final pending = actions.submit();
      expect(actions.submit(), same(pending));
      expect(reentrant, same(pending));
      expect(form().canDismiss, isFalse);
      expect(form().canSelect, isFalse);
      expect(form().canReload, isFalse);
      actions.select(EventParticipationChoice.departed);
      expect(
        repository.writes.single.change.participation,
        isA<EventParticipationActive>(),
      );
      expect(EventAssistanceParticipationEditor.mutationKey(session), (
        scope: participationScope(),
        account: session.account,
      ));
      confirm(0);
      final result = await pending;
      await container.pump();
      expect(form().phase, EventParticipationEditorPhase.saved);
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
      actions.select(EventParticipationChoice.active);
      await fail(0, actions.submit());
      final original = repository.writes.single.change;
      final payload = original.command;
      subscription.close();
      await container.pump();
      expect(container.exists(commandProvider), isTrue);
      container.read(query.notifier).reload();
      await container.pump();
      await completeRead(1, view: participationView());
      final fresh = container.read(query).requireValue;
      container.listen(commandProvider, (_, _) {});
      final reopened = container.read(commandProvider.notifier)..open(fresh);
      expect(reopened, same(actions));
      expect(form().change, same(original));
      expect(form().canReload, isFalse);
      actions.select(EventParticipationChoice.temporaryBreak);
      expect(form().change, same(original));
      final retry = actions.retry();
      expect(repository.writes.last.change, same(original));
      expect(repository.writes.last.change.command, payload);
      confirm(1);
      await retry;
      expect(form().phase, EventParticipationEditorPhase.saved);
    },
  );

  test('a retry from the failure callback gets a new active future', () async {
    final actions = editor(await review())
      ..select(EventParticipationChoice.active);
    Future<EventAssistanceParticipationResult>? retry;
    container.listen(commandProvider, (_, next) {
      if (next is EventParticipationForm && next.canRetry && retry == null) {
        retry = actions.retry();
      }
    });
    await fail(0, actions.submit());
    expect(repository.writes.length, 2);
    confirm(1);
    await retry!;
    expect(form().phase, EventParticipationEditorPhase.saved);
  });

  test(
    'unverified success remains uncertain until the exact request is confirmed',
    () async {
      final actions = editor(await review())
        ..select(EventParticipationChoice.active);
      final check = expectLater(actions.submit(), throwsFormatException);
      repository.writes.single.result.complete(
        EventAssistanceParticipationResult.fromCallableData(
          participationResponse(),
          expectedScope: participationScope(),
        ),
      );
      await check;
      expect(form().phase, EventParticipationEditorPhase.retryRequired);
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
        ..select(EventParticipationChoice.active);
      await fail(
        0,
        actions.submit(),
        error: const BackendOperationException(
          code: 'aborted',
          message: 'Participation changed',
          context: BackendErrorContext(
            service: BackendService.functions,
            action: 'participation',
            resource: 'eventAssistanceGuests',
          ),
        ),
      );
      expect(form().phase, EventParticipationEditorPhase.refreshRequired);
      await expectLater(actions.retry(), throwsA(isA<ValidationException>()));
      await completeRead(1);
      actions.open(container.read(query).requireValue);
      actions.select(EventParticipationChoice.departed);
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
      actions.select(EventParticipationChoice.active);
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
      expect(
        container.read(commandProvider),
        isNot(isA<EventParticipationForm>()),
      );
      await expectLater(
        reopened.retry(),
        throwsA(same(participationSessionChanged)),
      );
      expect(repository.writes.length, 1);
    });
  }

  test('a late completion cannot restore the old account state', () async {
    final actions = editor(await review())
      ..select(EventParticipationChoice.active);
    final check = expectLater(
      actions.submit(),
      throwsA(same(participationSessionChanged)),
    );
    await signIn(null);
    await signIn('host-1');
    confirm(0);
    await check;
    expect(
      container.read(commandProvider),
      isNot(isA<EventParticipationForm>()),
    );
    expect(repository.writes.length, 1);
  });

  test(
    'authentication loss at submission cannot dispatch the old decision',
    () async {
      final actions = editor(await review())
        ..select(EventParticipationChoice.departed);
      container.listen(commandProvider, (_, next) {
        if (next is EventParticipationForm &&
            next.phase == EventParticipationEditorPhase.submitting) {
          container.invalidate(uidProvider);
        }
      });
      await expectLater(
        actions.submit(),
        throwsA(same(participationSessionChanged)),
      );
      expect(repository.writes, isEmpty);
    },
  );

  test(
    'loading, account changes and failed reads never expose old participation',
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
        organizerId: participationScope().organizerId,
        eventId: participationScope().eventId,
        attendeeId: participationScope().attendeeId,
      );
      container.listen(
        eventAssistanceParticipationReviewProvider(sameScope),
        (_, _) {},
      );
      expect(repository.reads.length, 1);
      container.read(query.notifier).reload();
      await container.pump();
      container.read(query.notifier).reload();
      await container.pump();
      await completeRead(2, view: participationView());
      final fresh = container.read(query).requireValue;
      await completeRead(1);
      expect(container.read(query).requireValue, same(fresh));
      expect(first.isCurrent, isFalse);
      expect(fresh.view.participation, isA<EventParticipationActive>());
    },
  );
}

class _Repository extends Fake
    implements EventAssistanceParticipationRepository {
  Completer<void> _changed = Completer<void>();
  final reads =
      <
        ({
          EventAssistanceGuestScope scope,
          Completer<EventAssistanceParticipationView> result,
        })
      >[];
  final writes =
      <
        ({
          EventAssistanceParticipationChange change,
          Completer<EventAssistanceParticipationResult> result,
        })
      >[];
  Future<void> waitForReads(int count) async {
    while (reads.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }

  @override
  Future<EventAssistanceParticipationView> fetch(
    EventAssistanceGuestScope scope,
  ) {
    final result = Completer<EventAssistanceParticipationView>();
    reads.add((scope: scope, result: result));
    _changed.complete();
    _changed = Completer<void>();
    return result.future;
  }

  @override
  Future<EventAssistanceParticipationResult> apply(
    EventAssistanceParticipationChange change,
  ) {
    final result = Completer<EventAssistanceParticipationResult>();
    writes.add((change: change, result: result));
    return result.future;
  }
}
