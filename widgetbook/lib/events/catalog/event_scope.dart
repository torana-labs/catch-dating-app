import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_viewer_state.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_hype_avatar_row.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';

class WidgetbookEventScope extends StatelessWidget {
  const WidgetbookEventScope({
    super.key,
    required this.event,
    required this.child,
    this.roster,
    this.avatarItems,
    this.plan,
  });

  final Event event;
  final Widget child;
  final EventParticipationRoster? roster;
  final List<CatchPersonAvatarItem>? avatarItems;
  final EventSuccessPlan? plan;

  @override
  Widget build(BuildContext context) {
    final avatarQuery = EventHypeAvatarQuery(eventId: event.id, limit: 7);
    final avatars = avatarItems;
    return WidgetbookFixtureScope(
      overrides: [
        fetchOrganizerProvider(
          widgetbookEventsOrganizerId,
        ).overrideWith((ref) => widgetbookEventsOrganizer),
        watchEventParticipationRosterProvider(event.id).overrideWith(
          (ref) => Stream.value(roster ?? widgetbookEventsRoster(event: event)),
        ),
        if (avatars != null)
          eventHypeAvatarsProvider(
            avatarQuery,
          ).overrideWith((ref) async => avatars),
        watchEventSuccessPlanProvider(
          event.id,
        ).overrideWith((ref) => Stream.value(plan)),
        paymentRepositoryProvider.overrideWithValue(
          WidgetbookEventFakePaymentRepository(),
        ),
      ],
      child: child,
    );
  }
}

class WidgetbookEventFakePaymentRepository implements PaymentRepository {
  const WidgetbookEventFakePaymentRepository();

  @override
  bool get supportsPaidBookings => true;

  @override
  bool supportsPaidBookingsForCurrency(String currencyCode) => true;

  @override
  Future<void> bookFreeEvent({
    required String eventId,
    String? inviteCode,
    String? inviteLinkId,
    String? crossPathsPairHoldId,
  }) async {}

  @override
  Future<PaymentConfirmationData> processPayment({
    required String eventId,
    required String currencyCode,
    required String description,
    required String userName,
    required String userEmail,
    required String userContact,
    String? inviteCode,
    String? inviteLinkId,
    String? crossPathsPairHoldId,
  }) async {
    return PaymentConfirmationData(
      paymentId: 'widgetbook-payment',
      orderId: 'widgetbook-order',
      amountInPaise: 0,
      currency: currencyCode,
      eventId: eventId,
    );
  }

  @override
  void dispose() {}
}

/// Synthetic current-read snapshot for the existing EventDetail previews.
/// It does not evaluate a membership, admission, or capacity policy.
EventViewerState widgetbookEventViewerSnapshot(
  Event event, {
  required EventViewerAdmission admission,
  EventViewerAttendance attendance = EventViewerAttendance.notRecorded,
}) => EventViewerState.fromResponse({
  'viewer': {
    'eventId': event.id,
    'organizerId': event.organizerId,
    'observedAtMillis': widgetbookEventsNow.millisecondsSinceEpoch,
    'membership': {
      'state': 'notRequired',
      'revision': null,
      'decisionId': null,
    },
    'review': 'none',
    'admission': admission.name,
    'attendance': attendance.name,
    'waitlisted': false,
    'payment': 'notRead',
    'futureBooking': {'allowed': true, 'reason': null},
    'route': event.priceInPaise == 0 ? 'catchFreeBooking' : 'catchCheckout',
    'quotedPriceInPaise': event.priceInPaise,
    'basis': {
      'policyHash': null,
      'inventoryRevision': null,
      'capacityRevision': null,
      'migrationRevision': null,
    },
  },
});
