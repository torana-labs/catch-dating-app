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

/// Who a phone from the staff work list is at the door.
enum DoorRole { manager, staff }

/// What this phone may do at the door. An organizer manager does
/// everything; event staff do what their grant allows. The server checks
/// every command again, so this only hides what would be refused.
@immutable
class DoorAccess {
  const DoorAccess({
    this.checkIn = true,
    this.reviewClaims = true,
    this.manage = true,
    this.role,
    this.until,
  });

  /// Check in, undo and scan tickets.
  final bool checkIn;

  /// Approve or reject web guests asking to be matched to a name.
  final bool reviewClaims;

  /// Walk-ins, letting in, offering places and the guest labels from the
  /// organizer audience: the part of the door only managers have.
  final bool manage;

  /// Who this phone is at the door when it came through the staff work
  /// list; null on the door a host opens from the event, which shows no
  /// access line.
  final DoorRole? role;

  /// When an event staff grant ends; null for a manager.
  final DateTime? until;
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
    this.scannedAttendeeId,
    this.team = const <String>[],
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

  /// The guest the last scanned ticket checked in.
  final String? scannedAttendeeId;

  /// The names of the other managers and staff on the door now, from the
  /// presence listener.
  final List<String> team;
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

  /// The row of the guest the last scanned ticket checked in, for the
  /// scanner's success sheet.
  HostDoorGuest? get scanned => scannedAttendeeId == null
      ? null
      : guests.where((g) => g.attendeeId == scannedAttendeeId).firstOrNull;

  /// Everyone booked for tonight: in or still to come.
  int get expected => checkedIn + countOf(DoorFilter.arriving);

  DoorState copyWith({DoorFilter? filter, String? query}) => DoorState(
    status: status,
    event: event,
    guests: guests,
    filter: filter ?? this.filter,
    query: query ?? this.query,
    needsReview: needsReview,
    scannedAttendeeId: scannedAttendeeId,
    team: team,
    error: error,
    stackTrace: stackTrace,
  );
}
