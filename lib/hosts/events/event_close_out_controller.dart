import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_attendance_report_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_close_out_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_close_out.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_state.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_close_out_controller.g.dart';

/// Close-out, composed from the event, its attendee listeners, the
/// attendance report listener and the close-out listener: who came, who was
/// booked, who nobody checked in, who is recorded as not coming and the
/// after-closing choices already saved.
@riverpod
HostEventCloseOutState hostEventCloseOutController(
  Ref ref,
  HostEventRequest request,
) {
  final eventValue = catchAsyncStateFromAsyncValue(
    ref.watch(watchEventProvider(request.eventId)),
  );
  final attendeesValue = catchAsyncStateFromAsyncValue(
    ref.watch(watchEventAttendeesProvider(request.eventId)),
  );
  final error = eventValue.error ?? attendeesValue.error;
  final attendees = attendeesValue.value;
  if (error != null && attendees == null) {
    return HostEventCloseOutState(
      status: HostEventCloseOutStatus.error,
      error: error,
    );
  }
  if (attendees == null || !eventValue.hasData) {
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
  // A close-out not read yet, or unreadable, shows every switch off.
  final closeOut =
      ref.watch(watchEventCloseOutProvider(request.eventId)).value ??
      EventCloseOut.none;
  // A report not written yet, or unreadable, records nobody as not coming.
  final report = ref
      .watch(watchEventAttendanceReportProvider(request.eventId))
      .value;
  return HostEventCloseOutState(
    status: HostEventCloseOutStatus.ready,
    eventTitle: eventValue.value?.title,
    organizerId: request.organizerId,
    closeOut: closeOut,
    report: report,
    came: checked.length,
    booked: checked.length + unchecked.length,
    unchecked: List<EventAttendee>.unmodifiable(unchecked),
    checked: List<EventAttendee>.unmodifiable(checked),
  );
}
