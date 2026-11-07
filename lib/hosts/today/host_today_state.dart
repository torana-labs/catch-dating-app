import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:flutter/foundation.dart';

/// Where Today is: still reading the events, showing tonight, showing the
/// day with nothing to feature, or unable to read the events.
enum HostTodayStatus { loading, content, empty, error }

/// The buttons under the poster.
enum HostTodayAction { openDoor, messageGuests, liveConsole, newEvent }

/// The event Today features: live now, else the next one within the week.
@immutable
class HostTodayTonight {
  const HostTodayTonight({
    required this.event,
    required this.isLive,
    this.newFaces,
    this.people = const <String>[],
  });

  final Event event;
  final bool isLive;

  /// Booked guests with no earlier event with this organizer; null until
  /// the roster view has counted them.
  final int? newFaces;

  /// The first names on the roster, for the poster's faces.
  final List<String> people;
}

/// The open attention items, most urgent first.
@immutable
class HostTodayNeedsYou {
  const HostTodayNeedsYou({
    this.items = const <HostAttentionItem>[],
    this.dueBeforeDoors = 0,
    this.checking = false,
    this.failed = false,
  });

  final List<HostAttentionItem> items;

  /// Items due before the featured event starts.
  final int dueBeforeDoors;

  /// A source has not reported yet or reported only part of its work, so an
  /// empty list is not an all-clear.
  final bool checking;

  /// The attention queue could not be read.
  final bool failed;
}

/// The figures under Last 30 days.
enum HostTodayStatKind { bookings, ticketSales }

@immutable
class HostTodayStat {
  const HostTodayStat({
    required this.kind,
    required this.value,
    this.previousValue,
    this.currencyCode,
  });

  final HostTodayStatKind kind;
  final num value;

  /// The same figure for the thirty days before, for the change note.
  final num? previousValue;

  /// Set for money in minor units.
  final String? currencyCode;
}

/// Everything the Today body shows, as plain values.
@immutable
class HostTodayState {
  const HostTodayState({
    required this.status,
    this.tonight,
    this.needsYou = const HostTodayNeedsYou(),
    this.thisWeek = const <Event>[],
    this.lastThirtyDays = const <HostTodayStat>[],
    this.statsPending = false,
    this.error,
    this.stackTrace,
  });

  const HostTodayState.loading() : this(status: HostTodayStatus.loading);

  final HostTodayStatus status;
  final HostTodayTonight? tonight;
  final HostTodayNeedsYou needsYou;

  /// The other events starting in the next seven days, soonest first.
  final List<Event> thisWeek;
  final List<HostTodayStat> lastThirtyDays;

  /// The thirty-day report is still being read.
  final bool statsPending;
  final Object? error;
  final StackTrace? stackTrace;

  /// The buttons under the poster: the door, the live console once the
  /// event is under way, and messages; with nothing to feature, New event.
  List<HostTodayAction> get actions => switch (tonight) {
    null => const [HostTodayAction.newEvent],
    HostTodayTonight(isLive: true) => const [
      HostTodayAction.openDoor,
      HostTodayAction.liveConsole,
      HostTodayAction.messageGuests,
    ],
    _ => const [HostTodayAction.openDoor, HostTodayAction.messageGuests],
  };
}
