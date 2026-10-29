import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_history_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment.dart';
import 'package:catch_dating_app/design_fixtures/utility_surface_fixtures.dart';
import 'package:flutter/material.dart';

import '../support/widgetbook_harness.dart';
import 'fixtures.dart';

final widgetbookUtilityPayments = UtilitySurfaceFixtures.payments;

class WidgetbookPaymentScope extends StatelessWidget {
  const WidgetbookPaymentScope({
    super.key,
    required this.child,
    this.uidStream,
    this.payments,
    this.paymentsStream,
    this.paymentsByPaymentId,
    this.eventsById,
    this.eventsStream,
  });

  final Widget child;
  final Stream<String?>? uidStream;
  final List<Payment>? payments;
  final Stream<List<Payment>>? paymentsStream;
  final Map<String, Payment?>? paymentsByPaymentId;
  final Map<String, Event>? eventsById;
  final Stream<List<Event>>? eventsStream;

  @override
  Widget build(BuildContext context) {
    final payments = this.payments ?? widgetbookUtilityPayments;
    final eventIds = {for (final payment in payments) payment.eventId};
    final batchedEvents = eventsById == null
        ? [
            for (final payment in payments)
              widgetbookUtilityEventFixture(
                id: payment.eventId,
                meetingPoint: widgetbookUtilityEventTitleForPayment(payment),
                notes: 'Receipt context',
                latitude: 19.0676,
                longitude: 72.8227,
              ),
          ]
        : eventsById!.values.toList(growable: false);
    final paymentsById =
        paymentsByPaymentId ??
        {for (final payment in payments) payment.paymentId: payment};
    final eventOverrides = [
      for (final payment in payments)
        watchEventProvider(payment.eventId).overrideWith(
          (ref) => Stream<Event?>.value(eventsById?[payment.eventId]),
        ),
    ];
    final paymentOverrides = [
      for (final entry in paymentsById.entries)
        watchPaymentProvider(
          entry.key,
        ).overrideWith((ref) => Stream<Payment?>.value(entry.value)),
    ];
    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWith(
          (ref) =>
              uidStream ?? Stream<String?>.value(widgetbookUtilityViewerUid),
        ),
        watchPaymentsForUserProvider(
          widgetbookUtilityViewerUid,
        ).overrideWith((ref) => paymentsStream ?? Stream.value(payments)),
        if (eventIds.isNotEmpty)
          watchEventsByIdsProvider(
            EventsByIdQuery(eventIds),
          ).overrideWith((ref) => eventsStream ?? Stream.value(batchedEvents)),
        watchClubProvider(
          widgetbookUtilityEvent.clubId,
        ).overrideWith((ref) => Stream<Club?>.value(null)),
        ...eventOverrides,
        ...paymentOverrides,
      ],
      child: child,
    );
  }
}

Event widgetbookUtilityEventFixture({
  required String id,
  required String meetingPoint,
  required String? notes,
  required double latitude,
  required double longitude,
}) => UtilitySurfaceFixtures.eventFixture(
  id: id,
  meetingPoint: meetingPoint,
  notes: notes,
  latitude: latitude,
  longitude: longitude,
);

String widgetbookUtilityEventTitleForPayment(Payment payment) =>
    UtilitySurfaceFixtures.eventTitleForPayment(payment);
