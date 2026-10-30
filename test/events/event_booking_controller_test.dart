import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/events/presentation/event_booking_controller.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'events_test_helpers.dart';

Future<void> primeUidProvider(ProviderContainer container) async {
  final uidSubscription = container.listen(
    uidProvider,
    (_, _) {},
    fireImmediately: true,
  );
  addTearDown(uidSubscription.close);
  await container.pump();
}

void main() {
  group('EventBookingController.book', () {
    test('books a free event through the payment repository', () async {
      final fakePaymentRepository = FakePaymentRepository();
      final container = ProviderContainer(
        overrides: [
          paymentRepositoryProvider.overrideWithValue(fakePaymentRepository),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        ],
      );
      addTearDown(container.dispose);
      await primeUidProvider(container);

      final controller = container.read(
        eventBookingControllerProvider.notifier,
      );
      await controller.book(
        event: buildEvent(),
        user: buildUser(),
        inviteCode: 'CATCH-DELHI',
        inviteLinkId: 'invite-link-1',
      );

      expect(fakePaymentRepository.bookFreeEventCalled, isTrue);
      expect(fakePaymentRepository.bookedFreeEventId, 'event-1');
      expect(fakePaymentRepository.bookedFreeEventInviteCode, 'CATCH-DELHI');
      expect(
        fakePaymentRepository.bookedFreeEventInviteLinkId,
        'invite-link-1',
      );
      expect(fakePaymentRepository.processPaymentCalled, isFalse);
    });

    test('books a paid event with the full payment payload', () async {
      final fakePaymentRepository = FakePaymentRepository();
      final container = ProviderContainer(
        overrides: [
          paymentRepositoryProvider.overrideWithValue(fakePaymentRepository),
          uidProvider.overrideWith((ref) => Stream.value('runner-7')),
        ],
      );
      addTearDown(container.dispose);
      await primeUidProvider(container);

      final event = buildEvent(
        id: 'paid-event',
        startTime: DateTime(2025, 1, 2, 6),
        endTime: DateTime(2025, 1, 2, 7),
        priceInPaise: 50000,
      );
      final user = buildUser(
        uid: 'runner-7',
        name: 'Priya',
        email: 'priya@example.com',
        phoneNumber: '+919876543210',
      );

      final controller = container.read(
        eventBookingControllerProvider.notifier,
      );
      await controller.book(event: event, user: user);

      expect(fakePaymentRepository.processPaymentCalled, isTrue);
      expect(fakePaymentRepository.lastProcessPaymentCall, isNotNull);
      expect(
        fakePaymentRepository.lastProcessPaymentCall!.eventId,
        'paid-event',
      );
      expect(fakePaymentRepository.lastProcessPaymentCall!.currencyCode, 'INR');
      expect(fakePaymentRepository.lastProcessPaymentCall!.inviteCode, isNull);
      expect(fakePaymentRepository.bookFreeEventCalled, isFalse);
    });

    test('passes invite codes through paid bookings', () async {
      final fakePaymentRepository = FakePaymentRepository();
      final container = ProviderContainer(
        overrides: [
          paymentRepositoryProvider.overrideWithValue(fakePaymentRepository),
          uidProvider.overrideWith((ref) => Stream.value('runner-7')),
        ],
      );
      addTearDown(container.dispose);
      await primeUidProvider(container);

      await container
          .read(eventBookingControllerProvider.notifier)
          .book(
            event: buildEvent(id: 'paid-event', priceInPaise: 50000),
            user: buildUser(uid: 'runner-7'),
            inviteCode: 'CATCH-DELHI',
            inviteLinkId: 'invite-link-1',
          );

      expect(
        fakePaymentRepository.lastProcessPaymentCall!.inviteCode,
        'CATCH-DELHI',
      );
      expect(
        fakePaymentRepository.lastProcessPaymentCall!.inviteLinkId,
        'invite-link-1',
      );
    });

    test('throws when paid bookings are unsupported on the platform', () async {
      final fakePaymentRepository = FakePaymentRepository(supportsPaid: false);
      final container = ProviderContainer(
        overrides: [
          paymentRepositoryProvider.overrideWithValue(fakePaymentRepository),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        ],
      );
      addTearDown(container.dispose);
      await primeUidProvider(container);

      final controller = container.read(
        eventBookingControllerProvider.notifier,
      );

      await expectLater(
        controller.book(
          event: buildEvent(priceInPaise: 50000),
          user: buildUser(),
        ),
        throwsA(isA<PaidBookingUnsupportedException>()),
      );
      expect(fakePaymentRepository.processPaymentCalled, isFalse);
    });

    test('routes non-INR paid bookings to the payment repository', () async {
      final fakePaymentRepository = FakePaymentRepository();
      final container = ProviderContainer(
        overrides: [
          paymentRepositoryProvider.overrideWithValue(fakePaymentRepository),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        ],
      );
      addTearDown(container.dispose);
      await primeUidProvider(container);

      final controller = container.read(
        eventBookingControllerProvider.notifier,
      );

      await controller.book(
        event: buildEvent(priceInPaise: 50000, currency: 'USD'),
        user: buildUser(),
      );

      expect(fakePaymentRepository.processPaymentCalled, isTrue);
      expect(fakePaymentRepository.lastProcessPaymentCall!.currencyCode, 'USD');
    });

    test('throws before booking when the user is not signed in', () async {
      final fakePaymentRepository = FakePaymentRepository();
      final container = ProviderContainer(
        overrides: [
          paymentRepositoryProvider.overrideWithValue(fakePaymentRepository),
          uidProvider.overrideWith((ref) => Stream.value(null)),
        ],
      );
      addTearDown(container.dispose);
      await primeUidProvider(container);

      await expectLater(
        container
            .read(eventBookingControllerProvider.notifier)
            .book(event: buildEvent(), user: buildUser()),
        throwsA(isA<SignInRequiredException>()),
      );
      expect(fakePaymentRepository.bookFreeEventCalled, isFalse);
      expect(fakePaymentRepository.processPaymentCalled, isFalse);
    });
  });

  group('EventBookingController mutations', () {
    test('cancelBooking delegates to the event repository', () async {
      final fakeEventRepository = FakeEventRepository();
      final container = ProviderContainer(
        overrides: [
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        ],
      );
      addTearDown(container.dispose);
      await primeUidProvider(container);

      await container
          .read(eventBookingControllerProvider.notifier)
          .cancelBooking(event: buildEvent(id: 'event-9'));

      expect(fakeEventRepository.cancelledEventId, 'event-9');
    });

    test(
      'joinWaitlist delegates to the server-side waitlist function',
      () async {
        final fakeEventRepository = FakeEventRepository();
        final container = ProviderContainer(
          overrides: [
            eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          ],
        );
        addTearDown(container.dispose);
        await primeUidProvider(container);

        await container
            .read(eventBookingControllerProvider.notifier)
            .joinWaitlist(
              event: buildEvent(id: 'event-42'),
              inviteCode: 'CATCH-DELHI',
              inviteLinkId: 'invite-link-1',
            );

        expect(fakeEventRepository.joinedWaitlistEventId, 'event-42');
        expect(fakeEventRepository.joinedWaitlistInviteCode, 'CATCH-DELHI');
        expect(fakeEventRepository.joinedWaitlistInviteLinkId, 'invite-link-1');
      },
    );

    test('leaveWaitlist uses the signed-in uid from auth', () async {
      final fakeEventRepository = FakeEventRepository();
      final container = ProviderContainer(
        overrides: [
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
          uidProvider.overrideWith((ref) => Stream.value('runner-42')),
        ],
      );
      addTearDown(container.dispose);
      await primeUidProvider(container);

      await container
          .read(eventBookingControllerProvider.notifier)
          .leaveWaitlist(event: buildEvent(id: 'event-42'));

      expect(fakeEventRepository.leftWaitlistEventId, 'event-42');
    });

    test('acceptWaitlistOffer keeps free accepted offers in-app', () async {
      final fakeEventRepository = FakeEventRepository();
      final container = ProviderContainer(
        overrides: [
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
          paymentRepositoryProvider.overrideWith(
            (ref) => FakePaymentRepository(),
          ),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        ],
      );
      addTearDown(container.dispose);
      await primeUidProvider(container);

      final result = await container
          .read(eventBookingControllerProvider.notifier)
          .acceptWaitlistOffer(
            event: buildEvent(id: 'event-42'),
            user: buildUser(),
          );

      expect(result, isNull);
      expect(fakeEventRepository.acceptedWaitlistOfferEventId, 'event-42');
    });

    for (final displayedPrice in [25000, 0]) {
      test(
        'accepted paid offers start checkout with local price $displayedPrice',
        () async {
          final fakeEventRepository = FakeEventRepository()
            ..acceptWaitlistOfferResponse =
                const WaitlistOfferAcceptanceCallableResponse(
                  accepted: true,
                  requiresPayment: true,
                  booked: false,
                );
          final fakePaymentRepository = FakePaymentRepository()
            ..processPaymentResult = const PaymentConfirmationData(
              eventId: 'event-42',
              paymentId: 'pay-1',
              orderId: 'order-1',
              amountInPaise: 25000,
              currency: 'INR',
            );
          final container = ProviderContainer(
            overrides: [
              eventRepositoryProvider.overrideWith(
                (ref) => fakeEventRepository,
              ),
              paymentRepositoryProvider.overrideWith(
                (ref) => fakePaymentRepository,
              ),
              uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            ],
          );
          addTearDown(container.dispose);
          await primeUidProvider(container);

          final result = await container
              .read(eventBookingControllerProvider.notifier)
              .acceptWaitlistOffer(
                event: buildEvent(id: 'event-42', priceInPaise: displayedPrice),
                user: buildUser(),
              );

          expect(result?.paymentId, 'pay-1');
          expect(fakeEventRepository.acceptedWaitlistOfferEventId, 'event-42');
          expect(fakePaymentRepository.processPaymentCalled, isTrue);
          expect(fakePaymentRepository.bookFreeEventCalled, isFalse);
        },
      );
    }

    test('declineWaitlistOffer delegates to the event repository', () async {
      final fakeEventRepository = FakeEventRepository();
      final container = ProviderContainer(
        overrides: [
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        ],
      );
      addTearDown(container.dispose);
      await primeUidProvider(container);

      await container
          .read(eventBookingControllerProvider.notifier)
          .declineWaitlistOffer(event: buildEvent(id: 'event-42'));

      expect(fakeEventRepository.declinedWaitlistOfferEventId, 'event-42');
    });

    test('joinWaitlist surfaces repository errors', () async {
      final fakeEventRepository = FakeEventRepository()
        ..joinWaitlistError = StateError('not signed in');
      final container = ProviderContainer(
        overrides: [
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        ],
      );
      addTearDown(container.dispose);
      await primeUidProvider(container);

      await expectLater(
        container
            .read(eventBookingControllerProvider.notifier)
            .joinWaitlist(event: buildEvent()),
        throwsA(isA<StateError>()),
      );
    });

    test('leaveWaitlist throws when the user is not signed in', () async {
      final container = ProviderContainer(
        overrides: [
          eventRepositoryProvider.overrideWith((ref) => FakeEventRepository()),
          uidProvider.overrideWith((ref) => Stream.value(null)),
        ],
      );
      addTearDown(container.dispose);
      await primeUidProvider(container);

      await expectLater(
        container
            .read(eventBookingControllerProvider.notifier)
            .leaveWaitlist(event: buildEvent()),
        throwsA(isA<SignInRequiredException>()),
      );
    });
  });
}
