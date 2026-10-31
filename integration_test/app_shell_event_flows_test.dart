import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/events/presentation/event_action_keys.dart';
import 'package:catch_dating_app/payments/presentation/payment_confirmation_keys.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test/events/event_viewer_state_fixtures.dart';
import '../test/events/events_test_helpers.dart' as event_helpers;
import '../test/organizers/organizers_test_helpers.dart' as organizer_helpers;
import '../test/support/profile_readiness_fixtures.dart';
import 'support/app_shell_test_binding.dart';
import 'support/app_shell_test_harness.dart';

void main() {
  ensureAppShellTestBinding();

  testWidgets('event detail books a free event and shows confirmation', (
    tester,
  ) async {
    final user = buildSocialReadyUser(name: 'Suvrat Garg');
    final organizer = organizer_helpers.buildOrganizer();
    final run = event_helpers.buildEvent(
      id: 'run-1',
      organizerId: organizer.id,
      startTime: DateTime.now().add(const Duration(days: 1, hours: 2)),
      meetingPoint: 'Carter Road Amphitheatre',
      bookedCount: 1,
    );
    final paymentRepository = event_helpers.FakePaymentRepository();

    await pumpCatchAppShell(
      tester,
      overrides: appShellTestOverrides(
        uid: user.uid,
        user: user,
        organizers: [organizer],
        joinedOrganizerIds: {organizer.id},
        organizerEvents: {
          organizer.id: [run],
        },
        eventViewerStates: [
          viewerFixture(eventId: run.id, organizerId: run.organizerId),
        ],
        paymentRepository: paymentRepository,
      ),
    );

    await openAppTab(tester, 'Explore');
    await openOrganizerDetail(tester, organizer);
    await pumpRoute(tester);
    await openEventDetail(tester, organizer: organizer, event: run);

    await pumpUntilFound(tester, find.byKey(EventActionKeys.bookButton));
    await tester.tap(find.byKey(EventActionKeys.bookButton));
    await flushAppShellCallbacks(tester);
    await pumpMutationUi(tester);

    expect(paymentRepository.bookFreeEventCalled, isTrue);
    expect(paymentRepository.bookedFreeEventId, run.id);
    expect(find.text('BOOKING CONFIRMED'), findsOneWidget);
    expect(find.text("You're in."), findsOneWidget);
  });

  testWidgets(
    'event detail books a paid event and opens payment confirmation',
    (tester) async {
      final user = buildSocialReadyUser(
        name: 'Suvrat Garg',
        email: 'suvrat@example.com',
        phoneNumber: '+919876543210',
      );
      final organizer = organizer_helpers.buildOrganizer();
      final run = event_helpers.buildEvent(
        id: 'paid-run-1',
        organizerId: organizer.id,
        startTime: DateTime.now().add(const Duration(days: 1, hours: 2)),
        meetingPoint: 'Carter Road Amphitheatre',
        bookedCount: 1,
        priceInPaise: 29900,
        // INR paid seats are sold only through the organizer's checkout;
        // this flow covers the shared repository checkout to confirmation.
        currency: 'USD',
      );
      final paymentRepository = event_helpers.FakePaymentRepository()
        ..processPaymentResult = PaymentConfirmationData(
          paymentId: 'pay_integration_123',
          orderId: 'order_integration_123',
          amountInPaise: run.priceInPaise,
          currency: 'USD',
          eventId: run.id,
        );

      await pumpCatchAppShell(
        tester,
        overrides: appShellTestOverrides(
          uid: user.uid,
          user: user,
          organizers: [organizer],
          joinedOrganizerIds: {organizer.id},
          organizerEvents: {
            organizer.id: [run],
          },
          eventViewerStates: [
            viewerFixture(
              eventId: run.id,
              organizerId: run.organizerId,
              price: 29900,
            ),
          ],
          paymentRepository: paymentRepository,
        ),
      );

      await openAppTab(tester, 'Explore');
      await openOrganizerDetail(tester, organizer);
      await pumpRoute(tester);
      await openEventDetail(tester, organizer: organizer, event: run);

      await pumpUntilFound(tester, find.byKey(EventActionKeys.bookButton));
      await tester.tap(find.byKey(EventActionKeys.bookButton));
      await flushAppShellCallbacks(tester);
      await pumpMutationUi(tester);

      expect(paymentRepository.processPaymentCalled, isTrue);
      expect(paymentRepository.lastProcessPaymentCall?.eventId, run.id);
      expect(paymentRepository.lastProcessPaymentCall?.currencyCode, 'USD');
      expect(find.text('BOOKING CONFIRMED'), findsOneWidget);
      expect(find.text('Payment ID'), findsOneWidget);
      expect(find.text('pay_integration_123'), findsOneWidget);
      expect(find.byKey(PaymentConfirmationKeys.backHome), findsOneWidget);
    },
  );

  testWidgets('event detail cancels an existing booking', (tester) async {
    final user = buildSocialReadyUser(name: 'Suvrat Garg');
    final organizer = organizer_helpers.buildOrganizer();
    final run = event_helpers.buildEvent(
      id: 'run-1',
      organizerId: organizer.id,
      startTime: DateTime.now().add(const Duration(days: 1, hours: 2)),
      meetingPoint: 'Carter Road Amphitheatre',
      bookedCount: 1,
    );
    final eventRepository = event_helpers.FakeEventRepository();

    await pumpCatchAppShell(
      tester,
      overrides: appShellTestOverrides(
        uid: user.uid,
        user: user,
        organizers: [organizer],
        joinedOrganizerIds: {organizer.id},
        signedUpEvents: [run],
        eventViewerStates: [
          viewerFixture(
            eventId: run.id,
            organizerId: run.organizerId,
            admission: 'nativeParticipation',
          ),
        ],
        eventRepository: eventRepository,
      ),
    );

    await openEventDetail(
      tester,
      organizer: organizer,
      event: run,
      settle: false,
    );
    await tester.tap(find.byKey(EventActionKeys.cancelBookingButton));
    await flushAppShellCallbacks(tester);
    await pumpMutationUi(tester);

    expect(eventRepository.cancelledEventId, run.id);
    expect(find.text('Booking cancelled.'), findsOneWidget);
  });

  testWidgets('event detail joins a waitlist for a full event', (tester) async {
    final user = buildSocialReadyUser(name: 'Suvrat Garg');
    final organizer = organizer_helpers.buildOrganizer();
    final run = event_helpers.buildEvent(
      id: 'run-1',
      organizerId: organizer.id,
      startTime: DateTime.now().add(const Duration(days: 1, hours: 2)),
      meetingPoint: 'Carter Road Amphitheatre',
      bookedCount: 20,
    );
    final eventRepository = event_helpers.FakeEventRepository();

    await pumpCatchAppShell(
      tester,
      overrides: appShellTestOverrides(
        uid: user.uid,
        user: user,
        organizers: [organizer],
        joinedOrganizerIds: {organizer.id},
        organizerEvents: {
          organizer.id: [run],
        },
        eventViewerStates: [
          viewerFixture(
            eventId: run.id,
            organizerId: run.organizerId,
            reason: 'full',
          ),
        ],
        eventRepository: eventRepository,
      ),
    );

    await openAppTab(tester, 'Explore');
    await openOrganizerDetail(tester, organizer);
    await pumpRoute(tester);
    await openEventDetail(tester, organizer: organizer, event: run);

    await tester.tap(find.byKey(EventActionKeys.joinWaitlistButton));
    await flushAppShellCallbacks(tester);
    await pumpMutationUi(tester);

    expect(eventRepository.joinedWaitlistEventId, run.id);
  });
}
