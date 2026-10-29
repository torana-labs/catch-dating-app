import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventSuccessOperationalRosterSummary;

EventSuccessOperationalRosterSummary hostEventManageOperationalRosterSummary(
  List<EventAttendee>? attendees,
) {
  if (attendees == null) {
    return const EventSuccessOperationalRosterSummary(
      checkedInCount: 0,
      expectedCount: null,
    );
  }
  final expected = attendees.where(
    (attendee) =>
        attendee.status == EventAttendeeStatus.registered ||
        attendee.status == EventAttendeeStatus.checkedIn,
  );
  return EventSuccessOperationalRosterSummary(
    checkedInCount: expected.where((attendee) => attendee.isCheckedIn).length,
    expectedCount: expected.length,
  );
}
