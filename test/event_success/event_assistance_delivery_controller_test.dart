import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_deliveries_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_change.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_deliveries_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_pending_deliveries.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_deliveries_fixtures.dart';
import 'event_assistance_deliveries_test_repository.dart';

void main() {
  late DeliveriesTestRepository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  late EventAssistanceDeliveryReview review;
  late ProviderSubscription<AssistanceDeliveryEditorState> subscription;
  late ProviderSubscription<AsyncValue<EventAssistanceDeliveriesSession>>
  pageSubscription;
  final queue = eventAssistanceDeliveriesProvider(deliveryQuery());
  final provider = eventAssistanceDeliveryControllerProvider(
    deliveryQuery().scopeFor(deliveryId()),
  );
  EventAssistanceDeliveryController controller() =>
      container.read(provider.notifier);
  AssistanceDeliveryEditorState state() => container.read(provider);
  AssistanceDeliveryForm form() => state() as AssistanceDeliveryForm;
  Future<void> signIn(String? uid) async {
    auth.add(uid);
    await container.pump();
  }

  EventAssistanceDeliveryReview currentReview([int index = 0]) {
    final session = container.read(queue).requireValue;
    return session.review(
      session.page.deliveries[index] as AssistanceActionableDelivery,
    );
  }

  Future<void> finishRead(int index, {List<Object?>? rows}) async {
    final read = repository.reads[index];
    read.result.complete(deliveryPage(query: read.query, rows: rows));
    await container.pump();
  }

  setUp(() async {
    repository = DeliveriesTestRepository();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventAssistanceDeliveriesRepositoryProvider.overrideWith(
          (ref) => repository,
        ),
      ],
    );
    pageSubscription = container.listen(queue, (_, _) {});
    await signIn('host-1');
    await repository.waitForReads(1);
    await finishRead(0);
    review = currentReview();
    subscription = container.listen(provider, (_, _) {});
  });
  tearDown(() async {
    container.dispose();
    await auth.close();
  });

  test(
    'only a current page can open a review, and opening never submits',
    () async {
      expect(state(), isA<AssistanceDeliveryIdle>());
      await expectLater(
        controller().takeOver(),
        throwsA(isA<BackendOperationException>()),
      );
      controller().open(review);
      expect(form().canTakeOver, isTrue);
      expect(form().canDismiss, isTrue);
      expect(form().change, isNull);
      expect(repository.writes, isEmpty);
      container.read(queue.notifier).reload();
      await container.pump();
      await repository.waitForReads(2);
      expect(review.isCurrent, isFalse);
      expect(form().canTakeOver, isFalse);
      expect(
        () => controller().open(review),
        throwsA(isA<ValidationException>()),
      );
      await expectLater(
        controller().takeOver(),
        throwsA(isA<ValidationException>()),
      );
      await finishRead(1);
      controller().open(currentReview());
      expect(form().review, isNot(same(review)));
    },
  );

  test(
    'duplicate triggers share one frozen command and refresh the page after success',
    () async {
      controller().open(review);
      final a = controller().takeOver();
      final b = controller().takeOver();
      expect(a, same(b));
      expect(repository.writes, hasLength(1));
      expect(form().phase, AssistanceDeliveryPhase.submitting);
      expect(form().canDismiss, isFalse);
      expect(form().canTakeOver, isFalse);
      expect(form().canReload, isFalse);
      controller().open(currentReview());
      expect(form().review, same(review));
      final write = repository.writes.single;
      expect(write.change.snapshot, same(review.delivery));
      expect(write.change.actorUid, 'host-1');
      expect(write.change.operationId, startsWith('handoff:'));
      expect(
        container.read(queue).requireValue.page.deliveries.single,
        isA<AssistanceActionableDelivery>(),
      );
      write.result.complete(deliveryResult(write.change));
      final result = await a;
      await b;
      await container.pump();
      await repository.waitForReads(2);
      expect(form().phase, AssistanceDeliveryPhase.saved);
      expect(form().result, same(result));
      expect(container.read(queue).hasValue, isFalse);
      expect(await controller().takeOver(), same(result));
      expect(repository.writes, hasLength(1));
    },
  );

  test(
    'an uncertain request survives dismissal and only retries its exact command',
    () async {
      controller().open(review);
      final first = controller().takeOver();
      final failure = expectLater(first, throwsA(isA<NetworkException>()));
      final original = repository.writes.single.change;
      subscription.close();
      await container.pump();
      repository.writes.single.result.completeError(
        const NetworkException('unavailable', 'Lost reply'),
      );
      await failure;
      await container.pump();
      subscription = container.listen(provider, (_, _) {});
      expect(form().phase, AssistanceDeliveryPhase.retryRequired);
      expect(form().canDismiss, isTrue);
      expect(form().canReload, isFalse);
      controller().open(currentReview());
      expect(form().change, same(original));
      await expectLater(
        controller().takeOver(),
        throwsA(isA<ValidationException>()),
      );
      final retry = controller().retry();
      expect(controller().retry(), same(retry));
      final repeated = repository.writes.last;
      expect(repeated.change, same(original));
      expect(repeated.change.command, original.command);
      repeated.result.complete(deliveryResult(original, outcome: 'replayed'));
      expect((await retry).outcome, AssistanceDeliveryChangeOutcome.replayed);
    },
  );

  test(
    'page refresh cannot replace an unresolved command for the same message',
    () async {
      controller().open(review);
      final future = controller().takeOver();
      final failure = expectLater(future, throwsA(isA<NetworkException>()));
      repository.writes.single.result.completeError(
        const NetworkException('unavailable', 'Lost reply'),
      );
      await failure;
      final original = form().change;
      expect(container.read(eventAssistancePendingDeliveriesProvider), {
        review.delivery.scope,
      });
      expect(() => controller().reload(), throwsA(isA<ValidationException>()));
      container.read(queue.notifier).reload();
      await container.pump();
      await repository.waitForReads(2);
      await finishRead(
        1,
        rows: [
          deliveryRow(patch: {'revision': 2, 'reviewHash': 'c' * 64}),
        ],
      );
      controller().open(currentReview());
      expect(form().review, same(review));
      expect(form().change, same(original));
      final retry = controller().retry();
      repository.writes.last.result.complete(
        deliveryResult(original!, outcome: 'replayed'),
      );
      await retry;
    },
  );

  test(
    'definitive conflicts require a new page and new reviewed request',
    () async {
      controller().open(review);
      final pending = controller().takeOver();
      final failure = expectLater(
        pending,
        throwsA(isA<BackendOperationException>()),
      );
      repository.writes.single.result.completeError(
        const BackendOperationException(
          code: 'aborted',
          message: 'Changed',
          context: BackendErrorContext(
            service: BackendService.functions,
            action: 'take over delivery',
          ),
        ),
      );
      await failure;
      expect(form().phase, AssistanceDeliveryPhase.refreshRequired);
      expect(form().canRetry, isFalse);
      expect(form().canReload, isTrue);
      await expectLater(
        controller().retry(),
        throwsA(isA<ValidationException>()),
      );
      expect(
        () => controller().open(review),
        throwsA(isA<ValidationException>()),
      );
      await container.pump();
      await repository.waitForReads(2);
      await finishRead(
        1,
        rows: [
          deliveryRow(patch: {'revision': 1, 'reviewHash': 'c' * 64}),
        ],
      );
      controller().open(currentReview());
      final second = controller().takeOver();
      expect(
        repository.writes.last.change.operationId,
        isNot(repository.writes.first.change.operationId),
      );
      expect(repository.writes.last.change.snapshot.revision, 1);
      repository.writes.last.result.complete(
        deliveryResult(repository.writes.last.change),
      );
      await second;
    },
  );

  test(
    'account changes remove private state and cannot revive an old review',
    () async {
      controller().open(review);
      await signIn(null);
      expect(state(), isA<AssistanceDeliveryUnavailable>());
      await signIn('host-1');
      expect(state(), isA<AssistanceDeliveryIdle>());
      expect(
        () => controller().open(review),
        throwsA(isA<BackendOperationException>()),
      );
      expect(repository.writes, isEmpty);
    },
  );

  test(
    'unseen A to B to A changes while a request is pending discard its result',
    () async {
      controller().open(review);
      final pending = controller().takeOver();
      final failure = expectLater(
        pending,
        throwsA(isA<BackendOperationException>()),
      );
      final write = repository.writes.single;
      subscription.close();
      pageSubscription.close();
      await container.pump();
      await signIn('host-2');
      await signIn('host-1');
      write.result.complete(deliveryResult(write.change));
      await failure;
      subscription = container.listen(provider, (_, _) {});
      await container.pump();
      expect(state(), isNot(isA<AssistanceDeliveryForm>()));
      expect(
        () => controller().open(review),
        throwsA(isA<BackendOperationException>()),
      );
      expect(repository.writes, hasLength(1));
    },
  );

  test(
    'auth failure clears an uncertain request even with no remaining sheet listeners',
    () async {
      controller().open(review);
      final pending = controller().takeOver();
      final failure = expectLater(pending, throwsA(isA<NetworkException>()));
      repository.writes.single.result.completeError(
        const NetworkException('unavailable', 'Lost reply'),
      );
      await failure;
      subscription.close();
      pageSubscription.close();
      await container.pump();
      auth.addError(StateError('Auth unavailable'));
      await container.pump();
      subscription = container.listen(provider, (_, _) {});
      expect(state(), isA<AssistanceDeliveryUnavailable>());
      await signIn('host-1');
      expect(state(), isA<AssistanceDeliveryIdle>());
      expect(
        () => controller().open(review),
        throwsA(isA<BackendOperationException>()),
      );
      await expectLater(
        controller().retry(),
        throwsA(isA<BackendOperationException>()),
      );
      expect(repository.writes, hasLength(1));
    },
  );

  test(
    'a submission can finish after sheet dismissal without losing the receipt',
    () async {
      controller().open(review);
      final pending = controller().takeOver();
      final write = repository.writes.single;
      subscription.close();
      await container.pump();
      write.result.complete(deliveryResult(write.change));
      expect((await pending).outcome, AssistanceDeliveryChangeOutcome.applied);
      await container.pump();
      await repository.waitForReads(2);
      expect(repository.writes, hasLength(1));
    },
  );

  test(
    'different message actions and mutation keys remain independent',
    () async {
      container.read(queue.notifier).reload();
      await container.pump();
      await repository.waitForReads(2);
      await finishRead(
        1,
        rows: [
          deliveryRow(),
          deliveryRow(messageId: deliveryId(2)),
        ],
      );
      final one = currentReview(), two = currentReview(1);
      final secondProvider = eventAssistanceDeliveryControllerProvider(
        two.delivery.scope,
      );
      final sub = container.listen(secondProvider, (_, _) {});
      addTearDown(sub.close);
      final second = container.read(secondProvider.notifier);
      expect(() => second.open(one), throwsA(isA<ValidationException>()));
      controller().open(one);
      second.open(two);
      final a = controller().takeOver(), b = second.takeOver();
      expect(
        EventAssistanceDeliveryController.mutationKey(one),
        isNot(EventAssistanceDeliveryController.mutationKey(two)),
      );
      final failure = expectLater(a, throwsA(isA<NetworkException>()));
      repository.writes.first.result.completeError(
        const NetworkException('unavailable', 'Lost reply'),
      );
      repository.writes.last.result.complete(
        deliveryResult(repository.writes.last.change),
      );
      await failure;
      await b;
      expect(form().canRetry, isTrue);
      expect(
        (container.read(secondProvider) as AssistanceDeliveryForm).phase,
        AssistanceDeliveryPhase.saved,
      );
    },
  );

  test(
    'a retry triggered by the visible error receives a new active future',
    () async {
      controller().open(review);
      Future<EventAssistanceDeliveryResult>? retry;
      final sub = container.listen(provider, (_, next) {
        if (next is AssistanceDeliveryForm && next.canRetry && retry == null) {
          retry = controller().retry();
        }
      });
      addTearDown(sub.close);
      final first = controller().takeOver();
      final failed = expectLater(first, throwsA(isA<NetworkException>()));
      repository.writes.first.result.completeError(
        const NetworkException('unavailable', 'Lost reply'),
      );
      await failed;
      expect(repository.writes, hasLength(2));
      expect(retry, isNot(same(first)));
      repository.writes.last.result.complete(
        deliveryResult(repository.writes.last.change, outcome: 'replayed'),
      );
      await retry;
    },
  );
  test(
    'a result for another message cannot clear the pending handoff',
    () async {
      controller().open(review);
      final future = controller().takeOver();
      final failure = expectLater(future, throwsA(isA<FormatException>()));
      final other = EventAssistanceDeliveryChange(
        snapshot:
            deliveryPage(
                  rows: [deliveryRow(messageId: deliveryId(2))],
                ).deliveries.single
                as AssistanceActionableDelivery,
        actorUid: 'host-1',
        operationId: 'other-handoff',
      );
      repository.writes.single.result.complete(deliveryResult(other));
      await failure;
      expect(form().canRetry, isTrue);
      expect(container.read(eventAssistancePendingDeliveriesProvider), {
        review.delivery.scope,
      });
      final retry = controller().retry();
      repository.writes.last.result.complete(
        deliveryResult(repository.writes.last.change, outcome: 'replayed'),
      );
      await retry;
      expect(container.read(eventAssistancePendingDeliveriesProvider), isEmpty);
    },
  );
}
