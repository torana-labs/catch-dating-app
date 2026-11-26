import 'package:catch_dating_app/contexts/bookings/domain/host_request.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_metric_tile.dart';
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

/// Where the requests queue opens: the first person of [kind] waiting on
/// [eventId].
@immutable
class HostTodayRequestFocus {
  const HostTodayRequestFocus({required this.eventId, required this.kind});

  final String eventId;
  final HostRequestKind kind;

  @override
  bool operator ==(Object other) =>
      other is HostTodayRequestFocus &&
      other.eventId == eventId &&
      other.kind == kind;

  @override
  int get hashCode => Object.hash(eventId, kind);
}

/// The people of one kind waiting on one coming event that no attention
/// item covers yet, so Needs you still lists them.
@immutable
class HostTodayRequestGroup {
  const HostTodayRequestGroup({
    required this.focus,
    required this.eventName,
    required this.eventStart,
    required this.count,
  });

  final HostTodayRequestFocus focus;
  final String eventName;
  final DateTime eventStart;
  final int count;
}

/// The open attention items, most urgent first, and everyone waiting across
/// the organizer's coming events.
@immutable
class HostTodayNeedsYou {
  const HostTodayNeedsYou({
    this.items = const <HostAttentionItem>[],
    this.requests = const <HostRequest>[],
    this.requestGroups = const <HostTodayRequestGroup>[],
    this.requestsComplete = true,
    this.dueBeforeDoors = 0,
    this.checking = false,
    this.failed = false,
  });

  final List<HostAttentionItem> items;

  /// Everyone waiting across the coming events (join requests and
  /// waitlists), soonest event first, leaving out anyone with a block either
  /// way with the host.
  final List<HostRequest> requests;

  /// Waiting people at events no join request or waitlist attention item
  /// covers, soonest event first, after [items].
  final List<HostTodayRequestGroup> requestGroups;

  /// False when the bounded requests read left people out.
  final bool requestsComplete;

  /// Items due before the featured event starts.
  final int dueBeforeDoors;

  /// A source has not reported yet or reported only part of its work, so an
  /// empty list is not an all-clear.
  final bool checking;

  /// The attention queue or the requests could not be read.
  final bool failed;

  /// Where [item] opens the requests queue: a join request or waitlist item
  /// whose event has someone of that kind waiting. Null for any other item,
  /// which goes to its own destination.
  HostTodayRequestFocus? requestFocusOf(HostAttentionItem item) {
    final kind = hostTodayRequestKindOf(item.kind);
    final eventId = item.eventId ?? item.destination.eventId;
    if (kind == null || eventId == null) return null;
    final waiting = requests.any(
      (row) => row.eventId == eventId && row.kind == kind,
    );
    return waiting ? HostTodayRequestFocus(eventId: eventId, kind: kind) : null;
  }
}

/// The requests kind an attention kind reviews, if any.
HostRequestKind? hostTodayRequestKindOf(HostAttentionKind kind) =>
    switch (kind) {
      HostAttentionKind.eventJoinRequestReview => HostRequestKind.request,
      HostAttentionKind.eventWaitlistReview => HostRequestKind.waitlist,
      _ => null,
    };

/// The figures under Last 30 days.
enum HostTodayStatKind { bookings, ticketSales, cameBack, followers }

@immutable
class HostTodayStat {
  const HostTodayStat({
    required this.kind,
    required this.value,
    this.previousValue,
    this.currencyCode,
    this.figure,
  });

  final HostTodayStatKind kind;
  final num value;

  /// The same figure for the thirty days before, for the change note.
  final num? previousValue;

  /// Set for money in minor units.
  final String? currencyCode;

  /// How the value reads, when not a plain count or money.
  final HostAnalyticsFigure? figure;
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
