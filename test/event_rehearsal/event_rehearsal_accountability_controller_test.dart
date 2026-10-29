import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_accountability_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_editor.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_accountability_fixtures.dart';

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

  Future<void> completeRead(int index) async {
    await repository.waitForReads(index + 1);
    repository.reads[index].complete(practiceVisitSnapshot());
    await container.pump();
  }

  Future<RehearsalAssistanceReview> review() async {
    await signIn('host-1');
    await completeRead(0);
    return container.read(query).requireValue;
  }

  RehearsalActionableAccountability row(RehearsalAssistanceReview review) =>
      review.snapshot.accountabilityReviews!.rows.first
          as RehearsalActionableAccountability;
  RehearsalAccountabilityForm form(RehearsalAccountabilityScope scope) =>
      container.read(eventRehearsalAccountabilityControllerProvider(scope))
          as RehearsalAccountabilityForm;
  EventRehearsalAccountabilityController editor(
    RehearsalAssistanceReview review,
  ) {
    final visit = row(review);
    final provider = eventRehearsalAccountabilityControllerProvider(
      visit.scope,
    );
    container.listen(provider, (_, _) {});
    return container.read(provider.notifier)..open(review, visit);
  }

  void confirm(int index, {int laterActions = 0}) {
    final write = repository.writes[index];
    write.result.complete(
      EventRehearsalBootstrap.fromCallableData(
        practiceVisitResult(
          write.change,
          laterActions: laterActions,
          rejoined: laterActions >= 2,
        ),
      ),
    );
  }

  Future<void> fail(
    int index,
    Future<EventRehearsalBootstrap> pending, {
    Object error = const NetworkException('unavailable', 'Offline'),
  }) async {
    final check = expectLater(pending, throwsA(same(error)));
    repository.writes[index].result.completeError(error);
    await check;
  }

  test(
    'one reviewed visit owns reentrant taps and confirmed completion',
    () async {
      final current = await review();
      final visit = row(current);
      final actions = editor(current);
      Future<EventRehearsalBootstrap>? reentrant;
      container.listen(
        eventRehearsalAccountabilityControllerProvider(visit.scope),
        (_, next) {
          if (next is RehearsalAccountabilityForm &&
              next.phase == RehearsalAccountabilityPhase.submitting) {
            reentrant = actions.resolve(AssistanceVisitDisposition.departed);
          }
        },
      );
      final pending = actions.resolve(AssistanceVisitDisposition.returned);
      expect(
        actions.resolve(AssistanceVisitDisposition.returned),
        same(pending),
      );
      expect(reentrant, same(pending));
      expect(repository.writes.length, 1);
      expect(form(visit.scope).canDismiss, isFalse);
      final command =
          repository.writes.single.change.command
              as RehearsalResolveAccountability;
      expect(command.snapshot, same(visit));
      expect(command.disposition, AssistanceVisitDisposition.returned);
      expect(
        EventRehearsalAccountabilityController.mutationKey(current, visit),
        (scope: visit.scope, account: current.account),
      );
      confirm(0);
      final result = await pending;
      await container.pump();
      expect(form(visit.scope).phase, RehearsalAccountabilityPhase.saved);
      expect(
        await actions.resolve(AssistanceVisitDisposition.returned),
        same(result),
      );
      expect(repository.writes.length, 1);
      expect(repository.reads.length, 2);
      await expectLater(
        actions.resolve(AssistanceVisitDisposition.departed),
        throwsA(isA<ValidationException>()),
      );
    },
  );

  test(
    'refresh and sheet closure preserve an uncertain request verbatim',
    () async {
      final current = await review();
      final visit = row(current);
      final provider = eventRehearsalAccountabilityControllerProvider(
        visit.scope,
      );
      final subscription = container.listen(provider, (_, _) {});
      final actions = container.read(provider.notifier)..open(current, visit);
      await fail(0, actions.resolve(AssistanceVisitDisposition.returned));
      final original = repository.writes.single.change;
      final wire = original.toJson();
      subscription.close();
      await container.pump();
      expect(container.exists(provider), isTrue);
      container.read(query.notifier).reload();
      await container.pump();
      await completeRead(1);
      final fresh = container.read(query).requireValue;
      expect(current.isCurrent, isFalse);
      expect(row(fresh).scope, visit.scope);
      container.listen(provider, (_, _) {});
      final reopened = container.read(provider.notifier)
        ..open(fresh, row(fresh));
      expect(reopened, same(actions));
      expect(form(visit.scope).change, same(original));
      expect(form(visit.scope).canReload, isFalse);
      await expectLater(
        actions.resolve(AssistanceVisitDisposition.returned),
        throwsA(isA<ValidationException>()),
      );
      final retry = actions.retry();
      expect(repository.writes.last.change, same(original));
      expect(repository.writes.last.change.toJson(), wire);
      confirm(1, laterActions: 2);
      expect((await retry).session.runtimeRevision, 7);
      expect(form(visit.scope).phase, RehearsalAccountabilityPhase.saved);
    },
  );

  test(
    'a retry callback can start before the failed async stack unwinds',
    () async {
      final current = await review();
      final visit = row(current);
      final actions = editor(current);
      Future<EventRehearsalBootstrap>? retry;
      container.listen(
        eventRehearsalAccountabilityControllerProvider(visit.scope),
        (_, next) {
          if (next is RehearsalAccountabilityForm &&
              next.canRetry &&
              retry == null) {
            retry = actions.retry();
          }
        },
      );
      await fail(0, actions.resolve(AssistanceVisitDisposition.returned));
      expect(repository.writes.length, 2);
      expect(
        repository.writes.last.change,
        same(repository.writes.first.change),
      );
      confirm(1);
      await retry!;
      expect(form(visit.scope).phase, RehearsalAccountabilityPhase.saved);
    },
  );

  test(
    'obsolete and foreign rows cannot be selected or sent by a generic editor',
    () async {
      final current = await review();
      final visit = row(current);
      final actions = editor(current);
      final foreign =
          practiceVisitSnapshot().accountabilityReviews!.rows.first
              as RehearsalActionableAccountability;
      expect(
        () => actions.open(current, foreign),
        throwsA(isA<ValidationException>()),
      );
      final genericProvider = eventRehearsalAssistanceEditorProvider(
        current.snapshot.session.id,
      );
      container.listen(genericProvider, (_, _) {});
      container.read(genericProvider.notifier).open(current);
      container
          .read(genericProvider.notifier)
          .select(
            RehearsalResolveAccountability(
              snapshot: visit,
              disposition: AssistanceVisitDisposition.returned,
            ),
          );
      final generic =
          container.read(genericProvider) as RehearsalAssistanceForm;
      expect(generic.error, isA<ValidationException>());
      expect(generic.change, isNull);
      expect(generic.canSubmit, isFalse);
      container.read(query.notifier).reload();
      await container.pump();
      await expectLater(
        actions.resolve(AssistanceVisitDisposition.returned),
        throwsA(isA<ValidationException>()),
      );
      expect(repository.writes, isEmpty);
    },
  );

  test(
    'a definitive reset conflict requires a fresh review and a new request',
    () async {
      final current = await review();
      final visit = row(current);
      final actions = editor(current);
      await fail(
        0,
        actions.resolve(AssistanceVisitDisposition.returned),
        error: const BackendOperationException(
          code: 'aborted',
          message: 'Rehearsal reset',
          context: BackendErrorContext(
            service: BackendService.functions,
            action: 'practice',
            resource: 'eventRehearsals',
          ),
        ),
      );
      expect(
        form(visit.scope).phase,
        RehearsalAccountabilityPhase.refreshRequired,
      );
      await expectLater(actions.retry(), throwsA(isA<ValidationException>()));
      await completeRead(1);
      final fresh = container.read(query).requireValue;
      actions.open(fresh, row(fresh));
      final pending = actions.resolve(AssistanceVisitDisposition.returned);
      expect(
        repository.writes.last.change.clientActionId,
        isNot(repository.writes.first.change.clientActionId),
      );
      confirm(1);
      await pending;
    },
  );

  test(
    'an unverified result remains uncertain and preserves the request for retry',
    () async {
      final current = await review();
      final visit = row(current);
      final actions = editor(current);
      final check = expectLater(
        actions.resolve(AssistanceVisitDisposition.returned),
        throwsFormatException,
      );
      // Deliberately bypass repository verification: the controller must verify too.
      repository.writes.single.result.complete(practiceVisitSnapshot());
      await check;
      expect(
        form(visit.scope).phase,
        RehearsalAccountabilityPhase.retryRequired,
      );
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
    'refresh during a pending visit decision still accepts its exact confirmed result',
    () async {
      final current = await review();
      final visit = row(current);
      final actions = editor(current);
      final pending = actions.resolve(AssistanceVisitDisposition.returned);
      container.read(query.notifier).reload();
      await container.pump();
      expect(current.isCurrent, isFalse);
      confirm(0);
      await pending;
      expect(form(visit.scope).phase, RehearsalAccountabilityPhase.saved);
    },
  );

  for (final transition in ['signOut', 'switchBack', 'authError']) {
    test(
      'closed pending sheet revokes its request after $transition',
      () async {
        final current = await review();
        final visit = row(current);
        final provider = eventRehearsalAccountabilityControllerProvider(
          visit.scope,
        );
        final subscription = container.listen(provider, (_, _) {});
        final actions = container.read(provider.notifier)..open(current, visit);
        await fail(0, actions.resolve(AssistanceVisitDisposition.returned));
        subscription.close();
        await container.pump();
        expect(container.exists(provider), isTrue);
        switch (transition) {
          case 'switchBack':
            await signIn('host-2');
            await signIn('host-1');
          case 'authError':
            auth.addError(StateError('Authentication unavailable'));
            await container.pump();
          case 'signOut':
            await signIn(null);
        }
        await container.pump();
        container.listen(provider, (_, _) {});
        final reopened = container.read(provider.notifier);
        expect(
          container.read(provider),
          isNot(isA<RehearsalAccountabilityForm>()),
        );
        await expectLater(
          reopened.retry(),
          throwsA(same(rehearsalReviewSessionChanged)),
        );
        expect(repository.writes.length, 1);
        await expectLater(
          actions.retry(),
          throwsA(same(rehearsalReviewSessionChanged)),
        );
        await expectLater(
          actions.resolve(AssistanceVisitDisposition.departed),
          throwsA(same(rehearsalReviewSessionChanged)),
        );
      },
    );
  }

  test(
    'pending and error state is independent for each synthetic guest',
    () async {
      final current = await review();
      final first = row(current);
      final second =
          current.snapshot.accountabilityReviews!.rows[1]
              as RehearsalActionableAccountability;
      final firstEditor = editor(current);
      final otherProvider = eventRehearsalAccountabilityControllerProvider(
        second.scope,
      );
      container.listen(otherProvider, (_, _) {});
      final secondEditor = container.read(otherProvider.notifier)
        ..open(current, second);
      expect(
        EventRehearsalAccountabilityController.mutationKey(current, first),
        isNot(
          EventRehearsalAccountabilityController.mutationKey(current, second),
        ),
      );
      final one = firstEditor.resolve(AssistanceVisitDisposition.returned);
      expect(form(second.scope).phase, RehearsalAccountabilityPhase.ready);
      final two = secondEditor.resolve(AssistanceVisitDisposition.departed);
      expect(repository.writes.map((w) => w.change.command.actorId), [
        'actor-01',
        'actor-02',
      ]);
      await fail(0, one);
      expect(form(first.scope).canRetry, isTrue);
      expect(form(second.scope).phase, RehearsalAccountabilityPhase.submitting);
      confirm(1);
      await two;
      expect(form(second.scope).phase, RehearsalAccountabilityPhase.saved);
      expect(form(first.scope).canRetry, isTrue);
    },
  );

  test(
    'a rate limit during an exact retry retains the uncertain decision',
    () async {
      final current = await review();
      final visit = row(current);
      final actions = editor(current);
      await fail(0, actions.resolve(AssistanceVisitDisposition.returned));
      final original = repository.writes.single.change;
      final retry = actions.retry();
      await fail(
        1,
        retry,
        error: const BackendOperationException(
          code: 'resource-exhausted',
          message: 'Wait before retrying',
          context: BackendErrorContext(
            service: BackendService.functions,
            action: 'practice',
            resource: 'eventRehearsals',
          ),
        ),
      );
      expect(form(visit.scope).canRetry, isTrue);
      final last = actions.retry();
      expect(repository.writes.last.change, same(original));
      confirm(2, laterActions: 2);
      final result = await last;
      expect(
        result.accountabilityReviews!.rows.first.evidence.disposition,
        AssistanceVisitDisposition.unresolved,
      );
    },
  );

  test(
    'late completion cannot restore private state after an account change',
    () async {
      final current = await review();
      final visit = row(current);
      final actions = editor(current);
      final pending = actions.resolve(AssistanceVisitDisposition.returned);
      final check = expectLater(
        pending,
        throwsA(same(rehearsalReviewSessionChanged)),
      );
      await signIn(null);
      await signIn('host-1');
      confirm(0);
      await check;
      expect(
        container.read(
          eventRehearsalAccountabilityControllerProvider(visit.scope),
        ),
        isNot(isA<RehearsalAccountabilityForm>()),
      );
      await expectLater(
        actions.retry(),
        throwsA(same(rehearsalReviewSessionChanged)),
      );
      expect(repository.writes.length, 1);
    },
  );
}

class _Repository extends Fake implements EventRehearsalRepository {
  Completer<void> _changed = Completer<void>();
  final reads = <Completer<EventRehearsalBootstrap>>[];
  final writes =
      <
        ({
          RehearsalAssistanceChange change,
          Completer<EventRehearsalBootstrap> result,
        })
      >[];
  Future<void> waitForReads(int count) async {
    while (reads.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }

  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) {
    final result = Completer<EventRehearsalBootstrap>();
    reads.add(result);
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
    return result.future;
  }
}
