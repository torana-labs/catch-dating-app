import 'package:catch_dating_app/contexts/audience/parts/host_door_guest_row.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:flutter/foundation.dart';

/// Which guests the door shows: still to come, in, waiting, or asking.
enum DoorFilter { arriving, checkedIn, waitlist, asked }

/// Where the door is: reading the guest list, showing it, or unable to read
/// it.
enum DoorStatus { loading, content, error }

extension on DoorFilter {
  HostDoorGuestStatus get guestStatus => switch (this) {
    DoorFilter.arriving => HostDoorGuestStatus.arriving,
    DoorFilter.checkedIn => HostDoorGuestStatus.checkedIn,
    DoorFilter.waitlist => HostDoorGuestStatus.waitlist,
    DoorFilter.asked => HostDoorGuestStatus.asked,
  };
}

/// Everything the door body shows, as plain values.
@immutable
class DoorState {
  const DoorState({
    required this.status,
    this.event,
    this.guests = const <HostDoorGuest>[],
    this.filter = DoorFilter.arriving,
    this.query = '',
    this.needsReview = 0,
    this.error,
    this.stackTrace,
  });

  const DoorState.loading() : this(status: DoorStatus.loading);

  final DoorStatus status;

  /// Tonight's event, once its listener has delivered it.
  final Event? event;

  /// Every guest at the door, in door order.
  final List<HostDoorGuest> guests;
  final DoorFilter filter;

  /// The search over the loaded guests.
  final String query;

  /// Attendance changes on this phone the server refused; the host looks
  /// at them before they are dropped.
  final int needsReview;
  final Object? error;
  final StackTrace? stackTrace;

  /// The guests under [filter] that match [query].
  List<HostDoorGuest> get shown => [
    for (final guest in guests)
      if (guest.status == filter.guestStatus && guest.matches(query)) guest,
  ];

  /// How many guests are under [filter], whatever the search.
  int countOf(DoorFilter filter) =>
      guests.where((guest) => guest.status == filter.guestStatus).length;

  int get checkedIn => countOf(DoorFilter.checkedIn);

  /// Everyone booked for tonight: in or still to come.
  int get expected => checkedIn + countOf(DoorFilter.arriving);

  DoorState copyWith({DoorFilter? filter, String? query}) => DoorState(
    status: status,
    event: event,
    guests: guests,
    filter: filter ?? this.filter,
    query: query ?? this.query,
    needsReview: needsReview,
    error: error,
    stackTrace: stackTrace,
  );
}
