import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_kernel/business_rules.dart';

/// The guest's event whose self check-in is open now, from their booked
/// event cards: what Home offers first on arrival.
class EventArrivalAction {
  const EventArrivalAction({required this.card});

  final GuestEventCard card;
}

EventArrivalAction? selectEventArrivalAction({
  required List<GuestEventCard> signedUpEvents,
  required DateTime now,
}) {
  final open =
      signedUpEvents
          .where(
            (card) => _isSelfCheckInOpen(
              startTime: card.startTime,
              isSignedUp: true,
              hasAttended: false,
              now: now,
            ),
          )
          .toList()
        ..sort((a, b) => a.startTime.compareTo(b.startTime));
  final card = open.firstOrNull;
  return card == null ? null : EventArrivalAction(card: card);
}

bool isSelfCheckInOpenForParticipationStatus({
  required Event event,
  required EventParticipationStatus? status,
  required DateTime now,
}) {
  return _isSelfCheckInOpen(
    startTime: event.startTime,
    isSignedUp: status == EventParticipationStatus.signedUp,
    hasAttended: status == EventParticipationStatus.attended,
    now: now,
  );
}

bool _isSelfCheckInOpen({
  required DateTime startTime,
  required bool isSignedUp,
  required bool hasAttended,
  required DateTime now,
}) {
  final startsAt = startTime.subtract(
    const Duration(minutes: BusinessRules.eventSelfCheckInWindowBeforeMinutes),
  );
  final endsAt = startTime.add(
    const Duration(minutes: BusinessRules.eventSelfCheckInWindowAfterMinutes),
  );
  return isSignedUp &&
      !hasAttended &&
      now.isAfter(startsAt) &&
      now.isBefore(endsAt);
}
