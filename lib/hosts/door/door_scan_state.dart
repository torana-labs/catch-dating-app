import 'package:catch_dating_app/contexts/audience/parts/host_door_guest_row.dart';
import 'package:flutter/foundation.dart';

/// What the last code the camera read was, when it checked nobody in.
enum DoorScanNotice {
  /// Not a Catch code at all.
  notATicket,

  /// A Catch code for another event.
  otherEvent,

  /// The event's own door or venue code, which guests scan, not the host.
  eventCode,
}

/// Everything the scanner shows, as plain values.
@immutable
class DoorScanState {
  const DoorScanState({
    required this.checkedIn,
    required this.expected,
    this.result,
    this.notice,
  });

  /// The "19 of 26 in" badge.
  final int checkedIn;
  final int expected;

  /// The guest the last scan checked in: the success sheet shows while set.
  final HostDoorGuest? result;

  /// Why the last code checked nobody in.
  final DoorScanNotice? notice;
}
