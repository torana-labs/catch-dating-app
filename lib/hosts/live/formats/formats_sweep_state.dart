import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_state.dart';
import 'package:flutter/foundation.dart';

/// Where the sweep is: still reading, ready, or unable to read the guest
/// list.
enum HostFormatsSweepStatus { loading, ready, error }

/// What a night that moves calls getting everyone accounted for: runners
/// are back at the start, a crawl's guests are home.
enum HostFormatsSweepKind { run, crawl }

/// Someone checked in who is not accounted for yet.
@immutable
class HostFormatsOut {
  const HostFormatsOut({required this.attendee, this.group});

  final EventAttendee attendee;

  /// Their arrival group or pod, when they have one.
  final String? group;

  String get attendeeId => attendee.id;
  String get name => attendee.displayName;

  /// The number to call, when the guest gave one.
  String? get phone {
    final phone = attendee.phoneE164?.trim();
    return phone == null || phone.isEmpty ? null : phone;
  }
}

/// Everything the sweep shows, as plain values.
///
/// Accounted for is the event's accountability resolution for the current
/// check-in: returned or departed. Checking a guest in again clears it, so
/// a guest who rejoins is out again until someone marks them.
@immutable
class HostFormatsSweepState {
  const HostFormatsSweepState({
    required this.status,
    this.kind = HostFormatsSweepKind.run,
    this.checkedIn = 0,
    this.out = const <HostFormatsOut>[],
    this.liveControlRevision,
    this.finished = false,
    this.closeOut,
    this.error,
  });

  const HostFormatsSweepState.loading()
    : this(status: HostFormatsSweepStatus.loading);

  final HostFormatsSweepStatus status;
  final HostFormatsSweepKind kind;

  /// Everyone checked in tonight.
  final int checkedIn;

  /// Checked in and not accounted for, by name.
  final List<HostFormatsOut> out;

  /// The plan's live-control revision a close is fenced on; null with no
  /// plan.
  final int? liveControlRevision;

  /// The plan is already complete.
  final bool finished;

  /// Close-out as saved, for its switches and their revision; null while
  /// it is read.
  final HostEventCloseOutState? closeOut;
  final Object? error;

  /// Everyone checked in and accounted for.
  int get accounted => checkedIn - out.length;
}
