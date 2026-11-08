import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_state.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_close_out_controller.g.dart';

/// Close-out, composed from the event and its attendee listeners: who
/// came, who was booked and who nobody checked in.
@riverpod
HostEventCloseOutState hostEventCloseOutController(
  Ref ref,
  HostEventRequest request,
) {
  final eventValue = ref.watch(watchEventProvider(request.eventId));
  final attendeesValue = ref.watch(
    watchEventAttendeesProvider(request.eventId),
  );
  final error = eventValue.error ?? attendeesValue.error;
  final attendees = attendeesValue.value;
  if (error != null && attendees == null) {
    return HostEventCloseOutState(
      status: HostEventCloseOutStatus.error,
      error: error,
    );
  }
  if (attendees == null || !eventValue.hasValue) {
    return const HostEventCloseOutState.loading();
  }
  int byName(EventAttendee a, EventAttendee b) =>
      a.searchName.compareTo(b.searchName);
  final checked =
      attendees
          .where((attendee) => attendee.status == EventAttendeeStatus.checkedIn)
          .toList()
        ..sort(byName);
  final unchecked =
      attendees
          .where(
            (attendee) => attendee.status == EventAttendeeStatus.registered,
          )
          .toList()
        ..sort(byName);
  return HostEventCloseOutState(
    status: HostEventCloseOutStatus.ready,
    eventTitle: eventValue.value?.title,
    came: checked.length,
    booked: checked.length + unchecked.length,
    unchecked: List<EventAttendee>.unmodifiable(unchecked),
    checked: List<EventAttendee>.unmodifiable(checked),
  );
}
