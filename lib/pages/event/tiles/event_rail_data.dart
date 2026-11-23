import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_capacity_labels.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/guest_event_card.dart';
import 'package:catch_dating_app/pages/event/event_price_copy.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_l10n/l10n.dart';

/// What a date-rail event ticket shows, from either a full event (discovery
/// and organizer surfaces) or a guest event card (the guest's own lists).
///
/// A card has no live booking counts, so its ticket shows capacity terms,
/// never "N going" or "M left".
class EventRailData {
  const EventRailData({
    required this.eventId,
    required this.activityKind,
    required this.identityTitle,
    required this.startTime,
    required this.longDateLabel,
    required this.signedUpCount,
    required this.capacityLabel,
    required this.priceLabelFor,
  });

  factory EventRailData.fromEvent(Event event) => EventRailData(
    eventId: event.id,
    activityKind: event.activityKind,
    identityTitle: eventIdentityTitle(event.eventFormat),
    startTime: event.startTime,
    longDateLabel: event.longDateLabel,
    signedUpCount: event.signedUpCount,
    capacityLabel: EventCapacityLabels(event).goingAvailabilityLabel(),
    priceLabelFor: (l10n) => eventPriceLabel(l10n, event),
  );

  factory EventRailData.fromCard(GuestEventCard card) => EventRailData(
    eventId: card.eventId,
    activityKind: card.activityKind,
    identityTitle: eventIdentityTitle(card.eventFormat),
    startTime: card.startTime,
    longDateLabel: card.longDateLabel,
    signedUpCount: 0,
    capacityLabel: eventCapacityTermsLabel(card.capacityLimit),
    priceLabelFor: (l10n) => guestEventCardPriceLabel(l10n, card),
  );

  final String eventId;
  final ActivityKind activityKind;

  /// The format identity a ticket leads with.
  final String identityTitle;
  final DateTime startTime;
  final String longDateLabel;

  /// Live bookings, for the attendee signal; a card has none.
  final int signedUpCount;
  final String capacityLabel;
  final String Function(AppLocalizations l10n) priceLabelFor;
}

/// The format identity an event ticket leads with.
String eventIdentityTitle(EventFormatSnapshot format) =>
    format.customActivityLabel == null ? format.label : format.eventTitleLabel;
