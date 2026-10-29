import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/bookings/domain/host_attendance_window.dart';
import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/core/business_rules.dart';

enum EventArrivalActionKind { selfCheckIn, takeAttendance }

class EventArrivalAction {
  const EventArrivalAction({required this.kind, required this.event});

  final EventArrivalActionKind kind;
  final Event event;
}

EventArrivalAction? selectEventArrivalAction({
  required List<Event> signedUpEvents,
  required List<Event> hostedEvents,
  required String uid,
  required DateTime now,
}) {
  final candidates = <EventArrivalAction>[
    for (final event in signedUpEvents)
      if (isSelfCheckInOpenForParticipationStatus(
        event: event,
        status: EventParticipationStatus.signedUp,
        now: now,
      ))
        EventArrivalAction(
          kind: EventArrivalActionKind.selfCheckIn,
          event: event,
        ),
    for (final event in hostedEvents)
      if (isHostAttendanceOpen(event: event, now: now))
        EventArrivalAction(
          kind: EventArrivalActionKind.takeAttendance,
          event: event,
        ),
  ];

  candidates.sort((a, b) {
    final time = a.event.startTime.compareTo(b.event.startTime);
    if (time != 0) return time;
    return a.kind.index.compareTo(b.kind.index);
  });

  return candidates.firstOrNull;
}

bool isSelfCheckInOpenForParticipationStatus({
  required Event event,
  required EventParticipationStatus? status,
  required DateTime now,
}) {
  return _isSelfCheckInOpen(
    event: event,
    isSignedUp: status == EventParticipationStatus.signedUp,
    hasAttended: status == EventParticipationStatus.attended,
    now: now,
  );
}

bool _isSelfCheckInOpen({
  required Event event,
  required bool isSignedUp,
  required bool hasAttended,
  required DateTime now,
}) {
  final startsAt = event.startTime.subtract(
    const Duration(minutes: BusinessRules.eventSelfCheckInWindowBeforeMinutes),
  );
  final endsAt = event.startTime.add(
    const Duration(minutes: BusinessRules.eventSelfCheckInWindowAfterMinutes),
  );
  return isSignedUp &&
      !hasAttended &&
      now.isAfter(startsAt) &&
      now.isBefore(endsAt);
}
