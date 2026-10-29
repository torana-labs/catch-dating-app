import 'package:catch_dating_app/contexts/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_history_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/events/presentation/attendee_event_share_controller.dart';
import 'package:catch_dating_app/events/shared/event_share_card.dart';
import 'package:catch_dating_app/payments/presentation/payment_confirmation_keys.dart';
import 'package:catch_dating_app/payments/presentation/payment_confirmation_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import '../test_pump_helpers.dart';

void main() {
  group('PaymentConfirmationScreen', () {
    final confirmationData = const PaymentConfirmationData(
      paymentId: 'pay_ABC123',
      orderId: 'order_XYZ789',
      amountInPaise: 29900,
      currency: 'INR',
      eventId: 'event-1',
    );

    testWidgets('renders joined celebration with payment details', (
      tester,
    ) async {
      final event = buildEvent(priceInPaise: 29900);
      final club = buildClub(name: 'Bandra Breakers');

      await _pumpPaymentConfirmation(
        tester,
        data: confirmationData,
        event: event,
        club: club,
      );

      expect(find.text("You're in."), findsOneWidget);
      expect(find.text('BOOKING CONFIRMED'), findsOneWidget);
      expect(find.text('Payment ID'), findsOneWidget);
      expect(find.text('pay_ABC123'), findsOneWidget);
      expect(find.textContaining(event.title), findsAtLeastNWidgets(1));
      expect(find.text('₹299'), findsOneWidget);
    });

    testWidgets('renders event details inside the celebration', (tester) async {
      final event = buildEvent(
        priceInPaise: 29900,
        meetingPoint: 'Carter Road Promenade',
      );
      final club = buildClub(name: 'Bandra Breakers');

      await _pumpPaymentConfirmation(
        tester,
        data: confirmationData,
        event: event,
        club: club,
      );

      expect(find.textContaining('Bandra Breakers'), findsOneWidget);
      expect(find.text('Where'), findsOneWidget);
      expect(find.text('Carter Road Promenade'), findsOneWidget);
      expect(find.text('When'), findsOneWidget);
      expect(find.text('Event'), findsOneWidget);
      expect(find.text('Paid'), findsOneWidget);
    });

    testWidgets('renders quick actions, heads up, and referral', (
      tester,
    ) async {
      final event = buildEvent();
      final club = buildClub();

      await _pumpPaymentConfirmation(
        tester,
        data: confirmationData,
        event: event,
        club: club,
      );

      expect(find.byKey(PaymentConfirmationKeys.addToCalendar), findsOneWidget);
      expect(find.text('Add to calendar'), findsOneWidget);
      expect(find.byKey(PaymentConfirmationKeys.directions), findsOneWidget);
      expect(find.text('Get directions'), findsOneWidget);
      expect(find.byKey(PaymentConfirmationKeys.inviteFriend), findsOneWidget);
      expect(find.text('Invite friend'), findsOneWidget);

      expect(find.text('HEADS UP'), findsOneWidget);
      expect(find.textContaining('Bring a water bottle'), findsOneWidget);

      expect(find.byKey(PaymentConfirmationKeys.referralShare), findsOneWidget);
      expect(
        find.text('Bring someone you actually want there'),
        findsOneWidget,
      );
    });

    testWidgets('renders pending external checkout as the booking sheet', (
      tester,
    ) async {
      final event = buildEvent(priceInPaise: 60000);
      final club = buildClub();
      final pendingData = PaymentConfirmationData(
        paymentId: 'pay_PENDING',
        orderId: 'order_PENDING',
        amountInPaise: 60000,
        currency: 'INR',
        eventId: event.id,
        provider: 'stripe',
        status: PaymentStatus.pending,
        checkoutUrl: Uri.parse('https://checkout.stripe.test/session'),
      );

      await _pumpPaymentConfirmation(
        tester,
        data: pendingData,
        event: event,
        club: club,
      );

      expect(find.byType(CatchScaffold), findsOneWidget);
      expect(find.text('Checkout is waiting'), findsOneWidget);
      expect(find.textContaining('Finish payment in Stripe'), findsOneWidget);
      expect(find.text('Pending'), findsOneWidget);
      expect(find.text('Open Stripe checkout'), findsOneWidget);
      expect(find.text('View payment history'), findsOneWidget);
      expect(find.text('Back to event'), findsOneWidget);
      expect(find.text(event.title), findsWidgets);
      expect(find.text('₹600'), findsOneWidget);
    });

    testWidgets('cancelled paid checkout cannot celebrate or reopen payment', (
      tester,
    ) async {
      final event = buildEvent(priceInPaise: 60000);
      final data = PaymentConfirmationData(
        paymentId: 'pay_cancelled',
        orderId: 'order_cancelled',
        amountInPaise: 60000,
        currency: 'INR',
        eventId: event.id,
        provider: 'stripe',
        status: PaymentStatus.pending,
        checkoutUrl: Uri.parse('https://checkout.stripe.test/session'),
      );
      final payment = Payment(
        id: data.paymentId,
        userId: 'user-1',
        orderId: data.orderId,
        paymentId: data.paymentId,
        eventId: event.id,
        amount: 60000,
        status: PaymentStatus.completed,
        createdAt: DateTime(2026, 5),
        cancellationRefund: const PaymentCancellationRefund(
          state: PaymentCancellationRefundState.pending,
          targetAmountMinor: 60000,
          confirmedAmountMinor: 0,
        ),
      );
      await _pumpPaymentConfirmation(
        tester,
        data: data,
        event: event,
        club: buildClub(),
        payment: payment,
      );
      expect(find.text('Booking cancelled'), findsWidgets);
      expect(find.text("You're in."), findsNothing);
      expect(find.text('Open Stripe checkout'), findsNothing);
      expect(find.text('View payment history'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('invite and referral surfaces open rich event share cards', (
      tester,
    ) async {
      final event = buildEvent();
      final club = buildClub();

      await _pumpPaymentConfirmation(
        tester,
        data: confirmationData,
        event: event,
        club: club,
      );

      await tester.ensureVisible(find.text('Invite friend'));
      await tester.tap(find.text('Invite friend'));
      await pumpFeatureUi(tester);

      expect(find.byKey(CatchShareCardSheet.cardPreviewKey), findsOneWidget);
      expect(find.byType(EventShareCard), findsOneWidget);
      expect(find.text('CATCH INVITE'), findsOneWidget);

      Navigator.of(tester.element(find.byType(EventShareCard))).pop();
      await pumpFeatureUi(tester);

      await tester.ensureVisible(
        find.byKey(PaymentConfirmationKeys.referralShare),
      );
      await tester.tap(find.byKey(PaymentConfirmationKeys.referralShare));
      await pumpFeatureUi(tester);

      expect(find.byKey(CatchShareCardSheet.cardPreviewKey), findsOneWidget);
      expect(find.byType(EventShareCard), findsOneWidget);
    });

    testWidgets('Back to home button pops to root', (tester) async {
      final event = buildEvent();
      final club = buildClub();

      await _pumpPaymentConfirmation(
        tester,
        data: confirmationData,
        event: event,
        club: club,
      );

      expect(find.byKey(PaymentConfirmationKeys.backHome), findsOneWidget);
    });

    testWidgets('shows confirmation-shaped skeleton while event is loading', (
      tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchEventProvider(
              'event-1',
            ).overrideWith((ref) => const Stream<Event?>.empty()),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: PaymentConfirmationScreen(data: confirmationData),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(CatchScaffold), findsOneWidget);
      expect(find.byType(CatchSkeleton), findsWidgets);
    });

    testWidgets('shows not found when event is null', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchEventProvider(
              'event-1',
            ).overrideWith((ref) => Stream<Event?>.value(null)),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: PaymentConfirmationScreen(data: confirmationData),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(CatchScaffold), findsOneWidget);
      expect(find.text('Event not found'), findsOneWidget);
      expect(find.text('This event is no longer available.'), findsOneWidget);
    });
  });
}

Future<void> _pumpPaymentConfirmation(
  WidgetTester tester, {
  required PaymentConfirmationData data,
  required Event event,
  required Club club,
  Payment? payment,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        watchEventProvider(
          data.eventId,
        ).overrideWith((ref) => Stream.value(event)),
        watchClubProvider(
          event.clubId,
        ).overrideWith((ref) => Stream.value(club)),
        attendeeEventShareActionsProvider.overrideWithValue(
          const _TestAttendeeEventShareActions(),
        ),
        if (data.isPendingExternalCheckout)
          watchPaymentProvider(
            data.paymentId,
          ).overrideWith((ref) => Stream<Payment?>.value(payment)),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        home: PaymentConfirmationScreen(data: data),
      ),
    ),
  );
  await tester.pump();
  await tester.pump();
}

class _TestAttendeeEventShareActions implements AttendeeEventShareActions {
  const _TestAttendeeEventShareActions();

  @override
  Future<CreateEventInviteLinkCallableResponse> createInviteLink({
    required String eventId,
    required bool isExternalEvent,
    required String label,
  }) async => CreateEventInviteLinkCallableResponse(
    inviteLinkId: 'invite-link-payment-confirmation',
    inviteToken: 'v2_invite-link-payment-confirmation_test-token',
    eventId: eventId,
    label: label,
    source: 'consumer_app',
  );

  @override
  Future<void> recordShareIntent({
    required String eventId,
    required String inviteLinkId,
  }) async {}
}
