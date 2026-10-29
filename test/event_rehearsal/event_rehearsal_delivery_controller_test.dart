import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_delivery_reviews.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_editor.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_delivery_controller.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_delivery_fixtures.dart';

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
    repository.reads[index].complete(practiceDeliverySnapshot());
    await container.pump();
  }

  Future<RehearsalAssistanceReview> review() async {
    await signIn('host-1');
    await completeRead(0);
    return container.read(query).requireValue;
  }

  RehearsalActionableDelivery row(RehearsalAssistanceReview review) =>
      review.snapshot.deliveryReviews!.deliveries.single
          as RehearsalActionableDelivery;
  RehearsalDeliveryForm form(RehearsalDeliveryScope scope) =>
      container.read(eventRehearsalDeliveryControllerProvider(scope))
          as RehearsalDeliveryForm;
  EventRehearsalDeliveryController editor(RehearsalAssistanceReview review) {
    final delivery = row(review);
    final provider = eventRehearsalDeliveryControllerProvider(delivery.scope);
    container.listen(provider, (_, _) {});
    return container.read(provider.notifier)..open(review, delivery);
  }

  void confirm(int index, {int laterActions = 0}) {
    final write = repository.writes[index];
    write.result.complete(
      EventRehearsalBootstrap.fromCallableData(
        practiceDeliveryResult(write.change, laterActions: laterActions),
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
    'one reviewed message owns reentrant taps and confirmed completion',
    () async {
      final current = await review();
      final delivery = row(current);
      final actions = editor(current);
      Future<EventRehearsalBootstrap>? reentrant;
      container.listen(
        eventRehearsalDeliveryControllerProvider(delivery.scope),
        (_, next) {
          if (next is RehearsalDeliveryForm &&
              next.phase == RehearsalDeliveryPhase.submitting) {
            reentrant = actions.takeOver();
          }
        },
      );
      final pending = actions.takeOver();
      expect(actions.takeOver(), same(pending));
      expect(reentrant, same(pending));
      expect(repository.writes.length, 1);
      expect(form(delivery.scope).canDismiss, isFalse);
      final command =
          repository.writes.single.change.command as RehearsalTakeDelivery;
      expect(command.snapshot, same(delivery));
      expect(command.actorUid, 'host-1');
      expect(EventRehearsalDeliveryController.mutationKey(current, delivery), (
        scope: delivery.scope,
        account: current.account,
      ));
      confirm(0);
      final result = await pending;
      await container.pump();
      expect(form(delivery.scope).phase, RehearsalDeliveryPhase.saved);
      expect(await actions.takeOver(), same(result));
      expect(repository.writes.length, 1);
      expect(repository.reads.length, 2);
    },
  );

  test(
    'refresh and sheet closure preserve an uncertain request verbatim',
    () async {
      final current = await review();
      final delivery = row(current);
      final provider = eventRehearsalDeliveryControllerProvider(delivery.scope);
      final subscription = container.listen(provider, (_, _) {});
      final actions = container.read(provider.notifier)
        ..open(current, delivery);
      await fail(0, actions.takeOver());
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
      expect(row(fresh).scope, delivery.scope);
      container.listen(provider, (_, _) {});
      final reopened = container.read(provider.notifier)
        ..open(fresh, row(fresh));
      expect(reopened, same(actions));
      expect(form(delivery.scope).change, same(original));
      expect(form(delivery.scope).canReload, isFalse);
      await expectLater(
        actions.takeOver(),
        throwsA(isA<ValidationException>()),
      );
      final retry = actions.retry();
      expect(repository.writes.last.change, same(original));
      expect(repository.writes.last.change.toJson(), wire);
      confirm(1, laterActions: 2);
      expect((await retry).session.runtimeRevision, 7);
      expect(form(delivery.scope).phase, RehearsalDeliveryPhase.saved);
    },
  );

  test(
    'a retry callback can start before the failed async stack unwinds',
    () async {
      final current = await review();
      final delivery = row(current);
      final actions = editor(current);
      Future<EventRehearsalBootstrap>? retry;
      container.listen(
        eventRehearsalDeliveryControllerProvider(delivery.scope),
        (_, next) {
          if (next is RehearsalDeliveryForm && next.canRetry && retry == null) {
            retry = actions.retry();
          }
        },
      );
      await fail(0, actions.takeOver());
      expect(repository.writes.length, 2);
      expect(
        repository.writes.last.change,
        same(repository.writes.first.change),
      );
      confirm(1);
      await retry!;
      expect(form(delivery.scope).phase, RehearsalDeliveryPhase.saved);
    },
  );

  test(
    'obsolete and foreign rows cannot be selected or sent by a generic editor',
    () async {
      final current = await review();
      final delivery = row(current);
      final actions = editor(current);
      final foreign =
          practiceDeliverySnapshot().deliveryReviews!.deliveries.single
              as RehearsalActionableDelivery;
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
            RehearsalTakeDelivery(snapshot: delivery, actorUid: 'host-1'),
          );
      final generic =
          container.read(genericProvider) as RehearsalAssistanceForm;
      expect(generic.error, isA<ValidationException>());
      expect(generic.change, isNull);
      expect(generic.canSubmit, isFalse);
      container.read(query.notifier).reload();
      await container.pump();
      await expectLater(
        actions.takeOver(),
        throwsA(isA<ValidationException>()),
      );
      expect(repository.writes, isEmpty);
    },
  );

  test(
    'a definitive reset conflict requires a fresh review and a new request',
    () async {
      final current = await review();
      final delivery = row(current);
      final actions = editor(current);
      await fail(
        0,
        actions.takeOver(),
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
        form(delivery.scope).phase,
        RehearsalDeliveryPhase.refreshRequired,
      );
      await expectLater(actions.retry(), throwsA(isA<ValidationException>()));
      await completeRead(1);
      final fresh = container.read(query).requireValue;
      actions.open(fresh, row(fresh));
      final pending = actions.takeOver();
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
      final delivery = row(current);
      final actions = editor(current);
      final check = expectLater(actions.takeOver(), throwsFormatException);
      // Deliberately bypass repository verification: the controller must verify too.
      repository.writes.single.result.complete(practiceDeliverySnapshot());
      await check;
      expect(form(delivery.scope).phase, RehearsalDeliveryPhase.retryRequired);
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
    'refresh during a pending handoff still accepts its exact confirmed result',
    () async {
      final current = await review();
      final delivery = row(current);
      final actions = editor(current);
      final pending = actions.takeOver();
      container.read(query.notifier).reload();
      await container.pump();
      expect(current.isCurrent, isFalse);
      confirm(0);
      await pending;
      expect(form(delivery.scope).phase, RehearsalDeliveryPhase.saved);
    },
  );

  for (final transition in ['signOut', 'switchBack', 'authError']) {
    test(
      'closed pending sheet revokes its request after $transition',
      () async {
        final current = await review();
        final delivery = row(current);
        final provider = eventRehearsalDeliveryControllerProvider(
          delivery.scope,
        );
        final subscription = container.listen(provider, (_, _) {});
        final actions = container.read(provider.notifier)
          ..open(current, delivery);
        await fail(0, actions.takeOver());
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
        expect(container.read(provider), isNot(isA<RehearsalDeliveryForm>()));
        await expectLater(
          reopened.retry(),
          throwsA(same(rehearsalReviewSessionChanged)),
        );
        expect(repository.writes.length, 1);
      },
    );
  }

  test(
    'late completion cannot restore private state after an account change',
    () async {
      final current = await review();
      final delivery = row(current);
      final actions = editor(current);
      final pending = actions.takeOver();
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
          eventRehearsalDeliveryControllerProvider(delivery.scope),
        ),
        isNot(isA<RehearsalDeliveryForm>()),
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
