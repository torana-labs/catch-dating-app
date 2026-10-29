import 'dart:async';

import 'package:catch_dating_app/contexts/payments/data/payment_history_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('PaymentHistoryRepository', () {
    late FakeFirebaseFirestore firestore;
    late PaymentHistoryRepository repository;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      repository = PaymentHistoryRepository(firestore);
    });

    test(
      'fetchPaymentForEvent returns the latest completed payment without sign-up failures',
      () async {
        await _seedPayment(
          firestore,
          buildPayment(id: 'payment-old', createdAt: DateTime(2025)),
        );
        await _seedPayment(
          firestore,
          buildPayment(
            id: 'payment-failed',
            createdAt: DateTime(2025, 1, 4),
            signUpFailed: true,
          ),
        );
        await _seedPayment(
          firestore,
          buildPayment(id: 'payment-latest', createdAt: DateTime(2025, 1, 3)),
        );
        await _seedPayment(
          firestore,
          buildPayment(
            id: 'payment-other-event',
            eventId: 'event-2',
            createdAt: DateTime(2025, 1, 5),
          ),
        );

        final payment = await repository.fetchPaymentForEvent(
          userId: 'runner-1',
          eventId: 'event-1',
        );

        expect(payment?.id, 'payment-latest');
      },
    );

    test(
      'fetchPaymentForEvent returns null when no successful completed payment exists',
      () async {
        await _seedPayment(
          firestore,
          buildPayment(
            id: 'payment-failed',
            createdAt: DateTime(2025, 1, 4),
            signUpFailed: true,
          ),
        );
        await _seedPayment(
          firestore,
          buildPayment(
            id: 'payment-pending',
            createdAt: DateTime(2025, 1, 5),
            status: PaymentStatus.pending,
          ),
        );

        final payment = await repository.fetchPaymentForEvent(
          userId: 'runner-1',
          eventId: 'event-1',
        );

        expect(payment, isNull);
      },
    );

    test(
      'watchPaymentsForUser streams payments ordered newest first',
      () async {
        await _seedPayment(
          firestore,
          buildPayment(id: 'old', createdAt: DateTime(2025)),
        );
        await _seedPayment(
          firestore,
          buildPayment(id: 'latest', createdAt: DateTime(2025, 1, 3)),
        );
        await _seedPayment(
          firestore,
          buildPayment(
            id: 'other-user',
            userId: 'runner-2',
            createdAt: DateTime(2025, 1, 4),
          ),
        );

        await expectLater(
          repository.watchPaymentsForUser('runner-1'),
          emits(
            predicate<List<Payment>>(
              (payments) =>
                  payments.map((payment) => payment.id).toList().join(',') ==
                  'latest,old',
            ),
          ),
        );
      },
    );

    test('fetchPaymentsForUserPage advances without overlap', () async {
      for (var day = 1; day <= 3; day += 1) {
        await _seedPayment(
          firestore,
          buildPayment(id: 'payment-$day', createdAt: DateTime(2025, 1, day)),
        );
      }

      final first = await repository.fetchPaymentsForUserPage(
        userId: 'runner-1',
        limit: 2,
      );
      final second = await repository.fetchPaymentsForUserPage(
        userId: 'runner-1',
        startAfter: first.nextCursor,
        limit: 2,
      );

      expect(first.items.map((payment) => payment.id), [
        'payment-3',
        'payment-2',
      ]);
      expect(first.hasMore, isTrue);
      expect(second.items.map((payment) => payment.id), ['payment-1']);
      expect(second.hasMore, isFalse);
    });

    test('watchPaymentsForUserProvider auto-disposes when unwatched', () async {
      final payment = buildPayment(id: 'payment-1', createdAt: DateTime(2025));
      final cancelCompleter = Completer<void>();
      final paymentsController = StreamController<List<Payment>>(
        onCancel: () {
          if (!cancelCompleter.isCompleted) cancelCompleter.complete();
        },
      );
      addTearDown(() async {
        if (!cancelCompleter.isCompleted) await paymentsController.close();
      });

      final container = ProviderContainer(
        overrides: [
          paymentHistoryRepositoryProvider.overrideWith(
            (ref) =>
                _LifecyclePaymentHistoryRepository(paymentsController.stream),
          ),
        ],
      );
      addTearDown(container.dispose);

      final provider = watchPaymentsForUserProvider('runner-1');
      final subscription = container.listen(provider, (_, _) {});

      paymentsController.add([payment]);
      await container.pump();
      expect(subscription.read().value, [payment]);

      subscription.close();
      await container.pump();

      await expectLater(cancelCompleter.future, completes);
    });

    test(
      'selectLatestSuccessfulPayment filters failed sign-ups and sorts newest first',
      () {
        final payment = selectLatestSuccessfulPayment([
          buildPayment(id: 'old', createdAt: DateTime(2025)),
          buildPayment(
            id: 'ignored',
            createdAt: DateTime(2025, 1, 5),
            signUpFailed: true,
          ),
          buildPayment(id: 'latest', createdAt: DateTime(2025, 1, 3)),
        ]);

        expect(payment?.id, 'latest');
      },
    );
  });
}

class _LifecyclePaymentHistoryRepository extends Fake
    implements PaymentHistoryRepository {
  _LifecyclePaymentHistoryRepository(this.paymentsStream);

  final Stream<List<Payment>> paymentsStream;

  @override
  Stream<List<Payment>> watchPaymentsForUser(String userId) => paymentsStream;
}

Future<void> _seedPayment(FakeFirebaseFirestore firestore, Payment payment) {
  return firestore.collection('payments').doc(payment.id).set(payment.toJson());
}

Payment buildPayment({
  required String id,
  required DateTime createdAt,
  String userId = 'runner-1',
  String eventId = 'event-1',
  PaymentStatus status = PaymentStatus.completed,
  bool signUpFailed = false,
}) {
  return Payment(
    id: id,
    userId: userId,
    orderId: 'order-$id',
    paymentId: 'payment-$id',
    eventId: eventId,
    amount: 25000,
    status: status,
    signUpFailed: signUpFailed,
    createdAt: createdAt,
  );
}
