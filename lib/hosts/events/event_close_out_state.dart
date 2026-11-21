import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/live/domain/event_attendance_report.dart';
import 'package:catch_dating_app/contexts/live/domain/event_close_out.dart';
import 'package:flutter/foundation.dart';

/// Where close-out is: reading the guest list, showing it, or unable to.
enum HostEventCloseOutStatus { loading, ready, error }

/// The after-closing switches the Close out dock saves.
enum HostEventCloseOutOption { thankYou, stayInTouchPicks, noShowNote }

/// Everything close-out shows, as plain values.
@immutable
class HostEventCloseOutState {
  const HostEventCloseOutState({
    required this.status,
    this.eventTitle,
    this.came = 0,
    this.booked = 0,
    this.unchecked = const <EventAttendee>[],
    this.checked = const <EventAttendee>[],
    this.organizerId,
    this.closeOut = EventCloseOut.none,
    this.report,
    this.error,
  });

  const HostEventCloseOutState.loading()
    : this(status: HostEventCloseOutStatus.loading);

  final HostEventCloseOutStatus status;
  final String? eventTitle;

  /// Guests checked in.
  final int came;

  /// Guests with a place: checked in or still expected.
  final int booked;

  /// Booked guests nobody checked in, by name.
  final List<EventAttendee> unchecked;

  /// Guests checked in, so a row marked Came during close-out stays put.
  final List<EventAttendee> checked;

  /// The organizer the close-out command names.
  final String? organizerId;

  /// The after-closing choices as saved; [EventCloseOut.none] before the
  /// first close-out.
  final EventCloseOut closeOut;

  /// The attendance report as the server last wrote it: who came, who was
  /// recorded as not coming and who is not marked yet. Null until written.
  final EventAttendanceReport? report;
  final Object? error;

  /// Whether the guest is recorded as not coming.
  bool recordedNoShow(EventAttendee attendee) =>
      report?.noShowAttendeeIds.contains(attendee.id) ?? false;

  /// The after-closing switches as saved.
  Map<HostEventCloseOutOption, bool> get options => {
    HostEventCloseOutOption.thankYou: closeOut.thankYouAtLocal != null,
    HostEventCloseOutOption.stayInTouchPicks: closeOut.openStayInTouchPicks,
    HostEventCloseOutOption.noShowNote: closeOut.noShowNote,
  };
}
