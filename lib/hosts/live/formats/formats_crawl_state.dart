import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/live/parts/live_plan_step_row.dart';
import 'package:flutter/foundation.dart';

/// Where the crawl board is: still reading, a night with no stops on its
/// route, running, or unable to read the guest list.
enum HostFormatsCrawlStatus { loading, noRoute, running, error }

/// One stop on the route and when the group gets there.
@immutable
class HostFormatsStop {
  const HostFormatsStop({required this.stop, required this.startsAt});

  final EventItineraryItem stop;
  final DateTime startsAt;
}

/// One arrival group and how many of it are with the crawl.
@immutable
class HostFormatsCrawlGroup {
  const HostFormatsCrawlGroup({
    required this.label,
    required this.here,
    required this.total,
  });

  final String label;
  final int here;
  final int total;
}

/// Someone booked who has not joined the crawl yet.
@immutable
class HostFormatsMissing {
  const HostFormatsMissing({required this.name, this.group});

  final String name;
  final String? group;
}

/// Everything the crawl board shows, as plain values.
@immutable
class HostFormatsCrawlState {
  const HostFormatsCrawlState({
    required this.status,
    this.stops = const <HostFormatsStop>[],
    this.here = 0,
    this.booked = 0,
    this.groups = const <HostFormatsCrawlGroup>[],
    this.missing = const <HostFormatsMissing>[],
    this.host = '',
    this.error,
  });

  const HostFormatsCrawlState.loading()
    : this(status: HostFormatsCrawlStatus.loading);

  final HostFormatsCrawlStatus status;
  final List<HostFormatsStop> stops;

  /// Checked in at the door: with the crawl.
  final int here;
  final int booked;
  final List<HostFormatsCrawlGroup> groups;
  final List<HostFormatsMissing> missing;

  /// Who the group message comes from: the organiser.
  final String host;
  final Object? error;

  /// The stop the group is at by the clock: the last one already reached,
  /// or -1 before the first.
  int currentIndex(DateTime now) {
    var current = -1;
    for (final (index, stop) in stops.indexed) {
      if (!now.isBefore(stop.startsAt)) current = index;
    }
    return current;
  }

  HostFormatsStop? nextStop(DateTime now) {
    final next = currentIndex(now) + 1;
    return next < stops.length ? stops[next] : null;
  }

  LivePlanStepStatus stopStatus(int index, DateTime now) {
    final current = currentIndex(now);
    return index < current
        ? LivePlanStepStatus.done
        : index == current
        ? LivePlanStepStatus.now
        : LivePlanStepStatus.next;
  }
}

/// When the group leaves for the next stop, as the move sheet offers it.
enum HostFormatsLeave { now, inTen, onTime }
