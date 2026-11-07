import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:flutter/foundation.dart';

/// Who a message goes to: an event's booked guests, its waitlist, or both.
enum HostComposeAudience { booked, waitlist, everyone }

/// Where the compose screen is: still reading, ready to write, no event to
/// write about, or unable to read the events.
enum HostComposeStatus { loading, ready, noEvent, error }

/// The events a host can message and how many people each audience holds
/// for the chosen one.
@immutable
class HostComposeState {
  const HostComposeState({
    required this.status,
    this.events = const <Event>[],
    this.event,
    this.booked = 0,
    this.waitlisted = 0,
    this.error,
  });

  const HostComposeState.loading() : this(status: HostComposeStatus.loading);

  final HostComposeStatus status;

  /// Events still to come, soonest first: the ones a message can go to.
  final List<Event> events;

  /// The event the message goes to.
  final Event? event;
  final int booked;
  final int waitlisted;
  final Object? error;

  int recipients(HostComposeAudience audience) => switch (audience) {
    HostComposeAudience.booked => booked,
    HostComposeAudience.waitlist => waitlisted,
    HostComposeAudience.everyone => booked + waitlisted,
  };
}
