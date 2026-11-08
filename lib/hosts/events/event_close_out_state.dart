import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:flutter/foundation.dart';

/// Where close-out is: reading the guest list, showing it, or unable to.
enum HostEventCloseOutStatus { loading, ready, error }

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
  final Object? error;
}
