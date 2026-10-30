import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/events/presentation/event_booking_controller.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'events_test_helpers.dart';

const _paidOffer = WaitlistOfferAcceptanceCallableResponse(
  accepted: true,
  requiresPayment: true,
  booked: false,
);
const _freeOffer = WaitlistOfferAcceptanceCallableResponse(
  accepted: true,
  requiresPayment: false,
  booked: true,
);
const _receipt = PaymentConfirmationData(
  eventId: 'event-1',
  paymentId: 'pay-accepted-offer',
  orderId: 'order-accepted-offer',
  amountInPaise: 25000,
  currency: 'INR',
);

void main() {
  for (final transition in <String, List<String?>>{
    'account switch': ['runner-2'],
    'sign out': [null],
    'sign out and same-account return': [null, 'runner-1'],
    'account ABA': ['runner-2', 'runner-1'],
  }.entries) {
    test('paid offer cannot start checkout after ${transition.key}', () async {
      final harness = await _Harness.create();
      final operation = harness.accept();
      final failure = expectLater(
        operation,
        throwsA(isA<SignInRequiredException>()),
      );
      expect(harness.events.acceptCalls, 1);
      for (final uid in transition.value) {
        await harness.setUid(uid);
      }
      harness.events.acceptance.complete(_paidOffer);
      await failure;

      expect(harness.paymentReads, isEmpty);
      expect(harness.payments.checkoutCalls, 0);
      expect(harness.payments.freeCalls, 0);
    });
  }

  test('paused owner cannot miss a same-account session replacement', () async {
    final harness = await _Harness.create();
    final operation = harness.accept();
    final failure = expectLater(
      operation,
      throwsA(isA<SignInRequiredException>()),
    );
    harness.controllerSubscription.pause();
    await harness.setUid(null);
    await harness.setUid('runner-1');
    harness.events.acceptance.complete(_paidOffer);
    await failure;

    expect(harness.paymentReads, isEmpty);
    expect(harness.payments.checkoutCalls, 0);
  });

  for (final interruption in ['auth error', 'auth loading']) {
    test('paid offer stays revoked after $interruption and recovery', () async {
      final harness = await _Harness.create();
      final operation = harness.accept();
      final failure = expectLater(
        operation,
        throwsA(isA<SignInRequiredException>()),
      );
      if (interruption == 'auth error') {
        harness.auth.addError(StateError('auth unavailable'));
      } else {
        harness.container.invalidate(uidProvider);
      }
      await harness.container.pump();
      final interrupted = harness.container.read(authenticatedSessionProvider);
      expect(interrupted.hasError || interrupted.isLoading, isTrue);
      await harness.setUid('runner-1');
      harness.events.acceptance.complete(_paidOffer);
      await failure;

      expect(harness.paymentReads, isEmpty);
      expect(harness.payments.checkoutCalls, 0);
    });
  }

  test('disposing the owner before acceptance cannot start checkout', () async {
    final harness = await _Harness.create();
    final operation = harness.accept();
    final failure = expectLater(
      operation,
      throwsA(isA<SignInRequiredException>()),
    );
    harness.disposeContainer();
    harness.events.acceptance.complete(_paidOffer);
    await failure;

    expect(harness.paymentReads, isEmpty);
    expect(harness.payments.checkoutCalls, 0);
  });

  for (final price in [0, 25000]) {
    test(
      'current paid offer keeps authoritative receipt and payload at $price',
      () async {
        final harness = await _Harness.create();
        final operation = harness.accept(price: price);
        expect(harness.payments.checkoutCalls, 0);
        harness.events.acceptance.complete(_paidOffer);
        expect(await operation, same(_receipt));

        expect(harness.events.acceptCalls, 1);
        expect(harness.events.acceptedWaitlistOfferEventId, 'event-1');
        expect(harness.paymentReads, ['runner-1']);
        expect(harness.payments.checkoutCalls, 1);
        expect(harness.payments.freeCalls, 0);
        final payload = harness.payments.lastProcessPaymentCall!;
        expect(payload.eventId, 'event-1');
        expect(payload.currencyCode, 'INR');
        expect(payload.inviteCode, 'INVITE');
        expect(payload.inviteLinkId, 'invite-link');
      },
    );
  }

  for (final changeAccount in [false, true]) {
    test(
      'free acceptance remains authoritative (account changed: $changeAccount)',
      () async {
        final harness = await _Harness.create();
        final operation = harness.accept();
        if (changeAccount) await harness.setUid('runner-2');
        harness.events.acceptance.complete(_freeOffer);
        expect(await operation, isNull);

        expect(harness.events.acceptCalls, 1);
        expect(harness.paymentReads, isEmpty);
        expect(harness.payments.checkoutCalls, 0);
        expect(harness.payments.freeCalls, 0);
      },
    );
  }

  for (final changeAccount in [false, true]) {
    test(
      'acceptance failure preserves repository error (account changed: $changeAccount)',
      () async {
        final harness = await _Harness.create();
        final operation = harness.accept();
        final error = StateError('acceptance unavailable');
        final failure = expectLater(operation, throwsA(same(error)));
        if (changeAccount) await harness.setUid('runner-2');
        harness.events.acceptance.completeError(error);
        await failure;

        expect(harness.paymentReads, isEmpty);
        expect(harness.payments.checkoutCalls, 0);
      },
    );
  }

  for (final action in ['free booking', 'paid booking', 'offer acceptance']) {
    test(
      '$action refuses a profile from another account before work',
      () async {
        final harness = await _Harness.create();
        final user = buildUser(uid: 'runner-2');
        final event = buildEvent(
          priceInPaise: action == 'paid booking' ? 25000 : 0,
        );
        await expectLater(
          action == 'offer acceptance'
              ? harness.controller.acceptWaitlistOffer(event: event, user: user)
              : harness.controller.book(event: event, user: user),
          throwsA(isA<SignInRequiredException>()),
        );
        expect(harness.events.acceptCalls, 0);
        expect(harness.paymentReads, isEmpty);
        expect(harness.payments.checkoutCalls, 0);
        expect(harness.payments.freeCalls, 0);
      },
    );
  }

  test(
    'already completed free booking is not reclassified after account change',
    () async {
      final harness = await _Harness.create();
      harness.payments.freeCompletion = Completer<void>();
      final operation = harness.controller.book(
        event: buildEvent(),
        user: buildUser(),
      );
      expect(harness.payments.freeCalls, 1);
      await harness.setUid('runner-2');
      harness.payments.freeCompletion!.complete();
      expect(await operation, isNull);
      expect(harness.payments.freeCalls, 1);
      expect(harness.payments.checkoutCalls, 0);
    },
  );

  test(
    'controller preserves the receipt returned by an already-started checkout',
    () async {
      final harness = await _Harness.create();
      harness.payments.checkoutCompletion =
          Completer<PaymentConfirmationData>();
      final operation = harness.controller.book(
        event: buildEvent(priceInPaise: 25000),
        user: buildUser(),
      );
      expect(harness.payments.checkoutCalls, 1);
      await harness.setUid('runner-2');
      harness.payments.checkoutCompletion!.complete(_receipt);
      expect(await operation, same(_receipt));
      expect(harness.payments.checkoutCalls, 1);
      // CAT57 owns whether an underlying payment attempt can produce this result;
      // CAT62's later route slice owns whether it may be presented to the user.
    },
  );
}

class _Harness {
  _Harness() {
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventRepositoryProvider.overrideWithValue(events),
        paymentRepositoryProvider.overrideWith((ref) {
          final session = ref.watch(authenticatedSessionProvider).asData?.value;
          paymentReads.add(session?.uid);
          return payments;
        }),
      ],
    );
    container.listen(uidProvider, (_, _) {});
    controllerSubscription = container.listen(
      eventBookingControllerProvider,
      (_, _) {},
    );
  }

  final auth = StreamController<String?>.broadcast(sync: true);
  final events = _DeferredEventRepository();
  final payments = _DeferredPaymentRepository();
  final paymentReads = <String?>[];
  late final ProviderContainer container;
  late final ProviderSubscription<void> controllerSubscription;
  bool _disposed = false;

  static Future<_Harness> create() async {
    final harness = _Harness();
    addTearDown(() async {
      harness.disposeContainer();
      await harness.auth.close();
    });
    await harness.setUid('runner-1');
    return harness;
  }

  EventBookingController get controller =>
      container.read(eventBookingControllerProvider.notifier);

  Future<void> setUid(String? uid) async {
    auth.add(uid);
    await container.pump();
  }

  Future<PaymentConfirmationData?> accept({int price = 25000}) =>
      controller.acceptWaitlistOffer(
        event: buildEvent(priceInPaise: price),
        user: buildUser(),
        inviteCode: 'INVITE',
        inviteLinkId: 'invite-link',
      );

  void disposeContainer() {
    if (_disposed) return;
    _disposed = true;
    container.dispose();
  }
}

class _DeferredEventRepository extends FakeEventRepository {
  final acceptance = Completer<WaitlistOfferAcceptanceCallableResponse>();
  int acceptCalls = 0;

  @override
  Future<WaitlistOfferAcceptanceCallableResponse> acceptWaitlistOffer({
    required String eventId,
  }) {
    acceptCalls++;
    acceptedWaitlistOfferEventId = eventId;
    return acceptance.future;
  }
}

class _DeferredPaymentRepository extends FakePaymentRepository {
  _DeferredPaymentRepository() {
    processPaymentResult = _receipt;
  }

  int checkoutCalls = 0;
  int freeCalls = 0;
  Completer<void>? freeCompletion;
  Completer<PaymentConfirmationData>? checkoutCompletion;

  @override
  Future<void> bookFreeEvent({
    required String eventId,
    String? inviteCode,
    String? inviteLinkId,
    String? crossPathsPairHoldId,
  }) async {
    freeCalls++;
    await super.bookFreeEvent(
      eventId: eventId,
      inviteCode: inviteCode,
      inviteLinkId: inviteLinkId,
      crossPathsPairHoldId: crossPathsPairHoldId,
    );
    if (freeCompletion != null) await freeCompletion!.future;
  }

  @override
  Future<PaymentConfirmationData> processPayment({
    required String eventId,
    required String currencyCode,
    String? inviteCode,
    String? inviteLinkId,
    String? crossPathsPairHoldId,
  }) async {
    checkoutCalls++;
    final receipt = await super.processPayment(
      eventId: eventId,
      currencyCode: currencyCode,
      inviteCode: inviteCode,
      inviteLinkId: inviteLinkId,
      crossPathsPairHoldId: crossPathsPairHoldId,
    );
    final completion = checkoutCompletion;
    if (completion != null) return completion.future;
    return receipt;
  }
}
